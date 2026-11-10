(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const TABS = [
    { key: 'All', match: () => true },
    { key: 'Draft', match: (q) => q.status === 'Draft' },
    { key: 'Pending Approval', label: 'Pending', match: (q) => q.status === 'Pending Approval' },
    { key: 'Approved', label: 'Approved', match: (q) => q.status === 'Supply Chain Review' || q.status === 'For Release' },
    { key: 'Released', match: (q) => q.status === 'Released' },
    { key: 'Returned', match: (q) => q.status === 'Returned' },
    { key: 'Rejected', match: (q) => q.status === 'Rejected' },
    { key: 'Cancelled', match: (q) => q.status === 'Cancelled' },
  ];
  const ICON_BG = { 'Rejected': '#dc2626', 'Cancelled': '#94a3b8', 'Released': '#16a34a', 'Draft': '#64748b', 'Returned': '#f59e0b' };

  PAGES['my-requests'] = {
    render(root, params) {
      const me = ERS.me();
      App.setHeader('My Requests', 'View the status and details of your requisition requests.');
      const st = { tab: params.tab || 'All', q: '', from: '', to: '', status: '', page: 1, open: params.open || null };
      if (st.open) { const r = ERS.req(st.open); if (r && !TABS.find((t) => t.key === st.tab).match(r)) st.tab = 'All'; }

      root.innerHTML = `
        <div class="page-intro"><p>Track every requisition you have created.</p><a class="btn btn-primary" href="#/new-request">${icon('plus')} New Request</a></div>
        <div class="tabs" id="tabs"></div>
        <div class="card mb"><div class="filters">
          <div class="search"><input id="fq" placeholder="Search by Request No., item or purpose…"><button tabindex="-1">${icon('search')}</button></div>
          <div class="field"><label class="small muted">From</label><input type="date" id="ffrom"></div>
          <div class="field"><label class="small muted">To</label><input type="date" id="fto"></div>
          <div class="field"><label class="small muted">Status</label><select id="fst">${UI.options(ERS.STATUSES, '', 'All statuses')}</select></div>
          <button class="btn btn-ghost" id="fclear">${icon('refresh')} Clear Filters</button>
        </div></div>
        <div id="list"></div>`;
      const $ = (s) => root.querySelector(s);

      function mine() { return ERS.db.requests.filter((q) => q.requesterId === me.id).sort((a, b) => (a.date < b.date ? 1 : -1)); }
      function filtered() {
        const t = TABS.find((x) => x.key === st.tab) || TABS[0];
        const term = st.q.toLowerCase();
        return mine().filter((q) => t.match(q)
          && (!st.status || q.status === st.status)
          && (!st.from || UI.isoDay(q.date) >= st.from) && (!st.to || UI.isoDay(q.date) <= st.to)
          && (!term || ((q.no || q.draftNo) + ' ' + q.purpose + ' ' + q.items.map((l) => l.name).join(' ')).toLowerCase().includes(term)));
      }
      function renderTabs() {
        const all = mine();
        $('#tabs').innerHTML = TABS.map((t) => `<button data-tab="${t.key}" class="${st.tab === t.key ? 'active' : ''}">${t.label || t.key} <span class="count">${all.filter(t.match).length}</span></button>`).join('');
        $('#tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; st.page = 1; renderTabs(); renderList(); }));
      }
      function renderList() {
        const per = Number(ERS.db.prefs.itemsPerPage) || 10;
        const pg = UI.paginate(filtered(), st.page, per);
        if (st.open) { const idx = filtered().findIndex((q) => q.id === st.open); if (idx >= 0) { pg.page = Math.floor(idx / per) + 1; Object.assign(pg, UI.paginate(filtered(), pg.page, per)); st.page = pg.page; } }
        $('#list').innerHTML = pg.rows.length ? pg.rows.map((q) => card(q, q.id === st.open)).join('') + `<div class="card">${UI.pager(pg, 'requests')}</div>`
          : `<div class="card">${UI.empty('No requests found', 'Try a different tab or clear the filters.', 'fileText')}</div>`;
        UI.bindPager($('#list'), (p) => { st.page = p; st.open = null; renderList(); });
        $('#list').querySelectorAll('[data-toggle]').forEach((row) => row.addEventListener('click', () => { st.open = st.open === row.dataset.toggle ? null : row.dataset.toggle; renderList(); }));
        $('#list').querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); action(b.dataset.act, ERS.req(b.dataset.id)); }));
        if (st.open) { const el = $('#list').querySelector(`[data-card="${st.open}"]`); if (el && params.open) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); params.open = null; } }
      }

      function card(q, open) {
        const total = ERS.reqTotal(q);
        const canCancel = ERS.db.prefs.allowCancel && ['Draft', 'Pending Approval', 'Returned'].includes(q.status);
        const canEdit = ['Draft', 'Returned'].includes(q.status);
        const last = q.history.length ? q.history[q.history.length - 1] : null;
        return `<div class="card req-card" data-card="${q.id}">
          <div class="req-row" data-toggle="${q.id}">
            <span class="req-ico" style="background:${ICON_BG[q.status] || 'var(--primary)'}">${icon('fileText')}</span>
            <div><div class="strong text-blue" style="font-size:15px">${q.no || q.draftNo}</div><div class="muted small">${UI.date(q.date)} • ${UI.time(q.date)}</div></div>
            <div class="hide-md"><div class="lab">Purpose / Justification</div><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(q.purpose || '—')}</div></div>
            <div class="hide-md"><div class="lab">Total Items</div><div class="strong">${q.items.length}</div></div>
            <div class="hide-md"><div class="lab">Total Quantity</div><div class="strong">${ERS.reqQty(q)}</div></div>
            <div class="hide-md"><div class="lab">Total Cost</div><div class="strong">${UI.money(total)}</div></div>
            <div>${UI.badge(q.status)}</div>
            <span>${icon(open ? 'chevronUp' : 'chevronDown')}</span>
          </div>
          ${open ? `<div class="req-detail">
            ${q.status === 'Returned' || q.status === 'Rejected' ? (last && last.remarks ? `<div class="alert ${q.status === 'Rejected' ? 'red' : 'amber'} mb">${icon('message')}<div><strong>${q.status === 'Rejected' ? 'Rejected' : 'Changes requested'} by ${UI.esc(ERS.userName(last.userId))}</strong><span class="t">${UI.esc(last.remarks)}</span></div></div>` : '') : ''}
            <div class="row between mb"><div class="small muted">Cost Center: <strong style="color:var(--text)">${UI.esc((ERS.cc(q.costCenterId) || {}).code || '-')}</strong> · Priority: ${UI.priority(q.priority)}</div></div>
            <div class="lbl" style="margin-bottom:8px">Requested Items</div>
            <div class="card" style="box-shadow:none">${UI.itemsTable(q)}</div>
            <div class="row between mt" style="align-items:flex-start;gap:18px">
              <div style="flex:1;min-width:280px"><div class="lbl" style="margin-bottom:12px">Workflow Status</div>${UI.stepper(q)}</div>
              <div class="row">
                ${canEdit ? `<button class="btn btn-primary btn-sm" data-act="edit" data-id="${q.id}">${icon('edit')} ${q.status === 'Returned' ? 'Revise & Resubmit' : 'Edit Draft'}</button>` : ''}
                <button class="btn btn-outline btn-sm" data-act="history" data-id="${q.id}">${icon('history')} View History</button>
                <button class="btn btn-ghost btn-sm" data-act="copy" data-id="${q.id}">${icon('copy')} Duplicate</button>
                <button class="btn btn-ghost btn-sm" data-act="print" data-id="${q.id}">${icon('fileText')} Print</button>
                ${canCancel ? `<button class="btn btn-danger-o btn-sm" data-act="cancel" data-id="${q.id}">${icon('xCircle')} Cancel Request</button>` : ''}
              </div>
            </div>
          </div>` : ''}
        </div>`;
      }

      async function action(act, q) {
        if (act === 'history') return UI.historyModal(q);
        if (act === 'edit') return App.go('#/new-request?edit=' + q.id);
        if (act === 'print') return printRequest(q);
        if (act === 'copy') {
          const copy = ERS.saveRequest({ items: JSON.parse(JSON.stringify(q.items)), purpose: q.purpose, priority: q.priority, costCenterId: q.costCenterId }, false);
          UI.toast('A copy was saved as a draft.');
          return App.go('#/new-request?edit=' + copy.id);
        }
        if (act === 'cancel') {
          const reason = await UI.confirm({ title: 'Cancel request', message: 'Cancel <strong>' + (q.no || q.draftNo) + '</strong>? This cannot be undone.', input: 'Reason (optional)', okText: 'Cancel Request', danger: true });
          if (reason === null) return;
          ERS.act(q.id, 'cancel', reason === true ? '' : reason);
          UI.toast('Request cancelled.'); App.chrome(); renderTabs(); renderList();
        }
      }

      $('#fq').addEventListener('input', UI.debounce((e) => { st.q = e.target.value; st.page = 1; renderList(); }));
      $('#ffrom').addEventListener('change', (e) => { st.from = e.target.value; st.page = 1; renderList(); });
      $('#fto').addEventListener('change', (e) => { st.to = e.target.value; st.page = 1; renderList(); });
      $('#fst').addEventListener('change', (e) => { st.status = e.target.value; st.page = 1; renderList(); });
      $('#fclear').addEventListener('click', () => { Object.assign(st, { q: '', from: '', to: '', status: '', page: 1 }); ['#fq', '#ffrom', '#fto', '#fst'].forEach((s) => ($(s).value = '')); renderList(); });
      renderTabs(); renderList();
    },
  };

  /** Opens a printable request form in a new window. */
  window.printRequest = function (q) {
    const c = ERS.db.company;
    const w = window.open('', '_blank');
    if (!w) return UI.toast('Please allow pop-ups to print.', 'error');
    const rows = q.items.map((l, i) => `<tr><td>${i + 1}</td><td>${UI.esc(l.name)}<br><small>${UI.esc(l.code)}</small></td><td>${UI.esc(l.category)}</td><td style="text-align:right">${l.qty}</td><td>${UI.esc(l.unit)}</td><td style="text-align:right">${UI.money(l.cost)}</td><td style="text-align:right">${UI.money(l.cost * l.qty)}</td></tr>`).join('');
    const hist = q.history.map((h) => `<tr><td>${UI.dateTime(h.date)}</td><td>${UI.esc(h.action)}</td><td>${UI.esc(ERS.userName(h.userId))}</td><td>${UI.esc(h.remarks)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><title>${q.no || q.draftNo}</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:32px;color:#111;font-size:13px}h1{margin:0;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f3f4f6}.h{display:flex;justify-content:space-between;border-bottom:2px solid #1a56db;padding-bottom:12px;margin-bottom:16px}.g{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}.sig{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px}.sig div{border-top:1px solid #333;padding-top:4px;text-align:center}</style></head><body>
      <div class="h"><div><h1>${UI.esc(c.name)}</h1><div>${UI.esc(c.address)}</div></div><div style="text-align:right"><h1>Requisition Slip</h1><div><strong>${q.no || q.draftNo}</strong></div><div>Status: ${q.status}</div></div></div>
      <div class="g"><div><b>Requested by:</b> ${UI.esc(ERS.userName(q.requesterId))}</div><div><b>Date:</b> ${UI.dateTime(q.date)}</div><div><b>Department:</b> ${UI.esc(ERS.deptName(q.deptId))}</div><div><b>Cost Center:</b> ${UI.esc((ERS.cc(q.costCenterId) || {}).code || '-')}</div><div><b>Priority:</b> ${q.priority}</div></div>
      <p><b>Purpose:</b> ${UI.esc(q.purpose)}</p>
      <table><thead><tr><th>#</th><th>Item</th><th>Category</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="6" style="text-align:right">Grand Total</th><th style="text-align:right">${UI.money(ERS.reqTotal(q))}</th></tr></tfoot></table>
      ${hist ? `<h3 style="margin-top:24px">Approval History</h3><table><thead><tr><th>Date</th><th>Action</th><th>By</th><th>Remarks</th></tr></thead><tbody>${hist}</tbody></table>` : ''}
      <div class="sig"><div>Requested by</div><div>Approved by</div><div>Released by</div></div>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  };
})();
