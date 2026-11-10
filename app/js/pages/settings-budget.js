(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const TABS = [['config', 'Budget Configuration'], ['allocation', 'Budget Allocation'], ['thresholds', 'Budget Thresholds'], ['periods', 'Fiscal Periods'], ['summary', 'Budget Summary']];
  const DCOL = ['#1a56db', '#16a34a', '#f59e0b', '#7c3aed', '#06b6d4', '#ef4444', '#64748b', '#db2777', '#0d9488'];

  PAGES['settings/budget'] = {
    admin: true,
    render(root, params) {
      const st = { tab: params.tab || 'config', year: ERS.year(), dept: ERS.db.departments[0].id };
      root.innerHTML = `<div class="tabs" id="tabs"></div><div id="body"></div>`;
      const $ = (s) => root.querySelector(s);
      const cfg = ERS.db.budgetConfig;
      const years = () => Object.keys(ERS.db.allocations).map(Number).sort();
      const activeDepts = () => ERS.db.departments.filter((d) => d.status === 'Active');
      const totals = (y) => activeDepts().reduce((t, d) => { const b = ERS.budget(d.id, null, y); t.allocated += b.allocated; t.consumed += b.consumed; t.committed += b.committed; return t; }, { allocated: 0, consumed: 0, committed: 0 });

      function tabs() {
        App.setHeader(TABS.find((t) => t[0] === st.tab)[1], [['Settings', '#/settings/general'], ['Budget Settings', '#/settings/budget'], [TABS.find((t) => t[0] === st.tab)[1]]]);
        $('#tabs').innerHTML = TABS.map((t) => `<button data-t="${t[0]}" class="${st.tab === t[0] ? 'active' : ''}">${t[1]}</button>`).join('');
        $('#tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.t; tabs(); body(); }));
      }
      function overview(y) {
        const t = totals(y);
        const avail = t.allocated - t.consumed - t.committed;
        return `<div class="card"><div class="card-h"><h3>Budget Overview (FY ${y})</h3></div><div class="card-b grid g2" style="gap:12px">
          <div class="card" style="box-shadow:none;padding:14px;background:var(--blue-bg)"><div class="small muted">Total Allocated</div><div class="strong text-blue" style="font-size:18px">${UI.money(t.allocated)}</div></div>
          <div class="card" style="box-shadow:none;padding:14px;background:var(--green-bg)"><div class="small muted">Consumed</div><div class="strong text-green" style="font-size:18px">${UI.money(t.consumed)}</div></div>
          <div class="card" style="box-shadow:none;padding:14px;background:var(--amber-bg)"><div class="small muted">Committed Amount</div><div class="strong text-amber" style="font-size:18px">${UI.money(t.committed)}</div></div>
          <div class="card" style="box-shadow:none;padding:14px;background:var(--violet-bg)"><div class="small muted">Available Balance</div><div class="strong" style="font-size:18px;color:var(--violet)">${UI.money(avail)}</div></div>
        </div></div>`;
      }

      function body() {
        const el = $('#body');
        if (st.tab === 'config') {
          el.innerHTML = `<p class="muted" style="margin-top:0">Configure budget structure and settings used for requisitions.</p>
          <div class="split-wide"><div class="stack">
            <div class="card"><div class="card-h"><h3 class="text-blue">① Budget Parameters</h3></div><div class="card-b form-grid-3">
              <div class="field"><label>Fiscal Year <span class="req">*</span></label><select name="fiscalYear">${UI.options(years().concat(years().includes(new Date().getFullYear() + 1) ? [] : [new Date().getFullYear() + 1]), cfg.fiscalYear)}</select><div class="hint">The year used for budget checks.</div></div>
              <div class="field"><label>Budget Start Date</label><input type="date" name="startDate" value="${cfg.startDate}"></div>
              <div class="field"><label>Budget End Date</label><input type="date" name="endDate" value="${cfg.endDate}"></div>
              <div class="field"><label>Currency</label><select name="currency">${UI.options([{ value: 'PHP', label: 'PHP - Philippine Peso' }], cfg.currency)}</select></div>
              <div class="field"><label>Budget Control Basis</label><select name="controlBasis">${UI.options(['Amount Based'], cfg.controlBasis)}</select></div>
              <div class="field"><label>Rounding Option</label><select name="rounding">${UI.options([{ value: 2, label: 'Two (2) Decimal Places' }, { value: 0, label: 'Whole numbers' }], cfg.rounding)}</select></div>
              <label class="check full" style="grid-column:1/-1"><input type="checkbox" name="carryForward" ${cfg.carryForward ? 'checked' : ''}> Allow carry forward of unused budget</label>
            </div></div>
            <div class="card"><div class="card-h"><h3 class="text-blue">② Budget Structure</h3></div><div class="card-b form-grid">
              <div class="field"><label>Budget Hierarchy Level</label>
                <label class="check"><input type="checkbox" checked disabled> Department</label>
                <label class="check"><input type="checkbox" name="levelCategory" ${cfg.levelCategory ? 'checked' : ''}> Item Category</label>
                <label class="check"><input type="checkbox" name="levelCostCenter" ${cfg.levelCostCenter ? 'checked' : ''}> Cost Center (reporting)</label></div>
              <div class="field"><label>Budget Ownership</label><select name="ownership">${UI.options(['Department Head', 'Finance', 'General Manager'], cfg.ownership)}</select>
                <label class="check mt"><input type="checkbox" name="multiLevel" ${cfg.multiLevel ? 'checked' : ''}> Enable multi-level budget approval</label></div>
            </div></div>
            <div class="card"><div class="card-h"><h3 class="text-blue">③ Default Budget Accounts (GL Integration)</h3></div><div class="card-b">
              <div class="alert blue mb">${icon('info')}<div><span class="t">These accounts are used as defaults for budget postings when ERS is connected to the accounting system.</span></div></div>
              <div class="form-grid"><div class="field"><label>Budget Control Account</label><input name="controlAccount" value="${UI.esc(cfg.controlAccount)}"></div>
              <div class="field"><label>Commitment Account</label><input name="commitmentAccount" value="${UI.esc(cfg.commitmentAccount)}"></div>
              <div class="field"><label>Actual Expense Account</label><input name="expenseAccount" value="${UI.esc(cfg.expenseAccount)}"></div></div>
            </div></div>
            <div class="row between"><button class="btn btn-outline" id="cancel">Cancel</button><button class="btn btn-primary" id="save">${icon('save')} Save Settings</button></div>
          </div>
          <div class="stack">${overview(cfg.fiscalYear)}
            <div class="card"><div class="card-h"><h3>Budget Structure Preview</h3></div><div class="card-b tree">
              <div class="node strong">${icon('building')} ${UI.esc(ERS.db.company.name)}</div>
              <ul>${activeDepts().map((d) => `<li><div class="node strong">${icon('building')} ${UI.esc(d.name)}</div><ul>${ERS.db.costCenters.filter((c) => c.deptId === d.id && c.status === 'Active').map((c) => `<li><div class="node">${icon('users')} ${UI.esc(c.name)} (Cost Center)</div></li>`).join('')}</ul></li>`).join('')}</ul>
            </div></div>
            <div class="card pad-lg small"><strong>${icon('info')} Notes</strong><ul style="padding-left:18px;margin-bottom:0"><li>Budget allocation is required before users can see budget availability.</li><li>The system checks available balance when requests are created and approved.</li><li>Changing the fiscal year changes which allocations are used for checks.</li></ul></div>
          </div></div>`;
          el.querySelector('#cancel').addEventListener('click', body);
          el.querySelector('#save').addEventListener('click', () => {
            const d = UI.formData(el);
            d.fiscalYear = Number(d.fiscalYear); d.rounding = Number(d.rounding);
            if (d.endDate < d.startDate) return UI.toast('End date must be after start date.', 'error');
            Object.assign(cfg, d);
            if (!ERS.db.allocations[cfg.fiscalYear]) ERS.db.allocations[cfg.fiscalYear] = {};
            ERS.log('Budget', 'UPDATE', 'FY' + cfg.fiscalYear, 'Budget configuration saved.'); ERS.save(); UI.toast('Budget settings saved.'); body();
          });
        } else if (st.tab === 'allocation') {
          const y = st.year;
          const t = totals(y);
          const segs = activeDepts().map((d, i) => ({ label: d.name, value: ERS.budget(d.id, null, y).allocated, color: DCOL[i % DCOL.length] }));
          el.innerHTML = `<p class="muted" style="margin-top:0">Allocate budget to departments per item category for the selected fiscal year. Amounts are in PHP.</p>
          <div class="split-wide"><div class="stack">
            <div class="card"><div class="card-h"><h3 class="text-blue">1. Select Budget Parameters</h3></div><div class="card-b row" style="align-items:flex-end">
              <div class="field"><label>Fiscal Year</label><select id="ay" style="min-width:120px">${UI.options(years(), y)}</select></div>
              <div class="field" style="flex:1;min-width:220px"><label>Department</label><select id="ad">${UI.options(activeDepts().map((d) => ({ value: d.id, label: d.name })), st.dept)}</select></div>
              <button class="btn btn-ghost" id="newYear">${icon('plus')} Create FY ${Math.max(...years()) + 1}</button>
            </div></div>
            <div class="card"><div class="card-h"><h3 class="text-blue">2. Allocate Budget – ${UI.esc(ERS.deptName(st.dept))}</h3></div>
              <div class="table-wrap"><table class="table"><thead><tr><th>Category</th><th class="r">Allocated Amount (₱)</th><th class="r">Consumed</th><th class="r">Committed</th><th class="r">Available</th><th>Utilization</th></tr></thead><tbody>
              ${ERS.CATEGORIES.map((c) => { const b = ERS.budget(st.dept, c, y); return `<tr><td class="strong">${c}</td><td class="r"><input type="number" min="0" step="1000" data-cat="${c}" value="${b.allocated}" style="width:150px;text-align:right"></td><td class="r">${UI.money(b.consumed)}</td><td class="r">${UI.money(b.committed)}</td><td class="r ${b.remaining < 0 ? 'text-red' : 'text-green'}">${UI.money(b.remaining)}</td><td style="min-width:120px"><div class="row" style="flex-wrap:nowrap">${UI.bar(b.usedPct, UI.healthColor(b.health))}<span class="small">${b.usedPct.toFixed(0)}%</span></div></td></tr>`; }).join('')}
              </tbody><tfoot><tr><td>TOTAL</td><td class="r" id="atot"></td><td colspan="4"></td></tr></tfoot></table></div>
              <div class="card-b"><div class="field mt"><label>Remarks (optional)</label><textarea id="arem" maxlength="255" rows="2" placeholder="Enter remarks…"></textarea></div>
              <div class="row between mt"><button class="btn btn-outline" id="areset">Reset</button><button class="btn btn-primary" id="asave">${icon('save')} Save Allocation</button></div></div>
            </div>
          </div>
          <div class="stack">${overview(y)}
            <div class="card"><div class="card-h"><h3>Allocation Summary</h3></div><div class="card-b"><div class="c">${UI.donut(segs, { size: 180, thickness: 30, center: UI.short(t.allocated), centerSub: 'Allocated' })}</div><div class="mt">${UI.legend(segs, UI.short)}</div></div></div>
          </div></div>`;
          const inputs = el.querySelectorAll('[data-cat]');
          const sum = () => (el.querySelector('#atot').textContent = UI.money([...inputs].reduce((s, i) => s + (Number(i.value) || 0), 0)));
          inputs.forEach((i) => i.addEventListener('input', sum)); sum();
          el.querySelector('#ay').addEventListener('change', (e) => { st.year = Number(e.target.value); body(); });
          el.querySelector('#ad').addEventListener('change', (e) => { st.dept = e.target.value; body(); });
          el.querySelector('#areset').addEventListener('click', body);
          el.querySelector('#asave').addEventListener('click', () => {
            if ([...inputs].some((i) => Number(i.value) < 0)) return UI.toast('Amounts cannot be negative.', 'error');
            inputs.forEach((i) => ERS.setAllocation(st.dept, i.dataset.cat, Number(i.value) || 0, y));
            ERS.log('Budget', 'ALLOCATE', ERS.dept(st.dept).code + '-FY' + y, 'Budget allocation saved: ' + UI.money(ERS.budget(st.dept, null, y).allocated) + '. ' + el.querySelector('#arem').value);
            ERS.save(); UI.toast('Allocation saved for ' + ERS.deptName(st.dept) + '.'); body();
          });
          el.querySelector('#newYear').addEventListener('click', async () => {
            const ny = Math.max(...years()) + 1;
            if (!(await UI.confirm({ message: `Create fiscal year <strong>${ny}</strong> by copying all allocations from ${ny - 1}?`, okText: 'Create FY ' + ny }))) return;
            ERS.db.allocations[ny] = { ...(ERS.db.allocations[ny - 1] || {}) };
            ERS.log('Budget', 'CREATE', 'FY' + ny, 'Fiscal year ' + ny + ' allocations created from ' + (ny - 1) + '.'); ERS.save();
            st.year = ny; UI.toast('FY ' + ny + ' created.'); body();
          });
        } else if (st.tab === 'thresholds') {
          const y = cfg.fiscalYear;
          const flagged = [];
          activeDepts().forEach((d) => ERS.CATEGORIES.forEach((c) => { const b = ERS.budget(d.id, c, y); if (b.allocated && b.health !== 'Within Budget') flagged.push({ d, c, b }); }));
          flagged.sort((a, b) => b.b.usedPct - a.b.usedPct);
          el.innerHTML = `<div class="split"><div class="stack">
            <div class="card"><div class="card-h"><h3>Threshold Rules</h3></div><div class="card-b form-grid">
              <div class="field"><label>Warning threshold (%)</label><input type="number" name="warnPct" min="1" max="100" value="${cfg.warnPct}"><div class="hint">Shows “Near Limit” and sends budget alerts.</div></div>
              <div class="field"><label>Critical threshold (%)</label><input type="number" name="criticalPct" min="1" max="100" value="${cfg.criticalPct}"><div class="hint">Shows “Critical”.</div></div>
              <div class="field full"><label>When a request exceeds the remaining budget</label><select name="overBudgetAction">${UI.options([{ value: 'Warn', label: 'Warn, but allow submission (approvers decide)' }, { value: 'Block', label: 'Block submission' }], cfg.overBudgetAction)}</select></div>
              <div class="full row" style="justify-content:flex-end"><button class="btn btn-primary" id="tsave">${icon('save')} Save Thresholds</button></div>
            </div></div>
            <div class="card"><div class="card-h"><h3>Budgets above warning threshold <small>(FY ${y})</small></h3></div>
              ${flagged.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Department</th><th>Category</th><th class="r">Allocated</th><th class="r">Used</th><th>Utilization</th><th>Status</th></tr></thead><tbody>${flagged.map((x) => `<tr><td>${UI.esc(x.d.name)}</td><td>${x.c}</td><td class="r">${UI.money(x.b.allocated)}</td><td class="r">${UI.money(x.b.consumed + x.b.committed)}</td><td style="min-width:120px"><div class="row" style="flex-wrap:nowrap">${UI.bar(x.b.usedPct, UI.healthColor(x.b.health))}<span class="small">${x.b.usedPct.toFixed(0)}%</span></div></td><td>${UI.badge(x.b.health)}</td></tr>`).join('')}</tbody></table></div>` : UI.empty('All budgets are healthy', 'No department/category is above the warning threshold.', 'checkCircle')}
            </div></div>
            <div class="card pad-lg"><h3 style="font-size:15px">Status legend</h3><div class="stack mt" style="gap:10px">${UI.badge('Within Budget')} <span class="small muted">Below ${cfg.warnPct}% used</span>${UI.badge('Near Limit')}<span class="small muted">${cfg.warnPct}% – ${cfg.criticalPct}% used</span>${UI.badge('Critical')}<span class="small muted">Above ${cfg.criticalPct}% used</span>${UI.badge('Over Budget')}<span class="small muted">More than 100% used</span></div></div>
          </div>`;
          el.querySelector('#tsave').addEventListener('click', () => {
            const d = UI.formData(el); const w = Number(d.warnPct), c = Number(d.criticalPct);
            if (!(w > 0 && w <= 100 && c > 0 && c <= 100 && w < c)) return UI.toast('Warning % must be lower than Critical %, both between 1 and 100.', 'error');
            Object.assign(cfg, { warnPct: w, criticalPct: c, overBudgetAction: d.overBudgetAction });
            ERS.log('Budget', 'UPDATE', '-', 'Budget thresholds updated: warn ' + w + '%, critical ' + c + '%, over budget = ' + d.overBudgetAction + '.');
            ERS.save(); UI.toast('Thresholds saved.'); body();
          });
        } else if (st.tab === 'periods') {
          const ps = ERS.db.fiscalPeriods;
          el.innerHTML = `<p class="muted" style="margin-top:0">Requests cannot be submitted while the current month's period is <b>Closed</b>.</p>
            <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Period</th><th>Quarter</th><th>Start</th><th>End</th><th>Requests</th><th>Status</th><th class="c">Open / Close</th></tr></thead><tbody>
            ${ps.map((p) => { const n = ERS.db.requests.filter((q) => q.no && q.date >= p.start && new Date(q.date) <= new Date(new Date(p.end).getTime() + 86399999)).length; return `<tr><td class="strong">${p.name}</td><td>${p.quarter}</td><td>${UI.date(p.start)}</td><td>${UI.date(p.end)}</td><td>${n}</td><td>${UI.badge(p.status)}</td><td class="c">${UI.toggle(p.id, p.status === 'Open')}</td></tr>`; }).join('')}
            </tbody></table></div></div>`;
          el.querySelectorAll('input[data-key]').forEach((i) => i.addEventListener('change', () => {
            const p = ps.find((x) => x.id === i.dataset.key); p.status = i.checked ? 'Open' : 'Closed';
            ERS.log('Budget', 'UPDATE', p.name, 'Fiscal period ' + p.status.toLowerCase() + '.'); ERS.save(); UI.toast(p.name + ' is now ' + p.status + '.'); body();
          }));
        } else if (st.tab === 'summary') {
          const y = st.year;
          const rows = activeDepts().map((d) => ({ d, b: ERS.budget(d.id, null, y) }));
          const t = totals(y);
          el.innerHTML = `<div class="row between mb"><div class="field"><label class="small muted">Fiscal Year</label><select id="sy" style="min-width:120px">${UI.options(years(), y)}</select></div><button class="btn btn-outline" id="sexp">${icon('download')} Export</button></div>
            <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Department</th>${ERS.CATEGORIES.map((c) => `<th class="r">${c}</th>`).join('')}<th class="r">Total</th><th>Utilization</th></tr></thead><tbody>
            ${rows.map((r) => `<tr><td class="strong">${UI.esc(r.d.name)}</td>${ERS.CATEGORIES.map((c) => `<td class="r">${UI.short(ERS.allocation(r.d.id, c, y))}</td>`).join('')}<td class="r strong">${UI.money(r.b.allocated)}</td><td style="min-width:130px"><div class="row" style="flex-wrap:nowrap">${UI.bar(r.b.usedPct, UI.healthColor(r.b.health))}<span class="small">${r.b.usedPct.toFixed(0)}%</span></div></td></tr>`).join('')}
            </tbody><tfoot><tr><td>TOTAL</td>${ERS.CATEGORIES.map((c) => `<td class="r">${UI.short(activeDepts().reduce((s, d) => s + ERS.allocation(d.id, c, y), 0))}</td>`).join('')}<td class="r">${UI.money(t.allocated)}</td><td>${t.allocated ? (((t.consumed + t.committed) / t.allocated) * 100).toFixed(0) : 0}%</td></tr></tfoot></table></div></div>`;
          el.querySelector('#sy').addEventListener('change', (e) => { st.year = Number(e.target.value); body(); });
          el.querySelector('#sexp').addEventListener('click', () => {
            UI.downloadCSV('ERS-Budget-Summary-FY' + y + '.csv', [['Department'].concat(ERS.CATEGORIES, ['Total', 'Consumed', 'Committed', 'Remaining'])].concat(rows.map((r) => [r.d.name].concat(ERS.CATEGORIES.map((c) => ERS.allocation(r.d.id, c, y)), [r.b.allocated, r.b.consumed, r.b.committed, r.b.remaining]))));
            UI.toast('Budget summary exported.');
          });
        }
      }
      tabs(); body();
    },
  };
})();
