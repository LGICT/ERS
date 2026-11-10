(function () {
  const PAGES = (window.PAGES = window.PAGES || {});

  /** Requests the current user should see in organisation-level widgets. */
  window.scopeRequests = function () {
    const me = ERS.me();
    const all = ERS.db.requests.filter((q) => q.status !== 'Draft');
    if (me.role === 'Administrator' || me.role === 'Supply Chain') return { list: all, label: 'All departments' };
    if (me.role === 'Approver') return { list: all.filter((q) => q.deptId === me.deptId), label: ERS.deptName(me.deptId) };
    return { list: all.filter((q) => q.requesterId === me.id), label: 'My requests' };
  };

  window.STATUS_COLORS = {
    'Pending Approval': UI.COLORS.amber, 'Supply Chain Review': UI.COLORS.violet, 'For Release': UI.COLORS.teal,
    'Released': UI.COLORS.blue, 'Returned': UI.COLORS.orange, 'Rejected': UI.COLORS.red, 'Cancelled': UI.COLORS.gray,
  };

  PAGES.dashboard = {
    render(root) {
      const me = ERS.me();
      App.setHeader('Dashboard', 'Welcome back, ' + me.name.split(' ')[0] + '. Here is an overview of your requisition requests and activity.');
      const mine = ERS.db.requests.filter((q) => q.requesterId === me.id);
      const cnt = (f) => mine.filter(f).length;
      const pending = cnt((q) => q.status === 'Pending Approval');
      const approved = cnt((q) => q.status === 'Supply Chain Review' || q.status === 'For Release');
      const released = cnt((q) => q.status === 'Released');
      const rejected = cnt((q) => q.status === 'Rejected');
      const recent = mine.filter((q) => q.status !== 'Draft').sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
      const scope = scopeRequests();
      const year = new Date().getFullYear();
      const yearReqs = scope.list.filter((q) => new Date(q.date).getFullYear() === year);

      // status donut
      const statusSegs = Object.keys(STATUS_COLORS).map((s) => ({ label: s, value: yearReqs.filter((q) => q.status === s).length, color: STATUS_COLORS[s] })).filter((s) => s.value);
      // monthly trend
      const lastMonth = new Date().getMonth();
      const labels = UI.MON.slice(0, lastMonth + 1);
      const perMonth = labels.map((_, m) => yearReqs.filter((q) => new Date(q.date).getMonth() === m).length);
      const totalCost = yearReqs.filter((q) => !['Rejected', 'Cancelled'].includes(q.status)).reduce((s, q) => s + ERS.reqTotal(q), 0);
      // top items
      const agg = {};
      yearReqs.filter((q) => !['Rejected', 'Cancelled'].includes(q.status)).forEach((q) => q.items.forEach((l) => { const k = l.itemId || l.name; agg[k] = agg[k] || { ...l, qty: 0 }; agg[k].qty += l.qty; }));
      const top = Object.values(agg).sort((a, b) => b.qty - a.qty).slice(0, 5);
      const topMax = top.length ? top[0].qty : 1;

      root.innerHTML = `
      <div class="split">
        <div class="stack">
          <div class="grid g4">
            ${UI.statCard({ icon: 'clipboardCheck', color: 'blue', label: 'My Pending Requests', value: pending, sub: 'Awaiting approval', link: '#/my-requests?tab=Pending Approval' })}
            ${UI.statCard({ icon: 'checkCircle', color: 'green', label: 'Approved Requests', value: approved, sub: 'In review / for release', link: '#/my-requests?tab=Approved' })}
            ${UI.statCard({ icon: 'truck', color: 'amber', label: 'Released Requests', value: released, sub: 'Completed', link: '#/my-requests?tab=Released' })}
            ${UI.statCard({ icon: 'xCircle', color: 'red', label: 'Rejected Requests', value: rejected, sub: rejected === 1 ? 'Request' : 'Requests', link: '#/my-requests?tab=Rejected' })}
          </div>
          <div class="card">
            <div class="card-h"><h3>My Recent Requests</h3><a class="link small" href="#/my-requests">View all requests</a></div>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Request No.</th><th>Date Requested</th><th>Purpose</th><th class="c">Total Items</th><th class="r">Total Cost</th><th>Status</th></tr></thead>
              <tbody>${recent.length ? recent.map((q) => `<tr class="clickable" data-open="${q.id}"><td class="nowrap"><a href="#/my-requests?open=${q.id}" class="strong">${q.no}</a></td><td class="nowrap">${UI.date(q.date)}</td><td>${UI.esc(q.purpose)}</td><td class="c">${q.items.length}</td><td class="r">${UI.money(ERS.reqTotal(q))}</td><td>${UI.badge(q.status)}</td></tr>`).join('') : `<tr><td colspan="6">${UI.empty('No requests yet', 'Create your first requisition to see it here.', 'fileText')}</td></tr>`}</tbody>
            </table></div>
          </div>
          <div class="grid g2">
            <div class="card">
              <div class="card-h"><h3>Requests by Status <small>(${scope.label}, ${year})</small></h3></div>
              <div class="card-b"><div class="donut-row">${UI.donut(statusSegs, { size: 150, thickness: 24, center: yearReqs.length, centerSub: 'Total' })}${UI.legend(statusSegs)}</div></div>
            </div>
            <div class="card">
              <div class="card-h"><h3>Monthly Request Trend <small>(${year})</small></h3></div>
              <div class="card-b">${UI.lineChart([{ label: 'Requests', color: UI.COLORS.blue, values: perMonth }], labels, { width: 480, height: 250 })}
                <div class="row between mt small"><span class="muted">Total Requests <strong style="color:var(--text)">${yearReqs.length}</strong></span><span class="muted">Total Cost <strong style="color:var(--text)">${UI.money(totalCost)}</strong></span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-h"><h3>Quick Actions</h3></div><div class="card-b"><div class="tiles">
            <a class="tile blue" href="#/new-request">${icon('plusSquare')}<strong>New Request</strong><small>Create new requisition</small></a>
            <a class="tile green" href="#/catalog">${icon('grid')}<strong>Browse Catalog</strong><small>View available items</small></a>
            <a class="tile violet" href="#/my-requests">${icon('fileText')}<strong>My Requests</strong><small>View my requests</small></a>
            <a class="tile amber" href="#/budget">${icon('barChart')}<strong>Budget Status</strong><small>Check budget utilization</small></a>
          </div></div></div>
          <div class="card" id="budgetCard"></div>
          <div class="card">
            <div class="card-h"><h3>Top Requested Items <small>(This Year)</small></h3><a class="link small" href="#/reports?tab=items">View all</a></div>
            <div class="card-b">${top.length ? top.map((t) => `<div class="row" style="margin-bottom:12px;flex-wrap:nowrap">${UI.thumb(t, 'sm')}<div style="flex:1;min-width:0"><div class="strong small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(t.name)}</div>${UI.bar((t.qty / topMax) * 100)}</div><span class="small strong" style="white-space:nowrap">${UI.num(t.qty)} ${UI.esc(t.unit)}</span></div>`).join('') : '<div class="muted">No data yet.</div>'}</div>
          </div>
        </div>
      </div>`;

      root.querySelectorAll('[data-open]').forEach((tr) => tr.addEventListener('click', () => App.go('#/my-requests?open=' + tr.dataset.open)));
      renderBudget(root.querySelector('#budgetCard'), me.deptId, ERS.year());
    },
  };

  function renderBudget(el, deptId, year) {
    const b = ERS.budget(deptId, null, year);
    const years = Object.keys(ERS.db.allocations).sort();
    const pct = Math.round(b.usedPct);
    const segs = [
      { label: 'Consumed', value: b.consumed, color: UI.COLORS.blue },
      { label: 'Committed', value: b.committed, color: UI.COLORS.amber },
      { label: 'Remaining', value: Math.max(0, b.remaining), color: UI.COLORS.green },
    ];
    el.innerHTML = `<div class="card-h"><h3>Budget Utilization <small>(${UI.esc(ERS.deptName(deptId))})</small></h3><select id="bYear" style="width:auto">${UI.options(years, year)}</select></div>
      <div class="card-b"><div class="donut-row">${UI.donut(segs, { size: 130, thickness: 16, center: pct + '%', centerSub: 'Used' })}
      <div class="kv-rows" style="flex:1;min-width:150px">
        <div><span>Annual Budget</span><strong>${UI.short(b.allocated)}</strong></div>
        <div><span><span class="dot" style="background:${UI.COLORS.blue}"></span> Consumed</span><strong>${UI.short(b.consumed)}</strong></div>
        <div><span><span class="dot" style="background:${UI.COLORS.amber}"></span> Committed</span><strong>${UI.short(b.committed)}</strong></div>
        <div><span><span class="dot" style="background:${UI.COLORS.green}"></span> Remaining</span><strong>${UI.short(b.remaining)}</strong></div>
      </div></div>
      <div class="divider"></div><div class="row between"><strong>Status</strong>${UI.badge(b.health)}</div></div>`;
    el.querySelector('#bYear').addEventListener('change', (e) => renderBudget(el, deptId, Number(e.target.value)));
  }
})();
