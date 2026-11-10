(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const STAGES = [
    { key: 'Pending Approval', label: 'Pending for My Approval', icon: 'clipboardCheck', color: 'blue', ok: 'Approve', okIcon: 'check' },
    { key: 'Supply Chain Review', label: 'For Supply Chain Review', icon: 'users', color: 'amber', ok: 'Complete Review', okIcon: 'check' },
    { key: 'For Release', label: 'For Release', icon: 'truck', color: 'violet', ok: 'Release Items', okIcon: 'truck' },
  ];

  PAGES.approvals = {
    render(root, params) {
      const me = ERS.me();
      App.setHeader('Approvals', 'Review and take action on requisition requests.');
      const actionable = (stage) => ERS.db.requests.filter((q) => q.status === stage && ERS.canApproveStage(me, q)).sort((a, b) => (a.priority === 'Urgent') - (b.priority === 'Urgent') || (a.date < b.date ? -1 : 1)).sort((a, b) => (b.priority === 'Urgent') - (a.priority === 'Urgent'));
      const processed = () => ERS.db.requests.filter((q) => q.history.some((h) => h.userId === me.id && ['Approved', 'Reviewed', 'Released', 'Rejected', 'Returned for Changes'].includes(h.action))).sort((a, b) => (a.date < b.date ? 1 : -1));
      const approvedByMe = () => ERS.db.requests.reduce((s, q) => s + q.history.filter((h) => h.userId === me.id && ['Approved', 'Reviewed', 'Released'].includes(h.action)).length, 0);

      const st = { tab: 'Pending Approval', q: '', dept: '', prio: '', page: 1, sel: new Set(), open: params.open || null };
      if (st.open) { const r = ERS.req(st.open); if (r) st.tab = ERS.canApproveStage(me, r) ? r.status : 'history'; }
      else { const first = STAGES.find((s) => actionable(s.key).length); if (first) st.tab = first.key; }
      const canAny = me.role !== 'Requestor';

      root.innerHTML = `
        ${!canAny ? `<div class="alert blue mb">${icon('info')}<div><strong>You don't have approval rights</strong><span class="t">Your role is <b>Requestor</b>. To try the approval flow, open the profile menu (top right) and switch to an Approver, Supply Chain or Administrator user.</span></div></div>` : ''}
        <div class="split-wide">
          <div class="stack">
            <div class="grid g4" id="stats" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"></div>
            <div class="card">
              <div class="tabs" id="tabs" style="padding:0 16px;margin:0"></div>
              <div class="filters">
                <div class="search"><input id="fq" placeholder="Search by Request No., requester or purpose…"><button tabindex="-1">${icon('search')}</button></div>
                <select id="fprio">${UI.options(['Normal', 'Urgent'], '', 'All priorities')}</select>
                <select id="fdept">${UI.options(ERS.db.departments.map((d) => ({ value: d.id, label: d.name })), '', 'All departments')}</select>
              </div>
              <div id="bulk"></div>
              <div id="table"></div>
            </div>
          </div>
          <div class="card panel" id="panel"></div>
        </div>`;
      const $ = (s) => root.querySelector(s);

      function renderStats() {
        $('#stats').innerHTML = STAGES.map((s) => UI.statCard({ icon: s.icon, color: s.color, label: s.label, value: actionable(s.key).length, sub: 'requests' })).join('') +
          UI.statCard({ icon: 'checkCircle', color: 'green', label: 'Approved by Me', value: approvedByMe(), sub: 'actions taken' });
        $('#stats').querySelectorAll('.stat').forEach((el, i) => { el.style.cursor = 'pointer'; el.addEventListener('click', () => { st.tab = i < 3 ? STAGES[i].key : 'history'; st.page = 1; st.sel.clear(); renderTabs(); renderTable(); }); });
      }
      function renderTabs() {
        $('#tabs').innerHTML = STAGES.map((s) => `<button data-tab="${s.key}" class="${st.tab === s.key ? 'active' : ''}">${s.label} <span class="count">${actionable(s.key).length}</span></button>`).join('') + `<button data-tab="history" class="${st.tab === 'history' ? 'active' : ''}">My History</button>`;
        $('#tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; st.page = 1; st.sel.clear(); renderTabs(); renderTable(); }));
      }
      function rows() {
        const list = st.tab === 'history' ? processed() : actionable(st.tab);
        const t = st.q.toLowerCase();
        return list.filter((q) => (!st.dept || q.deptId === st.dept) && (!st.prio || q.priority === st.prio) && (!t || (q.no + ' ' + ERS.userName(q.requesterId) + ' ' + q.purpose).toLowerCase().includes(t)));
      }
      function renderTable() {
        const pg = UI.paginate(rows(), st.page, Number(ERS.db.prefs.itemsPerPage) || 10);
        const hist = st.tab === 'history';
        $('#table').innerHTML = pg.rows.length ? `<div class="table-wrap"><table class="table">
          <thead><tr>${hist ? '' : '<th><input type="checkbox" id="selAll"></th>'}<th>Request No.</th><th>Requester</th><th>Department</th><th>Date Requested</th><th class="c">Items</th><th class="r">Total Cost</th><th>${hist ? 'Status' : 'Priority'}</th><th class="c">View</th></tr></thead>
          <tbody>${pg.rows.map((q) => `<tr class="clickable ${st.open === q.id ? 'selected' : ''}" data-id="${q.id}">
            ${hist ? '' : `<td><input type="checkbox" data-sel="${q.id}" ${st.sel.has(q.id) ? 'checked' : ''}></td>`}
            <td class="strong text-blue nowrap">${q.no}</td><td>${UI.esc(ERS.userName(q.requesterId))}</td><td>${UI.esc(ERS.deptName(q.deptId))}</td>
            <td class="nowrap">${UI.date(q.date)}<div class="muted small">${UI.time(q.date)}</div></td><td class="c">${q.items.length}</td><td class="r">${UI.money(ERS.reqTotal(q))}</td>
            <td>${hist ? UI.badge(q.status) : UI.priority(q.priority)}</td><td class="c"><button class="kebab">${icon('eye')}</button></td></tr>`).join('')}</tbody></table></div>${UI.pager(pg, 'requests')}`
          : UI.empty(hist ? 'No processed requests yet' : 'Nothing waiting for you', hist ? 'Requests you approve, reject or release will appear here.' : 'There are no requests at this stage that need your action.', 'checkCircle');
        UI.bindPager($('#table'), (p) => { st.page = p; renderTable(); });
        $('#table').querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.matches('input')) return; st.open = tr.dataset.id; renderTable(); renderPanel(); }));
        $('#table').querySelectorAll('[data-sel]').forEach((c) => c.addEventListener('change', () => { c.checked ? st.sel.add(c.dataset.sel) : st.sel.delete(c.dataset.sel); renderBulk(); }));
        const all = $('#selAll');
        if (all) all.addEventListener('change', () => { pg.rows.forEach((q) => (all.checked ? st.sel.add(q.id) : st.sel.delete(q.id))); renderTable(); });
        renderBulk();
      }
      function renderBulk() {
        const stage = STAGES.find((s) => s.key === st.tab);
        $('#bulk').innerHTML = st.sel.size && stage ? `<div class="alert blue" style="margin:0 20px 12px;align-items:center">${icon('info')}<div style="flex:1"><strong>${st.sel.size} selected</strong></div><button class="btn btn-success btn-sm" id="bulkOk">${icon(stage.okIcon)} ${stage.ok} All</button><button class="btn btn-ghost btn-sm" id="bulkClr">Clear</button></div>` : '';
        if (!st.sel.size || !stage) return;
        $('#bulkClr').addEventListener('click', () => { st.sel.clear(); renderTable(); });
        $('#bulkOk').addEventListener('click', async () => {
          if (!(await UI.confirm({ message: `${stage.ok} <strong>${st.sel.size}</strong> selected request(s)?`, okText: stage.ok + ' All' }))) return;
          let n = 0; st.sel.forEach((id) => { try { ERS.act(id, 'approve', 'Bulk action'); n++; } catch (e) { /* skip */ } });
          st.sel.clear(); UI.toast(n + ' request(s) processed.'); refreshAll();
        });
      }
      function renderPanel() {
        const q = st.open ? ERS.req(st.open) : null;
        const el = $('#panel');
        el.classList.toggle('hidden', !q);
        el.parentElement.className = q ? 'split-wide' : 'stack';
        if (!q) return;
        const can = ERS.canApproveStage(me, q);
        const stage = STAGES.find((s) => s.key === q.status);
        const impact = ERS.budgetImpact(q.deptId, q.items, q.id);
        const over = ERS.OPEN_STATUSES.includes(q.status) && impact.some((x) => x.over);
        const low = q.items.filter((l) => { const it = ERS.item(l.itemId); return it && l.qty > it.stock; });
        el.innerHTML = `
          <div class="panel-h"><h3>Request Details</h3><button class="icon-btn" id="pClose">${icon('x')}</button></div>
          <div class="card-b">
            <div class="row" style="margin-bottom:6px">${UI.badge(can ? (q.status === 'Pending Approval' ? 'Pending for My Approval' : q.status) : q.status, UI.STATUS_CLASS[q.status])} ${UI.priority(q.priority)}</div>
            <h3 style="font-size:20px">${q.no}</h3>
            <div class="grid g2 mt" style="gap:12px">
              <div><div class="muted small">Requested by</div><div class="strong">${UI.esc(ERS.userName(q.requesterId))}</div><div class="small muted">${UI.esc(ERS.deptName(q.deptId))}</div></div>
              <div><div class="muted small">Date Requested</div><div class="strong">${UI.date(q.date)}</div><div class="small muted">${UI.time(q.date)}</div></div>
            </div>
            <div class="mt"><div class="muted small">Purpose / Justification</div><div>${UI.esc(q.purpose)}</div></div>
            <div class="section-t"><span>Requested Items</span><span class="muted">${q.items.length} items</span></div>
            ${UI.itemsList(q)}
            <div class="row between mt"><span class="muted">Total Cost</span><strong style="font-size:18px">${UI.money(ERS.reqTotal(q))}</strong></div>
            ${low.length && q.status !== 'Released' ? `<div class="alert amber mt">${icon('alert')}<div><strong>Insufficient stock</strong><span class="t">${low.map((l) => UI.esc(l.name) + ' (' + (ERS.item(l.itemId).stock) + ' left)').join(', ')}</span></div></div>` : ''}
            <div class="section-t">Budget Impact (${UI.esc(ERS.dept(q.deptId).code)})</div>
            ${impact.map((x) => `<div class="small" style="margin-bottom:8px"><div class="row between"><span>${UI.esc(x.category)} · ${UI.money(x.request)}</span><span class="${x.over ? 'text-red' : 'muted'}">${UI.short(x.after)} left</span></div>${UI.bar(x.allocated ? ((x.allocated - x.after) / x.allocated) * 100 : 100, x.over ? UI.COLORS.red : UI.COLORS.green)}</div>`).join('')}
            ${over ? `<div class="alert red">${icon('alert')}<div><strong>Over budget</strong><span class="t">Approving this request will exceed the department budget.</span></div></div>` : ''}
            <div class="section-t">Approval Workflow</div>
            ${UI.stepper(q).replace('class="stepper', 'class="stepper vertical')}
            <div class="row mt"><button class="link small" id="pHist">${icon('history')} View full history</button></div>
            ${can ? `
              <div class="field mt"><label>Remarks ${ERS.db.prefs.requireRejectReason ? '<span class="muted small">(required to reject or return)</span>' : '(optional)'}</label><textarea id="pRem" maxlength="250" rows="3" placeholder="Add remarks…"></textarea><div class="counter"><span id="pCnt">0</span> / 250</div></div>
              <div class="row" style="justify-content:space-between">
                <button class="btn btn-danger-o" id="pReject">${icon('x')} Reject</button>
                ${q.status !== 'For Release' ? `<button class="btn btn-warn-o" id="pReturn">${icon('undo')} Request Changes</button>` : ''}
                <button class="btn btn-success" id="pOk">${icon(stage.okIcon)} ${stage.ok}</button>
              </div>` : `<div class="alert blue mt">${icon('info')}<div><span class="t">${ERS.OPEN_STATUSES.includes(q.status) ? 'This request is waiting for someone else at the current stage.' : 'This request is closed (' + q.status + ').'}</span></div></div>`}
          </div>`;
        el.querySelector('#pClose').addEventListener('click', () => { st.open = null; renderTable(); renderPanel(); });
        el.querySelector('#pHist').addEventListener('click', () => UI.historyModal(q));
        if (!can) return;
        const rem = el.querySelector('#pRem');
        rem.addEventListener('input', () => (el.querySelector('#pCnt').textContent = rem.value.length));
        const doAct = async (act, label) => {
          const remarks = rem.value.trim();
          if ((act === 'reject' || act === 'return') && ERS.db.prefs.requireRejectReason && !remarks) return UI.fieldError(rem, 'Please enter a reason.');
          if (act === 'approve' && over && !(await UI.confirm({ message: 'This request is <strong>over budget</strong>. Approve anyway?', okText: 'Approve Anyway', danger: true }))) return;
          if (act !== 'approve' && !(await UI.confirm({ message: label + ' request <strong>' + q.no + '</strong>?', okText: label, danger: act === 'reject' }))) return;
          try { ERS.act(q.id, act, remarks); } catch (e) { return UI.toast(e.message, 'error'); }
          UI.toast(q.no + ': ' + (act === 'approve' ? stage.ok + ' done' : label + ' done') + '.');
          refreshAll();
        };
        el.querySelector('#pOk').addEventListener('click', () => doAct('approve', stage.ok));
        el.querySelector('#pReject').addEventListener('click', () => doAct('reject', 'Reject'));
        const ret = el.querySelector('#pReturn'); if (ret) ret.addEventListener('click', () => doAct('return', 'Return'));
      }
      function refreshAll() { App.chrome(); renderStats(); renderTabs(); renderTable(); renderPanel(); }

      $('#fq').addEventListener('input', UI.debounce((e) => { st.q = e.target.value; st.page = 1; renderTable(); }));
      $('#fdept').addEventListener('change', (e) => { st.dept = e.target.value; st.page = 1; renderTable(); });
      $('#fprio').addEventListener('change', (e) => { st.prio = e.target.value; st.page = 1; renderTable(); });
      refreshAll();
    },
  };
})();
