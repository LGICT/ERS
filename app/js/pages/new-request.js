(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const AUTOSAVE = () => 'ers.autosave.' + ERS.db.currentUserId;

  PAGES['new-request'] = {
    render(root, params) {
      const me = ERS.me();
      const editing = params.edit ? ERS.req(params.edit) : null;
      if (editing && (editing.requesterId !== me.id || !['Draft', 'Returned'].includes(editing.status))) {
        root.innerHTML = `<div class="card pad-lg">${UI.empty('This request can no longer be edited', 'Only your own drafts and requests returned for changes can be edited.', 'lock')}</div>`;
        return;
      }
      App.setHeader(editing ? (editing.status === 'Returned' ? 'Revise Request' : 'Edit Draft') : 'New Request', [['Home', '#/dashboard'], [editing ? (editing.no || editing.draftNo) : 'New Request']]);

      const myCCs = ERS.db.costCenters.filter((c) => c.deptId === me.deptId && c.status === 'Active');
      let state;
      if (editing) state = { id: editing.id, items: JSON.parse(JSON.stringify(editing.items)), purpose: editing.purpose, priority: editing.priority, costCenterId: editing.costCenterId };
      else {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(AUTOSAVE()) || 'null'); } catch (e) { /* ignore */ }
        state = saved && ERS.db.prefs.autosave ? saved : { items: [], purpose: '', priority: ERS.db.prefs.defaultPriority || 'Normal', costCenterId: (myCCs[0] || {}).id || '' };
        if (!params.add && saved && saved.items && saved.items.length) setTimeout(() => UI.toast('Restored your unsent request.', 'warn'), 50);
      }
      if (params.add) {
        const it = ERS.item(params.add);
        if (it && !state.items.some((l) => l.itemId === it.id)) state.items.push(lineFrom(it, 1));
      }
      const returned = editing && editing.status === 'Returned' ? [...editing.history].reverse().find((h) => h.action === 'Returned for Changes') : null;

      root.innerHTML = `
      <div class="split">
        <div class="stack">
          ${returned ? `<div class="alert amber">${icon('alert')}<div><strong>Changes requested by ${UI.esc(ERS.userName(returned.userId))}</strong><span class="t">${UI.esc(returned.remarks || 'Please review and resubmit.')}</span></div></div>` : ''}
          <div class="card"><div class="row" style="padding:18px 20px;gap:28px;flex-wrap:wrap">
            <span class="stat-ico blue" style="background:var(--primary);color:#fff">${icon('fileText')}</span>
            <div><div class="muted small">Requestor</div><div class="strong">${UI.esc(me.name)}</div></div>
            <div><div class="muted small">Department</div><div class="strong">${UI.esc(ERS.deptName(me.deptId))}</div></div>
            <div><div class="muted small">Date Requested</div><div class="strong">${UI.date(new Date())}</div></div>
            <div><div class="muted small">Request No.</div><div class="strong">${editing && editing.no ? editing.no : '<span class="muted" style="font-weight:400">(Auto-generated upon submission)</span>'}</div></div>
          </div></div>

          <div class="card"><div class="card-b" style="padding-top:18px">
            <h3 style="font-size:15px;margin-bottom:12px">1. Add Items to Request</h3>
            <div class="row" style="flex-wrap:nowrap">
              <div class="rel" style="flex:1"><div class="search"><input id="itemSearch" placeholder="Search item by name, category or code…" autocomplete="off"><button tabindex="-1">${icon('search')}</button></div><div class="suggest hidden" id="suggest"></div></div>
              <button class="btn btn-outline" id="addItemBtn">${icon('plus')} Add Item</button>
            </div>
            <div class="lbl" style="margin:16px 0 10px">Quick Add from Common Items</div>
            <div class="chips" id="chips"></div>

            <h3 style="font-size:15px;margin:24px 0 12px">2. Requested Items</h3>
            <div id="lines"></div>

            <h3 style="font-size:15px;margin:24px 0 12px">3. Purpose / Justification</h3>
            <div class="form-grid">
              <div class="field full"><textarea id="purpose" maxlength="500" rows="3" placeholder="Enter purpose or justification for this request…">${UI.esc(state.purpose)}</textarea><div class="counter"><span id="pCount">0</span> / 500</div></div>
              <div class="field"><label>Cost Center</label><select id="cc">${UI.options(myCCs.map((c) => ({ value: c.id, label: c.code + ' – ' + c.name })), state.costCenterId, myCCs.length ? null : 'No cost center')}</select></div>
              <div class="field"><label>Priority</label><select id="priority">${UI.options(['Normal', 'Urgent'], state.priority)}</select></div>
            </div>
            <div class="row between mt">
              <div class="row">
                <button class="btn btn-outline" id="draftBtn">${icon('save')} Save as Draft</button>
                ${editing && editing.status === 'Draft' ? `<button class="btn btn-danger-o" id="delDraft">${icon('trash')} Delete Draft</button>` : ''}
              </div>
              <button class="btn btn-primary" id="submitBtn">${icon('send')} ${editing && editing.status === 'Returned' ? 'Resubmit Request' : 'Submit Request'}</button>
            </div>
          </div></div>
        </div>
        <div class="stack panel">
          <div class="card" id="impact"></div>
          <div class="card" id="summary"></div>
          <div class="card"><div class="card-h"><h3>Workflow</h3></div><div class="card-b">${UI.stepper({ status: 'Pending Approval', history: [] }).replace('class="stepper', 'class="stepper vertical')}</div></div>
        </div>
      </div>`;

      const $ = (s) => root.querySelector(s);

      /* ---- quick add chips: most requested active items ---- */
      const freq = {};
      ERS.db.requests.forEach((q) => q.items.forEach((l) => (freq[l.itemId] = (freq[l.itemId] || 0) + 1)));
      const common = ERS.db.items.filter((i) => i.status === 'Active').sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0)).slice(0, 6);
      $('#chips').innerHTML = common.map((i) => `<button class="chip" data-id="${i.id}">${ERS.CAT_STYLE[i.category].emoji} ${UI.esc(i.name)}</button>`).join('') + `<a class="chip" href="#/catalog">Browse catalog ${icon('chevronRight')}</a>`;
      $('#chips').querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => addCatalogItem(ERS.item(b.dataset.id))));

      /* ---- search with suggestions ---- */
      const search = $('#itemSearch'), sug = $('#suggest');
      let hl = -1, results = [];
      const showSug = () => {
        const t = search.value.trim().toLowerCase();
        if (!t) { sug.classList.add('hidden'); return; }
        results = ERS.db.items.filter((i) => i.status === 'Active' && (i.name + ' ' + i.code + ' ' + i.category).toLowerCase().includes(t)).slice(0, 8);
        hl = -1;
        sug.innerHTML = results.length ? results.map((i, k) => `<button data-k="${k}">${UI.thumb(i, 'sm')}<span><strong>${UI.esc(i.name)}</strong><small>${i.code} · ${i.category} · ${UI.money(i.cost)} / ${i.unit} · ${i.stock} in stock</small></span></button>`).join('')
          : `<div class="pad muted">No catalog item found. <button class="link" id="sugCustom">Add “${UI.esc(search.value)}” as a new item</button></div>`;
        sug.classList.remove('hidden');
        sug.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('mousedown', (e) => { e.preventDefault(); pickSug(Number(b.dataset.k)); }));
        const c = sug.querySelector('#sugCustom'); if (c) c.addEventListener('mousedown', (e) => { e.preventDefault(); openAddModal(search.value.trim()); });
      };
      const pickSug = (k) => { addCatalogItem(results[k]); search.value = ''; sug.classList.add('hidden'); };
      search.addEventListener('input', showSug);
      search.addEventListener('blur', () => setTimeout(() => sug.classList.add('hidden'), 150));
      search.addEventListener('keydown', (e) => {
        const btns = sug.querySelectorAll('[data-k]');
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle('hl', i === hl)); }
        if (e.key === 'Enter') { e.preventDefault(); if (results.length) pickSug(hl >= 0 ? hl : 0); }
        if (e.key === 'Escape') sug.classList.add('hidden');
      });
      $('#addItemBtn').addEventListener('click', () => openAddModal(''));

      function addCatalogItem(it) {
        if (!it) return;
        const ex = state.items.find((l) => l.itemId === it.id);
        if (ex) { ex.qty += 1; UI.toast(it.name + ' quantity increased to ' + ex.qty + '.'); }
        else { state.items.push(lineFrom(it, 1)); UI.toast(it.name + ' added to request.'); }
        update();
      }

      function openAddModal(prefill) {
        let chosen = null;
        UI.modal({
          title: 'Add Item', subtitle: 'Fill in the details of the item you want to request.', okText: 'Add Item',
          body: `<div class="form-grid">
            <div class="field rel"><label>Item <span class="req">*</span></label><input name="name" required value="${UI.esc(prefill)}" placeholder="Search item by name, category or code…" autocomplete="off"><div class="suggest hidden" id="mSug"></div><div class="hint">Start typing to search, or type a new item name</div></div>
            <div class="field"><label>Category <span class="req">*</span></label><select name="category" required>${UI.options(ERS.CATEGORIES, '', 'Select category')}</select></div>
            <div class="field"><label>Description</label><textarea name="desc" maxlength="255" rows="3" placeholder="Additional description (optional)"></textarea></div>
            <div class="field"><label>Unit <span class="req">*</span></label><select name="unit" required>${UI.options(ERS.UNITS, '', 'Select unit')}</select><div class="hint">e.g., pc, box, ream, pack</div></div>
            <div class="field"><label>Quantity <span class="req">*</span></label><input name="qty" type="number" min="1" value="1" required></div>
            <div class="field"><label>Unit Cost (₱) <span class="req">*</span></label><input name="cost" type="number" min="0" step="0.01" placeholder="0.00" required><div class="hint">Estimated cost per unit</div></div>
            <div class="field"><label>Estimated Total Cost (₱)</label><input id="mTotal" readonly value="0.00"><div class="hint">Auto-calculated (Quantity × Unit Cost)</div></div>
            <div class="field"><label>Preferred Brand (optional)</label><input name="brand" placeholder="e.g., Canon, Pilot, HP"></div>
            <div class="field full"><label>Remarks (optional)</label><input name="remarks" maxlength="255" placeholder="Enter any remarks or specifications"></div>
          </div>`,
          onMount(el) {
            const f = (n) => el.querySelector('[name=' + n + ']');
            const calc = () => (el.querySelector('#mTotal').value = (Number(f('qty').value || 0) * Number(f('cost').value || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 }));
            f('qty').addEventListener('input', calc); f('cost').addEventListener('input', calc);
            const ms = el.querySelector('#mSug');
            const run = () => {
              chosen = null;
              const t = f('name').value.trim().toLowerCase();
              if (!t) { ms.classList.add('hidden'); return; }
              const list = ERS.db.items.filter((i) => i.status === 'Active' && (i.name + ' ' + i.code).toLowerCase().includes(t)).slice(0, 6);
              if (!list.length) { ms.classList.add('hidden'); return; }
              ms.innerHTML = list.map((i) => `<button data-id="${i.id}">${UI.thumb(i, 'sm')}<span><strong>${UI.esc(i.name)}</strong><small>${i.code} · ${UI.money(i.cost)}</small></span></button>`).join('');
              ms.classList.remove('hidden');
              ms.querySelectorAll('button').forEach((b) => b.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const it = ERS.item(b.dataset.id); chosen = it;
                f('name').value = it.name; f('category').value = it.category; f('desc').value = it.desc;
                if (!ERS.UNITS.includes(it.unit)) f('unit').insertAdjacentHTML('beforeend', `<option>${it.unit}</option>`);
                f('unit').value = it.unit; f('cost').value = it.cost; ms.classList.add('hidden'); calc();
              }));
            };
            f('name').addEventListener('input', run);
            f('name').addEventListener('blur', () => setTimeout(() => ms.classList.add('hidden'), 150));
            if (prefill) run();
          },
          onOk(el) {
            if (!UI.validate(el)) return false;
            const d = UI.formData(el);
            if (Number(d.qty) < 1) { UI.fieldError(el.querySelector('[name=qty]'), 'Quantity must be at least 1.'); return false; }
            if (chosen && chosen.name === d.name) {
              const l = lineFrom(chosen, Number(d.qty)); l.cost = Number(d.cost); l.brand = d.brand; l.remarks = d.remarks;
              const ex = state.items.find((x) => x.itemId === chosen.id);
              if (ex) Object.assign(ex, { qty: ex.qty + l.qty, cost: l.cost, brand: l.brand || ex.brand, remarks: l.remarks || ex.remarks }); else state.items.push(l);
            } else {
              state.items.push({ itemId: '', code: 'NON-CATALOG', name: d.name, category: d.category, unit: d.unit, cost: Number(d.cost), qty: Number(d.qty), brand: d.brand, remarks: [d.desc, d.remarks].filter(Boolean).join(' – ') });
            }
            update(); UI.toast(d.name + ' added to request.');
          },
        });
      }

      /* ---- lines table ---- */
      function renderLines() {
        const el = $('#lines');
        if (!state.items.length) { el.innerHTML = `<div class="card" style="box-shadow:none">${UI.empty('No items added yet', 'Search the catalog above, use Quick Add, or click “Add Item”.', 'cart')}</div>`; return; }
        el.innerHTML = `<div class="card" style="box-shadow:none"><div class="table-wrap"><table class="table">
          <thead><tr><th>#</th><th>Item</th><th>In Stock</th><th class="c">Qty</th><th class="r">Unit Cost</th><th class="r">Total</th><th class="c"></th></tr></thead>
          <tbody>${state.items.map((l, i) => {
            const it = ERS.item(l.itemId);
            const stock = it ? `<span class="${l.qty > it.stock ? 'text-red' : 'text-green'} strong">${UI.num(it.stock)} ${it.unit}</span>${l.qty > it.stock ? '<div class="small text-red">Exceeds stock</div>' : ''}` : '<span class="muted small">Non-catalog</span>';
            return `<tr><td>${i + 1}</td><td style="min-width:200px"><div class="item-cell">${UI.thumb(l, 'sm')}<div><div class="strong">${UI.esc(l.name)}</div><div class="muted small">${UI.esc(l.code)} · ${UI.esc(l.category)}</div></div></div></td><td class="nowrap">${stock}</td>
              <td class="c nowrap"><div class="qty"><button data-dec="${i}">${icon('minus')}</button><input data-qty="${i}" type="number" min="1" value="${l.qty}"><button data-inc="${i}">${icon('plus')}</button></div><div class="muted small">${UI.esc(l.unit)}</div></td>
              <td class="r nowrap">${UI.money(l.cost)}</td><td class="r strong nowrap">${UI.money(l.cost * l.qty)}</td><td class="c"><button class="kebab" data-del="${i}" title="Remove" style="color:var(--red)">${icon('trash')}</button></td></tr>`;
          }).join('')}</tbody></table></div>
          <div class="row between" style="padding:14px 18px"><button class="link" id="clearAll" style="color:var(--red)">${icon('trash')} Clear All Items</button><div class="row"><span class="strong">Grand Total</span><span style="font-size:20px;font-weight:700;color:var(--primary);margin-left:16px">${UI.money(total())}</span></div></div></div>`;
        el.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => { const l = state.items[b.dataset.dec]; l.qty = Math.max(1, l.qty - 1); update(); }));
        el.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { state.items[b.dataset.inc].qty += 1; update(); }));
        el.querySelectorAll('[data-qty]').forEach((inp) => inp.addEventListener('change', () => { state.items[inp.dataset.qty].qty = Math.max(1, Math.floor(Number(inp.value) || 1)); update(); }));
        el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { state.items.splice(Number(b.dataset.del), 1); update(); }));
        el.querySelector('#clearAll').addEventListener('click', async () => { if (await UI.confirm({ message: 'Remove all items from this request?', okText: 'Clear All', danger: true })) { state.items = []; update(); } });
      }
      const total = () => state.items.reduce((s, l) => s + l.cost * l.qty, 0);

      /* ---- right panel ---- */
      function renderSide() {
        const impact = ERS.budgetImpact(me.deptId, state.items, state.id);
        const anyOver = impact.some((x) => x.over);
        const cfg = ERS.db.budgetConfig;
        const near = impact.some((x) => !x.over && x.allocated && ((x.allocated - x.after) / x.allocated) * 100 >= cfg.warnPct);
        const b = ERS.budget(me.deptId, null, null, state.id);
        $('#impact').innerHTML = !ERS.db.prefs.showBudgetOnForm ? `<div class="card-b pad-lg muted">Budget display is turned off in System Preferences.</div>` : `
          <div class="card-h"><h3 class="text-blue">${icon('pie')} Budget Impact Summary</h3></div>
          <div class="card-b">
            <div class="kv-rows"><div><span>Budget Year</span><strong>${ERS.year()}</strong></div><div><span>Department</span><strong>${UI.esc(ERS.dept(me.deptId).code)}</strong></div></div>
            <div class="divider"></div>
            <div class="lbl" style="margin-bottom:4px">Department Budget (All Categories)</div>
            <div class="kv-rows">
              <div><span>Annual Budget</span><strong>${UI.money(b.allocated)}</strong></div>
              <div><span>Consumed</span><strong>${UI.money(b.consumed)}</strong></div>
              <div><span>Committed (other requests)</span><strong>${UI.money(b.committed)}</strong></div>
              <div><span>This Request</span><strong class="text-blue">${UI.money(total())}</strong></div>
              <div><span>Remaining after request</span><strong class="${b.remaining - total() < 0 ? 'text-red' : 'text-green'}">${UI.money(b.remaining - total())}</strong></div>
            </div>
            ${impact.length ? `<div class="divider"></div><div class="lbl" style="margin-bottom:6px">By Category</div>${impact.map((x) => `<div class="small" style="margin-bottom:8px"><div class="row between"><span>${UI.esc(x.category)}</span><span class="${x.over ? 'text-red' : 'muted'}">${UI.short(x.after)} left</span></div>${UI.bar(x.allocated ? ((x.allocated - x.after) / x.allocated) * 100 : 100, x.over ? UI.COLORS.red : UI.COLORS.blue)}</div>`).join('')}` : ''}
            <div class="mt">${!state.items.length ? `<div class="alert blue">${icon('info')}<div><strong>No items yet</strong><span class="t">Add items to see the budget impact.</span></div></div>`
              : anyOver ? `<div class="alert red">${icon('xCircle')}<div><strong>Over Budget</strong><span class="t">${cfg.overBudgetAction === 'Block' ? 'This request exceeds the remaining budget and cannot be submitted.' : 'This request exceeds the remaining budget. Approvers will be notified.'}</span></div></div>`
              : near ? `<div class="alert amber">${icon('alert')}<div><strong>Near Budget Limit</strong><span class="t">This request brings a category above ${cfg.warnPct}% utilization.</span></div></div>`
              : `<div class="alert green">${icon('checkCircle')}<div><strong>Within Budget</strong><span class="t">This request is within the allocated budget.</span></div></div>`}</div>
          </div>`;
        $('#summary').innerHTML = `<div class="card-h"><h3>Request Summary</h3></div><div class="card-b kv-rows">
          <div><span>${icon('fileText')} Total Items</span><strong>${state.items.length}</strong></div>
          <div><span>${icon('package')} Total Quantity</span><strong>${state.items.reduce((s, l) => s + l.qty, 0)}</strong></div>
          <div><span>${icon('peso')} Total Estimated Cost</span><strong style="font-size:16px">${UI.money(total())}</strong></div></div>`;
        return { anyOver };
      }

      function update() {
        state.purpose = $('#purpose').value; state.priority = $('#priority').value; state.costCenterId = $('#cc').value;
        renderLines(); renderSide();
        $('#pCount').textContent = state.purpose.length;
        if (!editing && ERS.db.prefs.autosave) { try { localStorage.setItem(AUTOSAVE(), JSON.stringify(state)); } catch (e) { /* ignore */ } }
      }
      $('#purpose').addEventListener('input', UI.debounce(() => { state.purpose = $('#purpose').value; $('#pCount').textContent = state.purpose.length; if (!editing && ERS.db.prefs.autosave) try { localStorage.setItem(AUTOSAVE(), JSON.stringify(state)); } catch (e) { /* ignore */ } }, 150));
      $('#priority').addEventListener('change', update);
      $('#cc').addEventListener('change', update);

      const payload = () => ({ id: state.id, items: state.items, purpose: $('#purpose').value.trim(), priority: $('#priority').value, costCenterId: $('#cc').value });
      const clearAutosave = () => { try { localStorage.removeItem(AUTOSAVE()); } catch (e) { /* ignore */ } };

      $('#draftBtn').addEventListener('click', () => {
        if (!state.items.length) return UI.toast('Add at least one item before saving.', 'error');
        const q = ERS.saveRequest(payload(), false);
        clearAutosave();
        UI.toast('Draft saved.');
        App.go('#/my-requests?tab=Draft&open=' + q.id);
      });
      const del = $('#delDraft');
      if (del) del.addEventListener('click', async () => {
        if (!(await UI.confirm({ message: 'Delete this draft permanently?', okText: 'Delete', danger: true }))) return;
        ERS.act(editing.id, 'delete-draft'); UI.toast('Draft deleted.'); App.go('#/my-requests');
      });
      $('#submitBtn').addEventListener('click', async () => {
        if (!state.items.length) return UI.toast('Add at least one item to your request.', 'error');
        const p = payload();
        if (!p.purpose) return UI.fieldError($('#purpose'), 'Please enter the purpose or justification.');
        const nowIso = new Date().toISOString();
        const period = ERS.db.fiscalPeriods.find((fp) => nowIso >= fp.start && new Date(nowIso) <= new Date(new Date(fp.end).getTime() + 86399999));
        if (period && period.status === 'Closed') return UI.toast('The fiscal period ' + period.name + ' is closed. Ask an administrator to open it, or save as draft.', 'error');
        const { anyOver } = renderSide();
        if (anyOver && ERS.db.budgetConfig.overBudgetAction === 'Block') return UI.toast('This request exceeds the remaining budget and cannot be submitted.', 'error');
        const overStock = state.items.filter((l) => { const it = ERS.item(l.itemId); return it && l.qty > it.stock; });
        const warnings = [];
        if (anyOver) warnings.push('exceeds the remaining department budget');
        if (overStock.length) warnings.push('asks for more than the available stock of ' + overStock.map((l) => l.name).join(', '));
        const ok = await UI.confirm({ title: 'Submit request?', message: (warnings.length ? '<span class="text-red">Note: this request ' + warnings.join(' and ') + '.</span><br><br>' : '') + `Submit <strong>${state.items.length} item(s)</strong> totalling <strong>${UI.money(total())}</strong> for approval?`, okText: 'Submit Request' });
        if (!ok) return;
        const q = ERS.saveRequest(p, true);
        clearAutosave();
        UI.toast('Request ' + q.no + ' submitted for approval.');
        App.go('#/my-requests?open=' + q.id);
      });

      update();
    },
  };

  function lineFrom(it, qty) {
    return { itemId: it.id, code: it.code, name: it.name, category: it.category, unit: it.unit, cost: it.cost, qty: qty || 1, brand: '', remarks: '' };
  }
})();
