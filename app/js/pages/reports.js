(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const TABS = [['summary', 'Summary'], ['requests', 'Requests'], ['items', 'Items'], ['departments', 'Departments'], ['approvals', 'Approvals'], ['budget', 'Budget'], ['inventory', 'Inventory']];

  PAGES.reports = {
    render(root, params) {
      App.setHeader('Reports', 'View and analyze requisition data and generate reports.');
      const now = new Date();
      const st = { tab: params.tab || 'summary', from: now.getFullYear() + '-01-01', to: UI.isoDay(now), dept: '', status: '' };
      const scope = scopeRequests();

      root.innerHTML = `
        <div class="row between" style="align-items:flex-end;margin-bottom:6px"><div class="tabs" id="tabs" style="margin:0;flex:1"></div><button class="btn btn-outline" id="exp" style="margin-left:12px">${icon('download')} Export Report</button></div>
        <div class="card mt mb"><div class="filters">
          <div class="field"><label class="small muted">From</label><input type="date" id="ffrom" value="${st.from}"></div>
          <div class="field"><label class="small muted">To</label><input type="date" id="fto" value="${st.to}"></div>
          <div class="field"><label class="small muted">Department</label><select id="fdept">${UI.options(ERS.db.departments.map((d) => ({ value: d.id, label: d.name })), '', 'All departments')}</select></div>
          <div class="field"><label class="small muted">Status</label><select id="fst">${UI.options(ERS.STATUSES.filter((s) => s !== 'Draft'), '', 'All')}</select></div>
          <span class="muted small" style="margin-left:auto;align-self:center">Scope: ${UI.esc(scope.label)}</span>
        </div></div>
        <div id="body"></div>
        <p class="muted small mt">${icon('info')} All amounts are in PHP.</p>`;
      const $ = (s) => root.querySelector(s);
      let exportRows = [];

      const reqs = () => scope.list.filter((q) => { const d = UI.isoDay(q.date); return d >= st.from && d <= st.to && (!st.dept || q.deptId === st.dept) && (!st.status || q.status === st.status); });
      const passed = (q) => ['Supply Chain Review', 'For Release', 'Released'].includes(q.status);
      const live = (q) => !['Rejected', 'Cancelled'].includes(q.status);

      function renderTabs() {
        $('#tabs').innerHTML = TABS.map((t) => `<button data-t="${t[0]}" class="${st.tab === t[0] ? 'active' : ''}">${t[1]}</button>`).join('');
        $('#tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.t; renderTabs(); render(); }));
      }
      function table(head, rows, foot) {
        exportRows = [head.map((h) => h.replace(/<[^>]+>/g, ''))].concat(rows.map((r) => r.raw));
        return `<div class="card"><div class="table-wrap"><table class="table"><thead><tr>${head.map((h, i) => `<th class="${rows[0] && rows[0].align && rows[0].align[i] || ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${r.html.map((c, i) => `<td class="${r.align && r.align[i] || ''}">${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}">${UI.empty('No data', 'Nothing matches the selected filters.', 'barChart')}</td></tr>`}</tbody>${foot || ''}</table></div></div>`;
      }

      function itemAgg(list) {
        const agg = {};
        list.filter(live).forEach((q) => q.items.forEach((l) => { const k = l.itemId || l.name; agg[k] = agg[k] || { name: l.name, code: l.code, category: l.category, unit: l.unit, qty: 0, amt: 0, n: 0 }; agg[k].qty += l.qty; agg[k].amt += l.qty * l.cost; agg[k].n++; }));
        return Object.values(agg).sort((a, b) => b.amt - a.amt);
      }
      function deptAgg(list) {
        return ERS.db.departments.map((d) => { const r = list.filter((q) => q.deptId === d.id); return { d, n: r.length, amt: r.filter(live).reduce((s, q) => s + ERS.reqTotal(q), 0), ok: r.filter(passed).length, rej: r.filter((q) => q.status === 'Rejected').length }; }).filter((x) => x.n).sort((a, b) => b.amt - a.amt);
      }

      function render() {
        const list = reqs();
        const el = $('#body');
        if (st.tab === 'summary') {
          const total = list.length, approved = list.filter(passed).length, released = list.filter((q) => q.status === 'Released');
          const amt = list.filter(live).reduce((s, q) => s + ERS.reqTotal(q), 0), relAmt = released.reduce((s, q) => s + ERS.reqTotal(q), 0);
          // monthly series across range
          const f = new Date(st.from), t = new Date(st.to);
          const months = []; const c = new Date(f.getFullYear(), f.getMonth(), 1);
          while (c <= t && months.length < 24) { months.push([c.getFullYear(), c.getMonth()]); c.setMonth(c.getMonth() + 1); }
          const inM = (q, m) => { const d = new Date(q.date); return d.getFullYear() === m[0] && d.getMonth() === m[1]; };
          const lbl = months.map((m) => UI.MON[m[1]] + (months.length > 12 ? " '" + String(m[0]).slice(2) : ''));
          const series = [
            { label: 'Total Requests', color: UI.COLORS.blue, values: months.map((m) => list.filter((q) => inM(q, m)).length) },
            { label: 'Approved', color: UI.COLORS.green, values: months.map((m) => list.filter((q) => inM(q, m) && passed(q)).length) },
            { label: 'Released', color: UI.COLORS.violet, values: months.map((m) => list.filter((q) => inM(q, m) && q.status === 'Released').length) },
          ];
          const segs = Object.keys(STATUS_COLORS).map((s) => ({ label: s, value: list.filter((q) => q.status === s).length, color: STATUS_COLORS[s] })).filter((s) => s.value);
          const top = itemAgg(list).slice(0, 5);
          const deps = deptAgg(list);
          const maxN = Math.max(1, ...deps.map((x) => x.n));
          exportRows = [['Metric', 'Value'], ['Total Requests', total], ['Approved Requests', approved], ['Released Requests', released.length], ['Total Amount Requested', amt], ['Total Amount Released', relAmt]].concat([[''], ['Department', 'Requests', 'Amount']], deps.map((x) => [x.d.name, x.n, x.amt]));
          el.innerHTML = `
            <div class="grid g5 mb">
              ${UI.statCard({ icon: 'clipboardCheck', color: 'blue', label: 'Total Requests', value: total, sub: 'In selected period' })}
              ${UI.statCard({ icon: 'checkCircle', color: 'green', label: 'Approved Requests', value: approved, sub: (total ? Math.round((approved / total) * 100) : 0) + '% of total requests' })}
              ${UI.statCard({ icon: 'truck', color: 'amber', label: 'Released Requests', value: released.length, sub: (total ? Math.round((released.length / total) * 100) : 0) + '% of total requests' })}
              ${UI.statCard({ icon: 'peso', color: 'violet', label: 'Total Amount Requested', value: UI.money(amt), sub: 'Excludes rejected & cancelled' })}
              ${UI.statCard({ icon: 'wallet', color: 'teal', label: 'Total Amount Released', value: UI.money(relAmt), sub: (amt ? Math.round((relAmt / amt) * 100) : 0) + '% of requested amount' })}
            </div>
            <div class="split-wide mb">
              <div class="card"><div class="card-h"><h3>Requests Trend</h3><div class="row small">${series.map((s) => `<span><span class="dot" style="background:${s.color}"></span> ${s.label}</span>`).join('')}</div></div><div class="card-b">${UI.lineChart(series, lbl, { height: 240 })}</div></div>
              <div class="card"><div class="card-h"><h3>Requests by Status</h3></div><div class="card-b"><div class="donut-row">${UI.donut(segs, { size: 170, thickness: 26, center: total, centerSub: 'Total' })}${UI.legend(segs)}</div></div></div>
            </div>
            <div class="grid g2">
              <div class="card"><div class="card-h"><h3>Top Requested Items</h3><button class="link small" data-goto="items">View all items report</button></div>
                <div class="table-wrap"><table class="table compact"><thead><tr><th>#</th><th>Item</th><th>Category</th><th class="r">Total Qty</th><th class="r">Total Amount</th><th class="r">% of Total</th></tr></thead><tbody>
                ${top.map((x, i) => `<tr><td>${i + 1}</td><td><div class="item-cell">${UI.thumb(x, 'sm')}<span class="strong">${UI.esc(x.name)}</span></div></td><td>${UI.esc(x.category)}</td><td class="r">${UI.num(x.qty)} ${UI.esc(x.unit)}</td><td class="r">${UI.money(x.amt)}</td><td class="r">${amt ? ((x.amt / amt) * 100).toFixed(1) : 0}%</td></tr>`).join('') || `<tr><td colspan="6" class="muted">No data</td></tr>`}</tbody></table></div></div>
              <div class="card"><div class="card-h"><h3>Requests by Department</h3><button class="link small" data-goto="departments">View all departments report</button></div>
                <div class="table-wrap"><table class="table compact"><thead><tr><th>Department</th><th></th><th class="r"># of Requests</th><th class="r">Amount</th></tr></thead><tbody>
                ${deps.map((x) => `<tr><td>${UI.esc(x.d.name)}</td><td style="width:30%">${UI.bar((x.n / maxN) * 100)}</td><td class="r">${x.n}</td><td class="r">${UI.money(x.amt)}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">No data</td></tr>`}</tbody></table></div></div>
            </div>`;
          el.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.goto; renderTabs(); render(); }));
        } else if (st.tab === 'requests') {
          const rows = list.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((q) => ({
            raw: [q.no, UI.date(q.date), ERS.userName(q.requesterId), ERS.deptName(q.deptId), q.purpose, q.items.length, ERS.reqTotal(q), q.priority, q.status],
            html: [`<span class="strong text-blue">${q.no}</span>`, UI.date(q.date), UI.esc(ERS.userName(q.requesterId)), UI.esc(ERS.deptName(q.deptId)), UI.esc(q.purpose), q.items.length, UI.money(ERS.reqTotal(q)), UI.priority(q.priority), UI.badge(q.status)],
            align: ['', '', '', '', '', 'c', 'r'],
          }));
          el.innerHTML = table(['Request No.', 'Date', 'Requester', 'Department', 'Purpose', 'Items', 'Total Cost', 'Priority', 'Status'], rows);
        } else if (st.tab === 'items') {
          const ag = itemAgg(list); const tot = ag.reduce((s, x) => s + x.amt, 0);
          el.innerHTML = table(['#', 'Item', 'Code', 'Category', 'Times Requested', 'Total Qty', 'Total Amount', '% of Total'], ag.map((x, i) => ({
            raw: [i + 1, x.name, x.code, x.category, x.n, x.qty + ' ' + x.unit, x.amt, tot ? ((x.amt / tot) * 100).toFixed(1) + '%' : '0%'],
            html: [i + 1, `<div class="item-cell">${UI.thumb(x, 'sm')}<span class="strong">${UI.esc(x.name)}</span></div>`, UI.esc(x.code), UI.esc(x.category), x.n, UI.num(x.qty) + ' ' + UI.esc(x.unit), UI.money(x.amt), (tot ? ((x.amt / tot) * 100).toFixed(1) : 0) + '%'],
            align: ['', '', '', '', 'r', 'r', 'r', 'r'],
          })));
        } else if (st.tab === 'departments') {
          el.innerHTML = table(['Department', 'Requests', 'Approved', 'Rejected', 'Approval Rate', 'Amount'], deptAgg(list).map((x) => ({
            raw: [x.d.name, x.n, x.ok, x.rej, x.n ? Math.round((x.ok / x.n) * 100) + '%' : '0%', x.amt],
            html: [`<span class="strong">${UI.esc(x.d.name)}</span>`, x.n, x.ok, x.rej, (x.n ? Math.round((x.ok / x.n) * 100) : 0) + '%', UI.money(x.amt)],
            align: ['', 'r', 'r', 'r', 'r', 'r'],
          })));
        } else if (st.tab === 'approvals') {
          const by = {};
          list.forEach((q) => {
            let prev = new Date(q.date);
            q.history.forEach((h) => {
              const d = new Date(h.date);
              if (['Approved', 'Reviewed', 'Released', 'Rejected', 'Returned for Changes'].includes(h.action)) {
                const u = (by[h.userId] = by[h.userId] || { id: h.userId, ok: 0, rej: 0, ret: 0, rel: 0, hrs: 0, n: 0 });
                if (h.action === 'Rejected') u.rej++; else if (h.action === 'Returned for Changes') u.ret++; else if (h.action === 'Released') u.rel++; else u.ok++;
                u.hrs += (d - prev) / 3600000; u.n++;
              }
              prev = d;
            });
          });
          el.innerHTML = table(['Approver', 'Role', 'Approved / Reviewed', 'Released', 'Returned', 'Rejected', 'Avg. Turnaround'], Object.values(by).sort((a, b) => b.n - a.n).map((u) => {
            const usr = ERS.user(u.id) || { name: '-', role: '-' };
            const avg = u.n ? u.hrs / u.n : 0;
            const avgT = avg >= 24 ? (avg / 24).toFixed(1) + ' days' : avg.toFixed(1) + ' hrs';
            return { raw: [usr.name, usr.role, u.ok, u.rel, u.ret, u.rej, avgT], html: [`<div class="item-cell">${UI.avatar(usr, 'sm')}<span class="strong">${UI.esc(usr.name)}</span></div>`, UI.badge(usr.role), u.ok, u.rel, u.ret, u.rej, avgT], align: ['', '', 'r', 'r', 'r', 'r', 'r'] };
          }));
        } else if (st.tab === 'budget') {
          const y = new Date(st.to).getFullYear();
          const rows = ERS.db.departments.filter((d) => !st.dept || d.id === st.dept).map((d) => { const b = ERS.budget(d.id, null, y); return { raw: [d.name, b.allocated, b.consumed, b.committed, b.remaining, b.usedPct.toFixed(1) + '%', b.health], html: [`<span class="strong">${UI.esc(d.name)}</span>`, UI.money(b.allocated), UI.money(b.consumed), UI.money(b.committed), UI.money(b.remaining), `<div class="row" style="flex-wrap:nowrap">${UI.bar(b.usedPct, UI.healthColor(b.health))}<span class="small">${b.usedPct.toFixed(0)}%</span></div>`, UI.badge(b.health)], align: ['', 'r', 'r', 'r', 'r'] }; });
          el.innerHTML = `<p class="muted small" style="margin-top:0">Fiscal year ${y}. Budget figures are for the whole year and ignore the date and status filters.</p>` + table(['Department', 'Annual Budget', 'Consumed', 'Committed', 'Remaining', 'Utilization', 'Status'], rows);
        } else if (st.tab === 'inventory') {
          const items = ERS.db.items.slice().sort((a, b) => a.stock / Math.max(1, a.minStock) - b.stock / Math.max(1, b.minStock));
          el.innerHTML = `<p class="muted small" style="margin-top:0">Current stock levels (not affected by filters). Items below minimum stock are listed first.</p>` + table(['Item', 'Code', 'Category', 'Stock', 'Min. Stock', 'Unit Cost', 'Stock Value', 'Status'], items.map((i) => ({
            raw: [i.name, i.code, i.category, i.stock, i.minStock, i.cost, i.stock * i.cost, UI.stockStatus(i)],
            html: [`<div class="item-cell">${UI.thumb(i, 'sm')}<span class="strong">${UI.esc(i.name)}</span></div>`, i.code, UI.esc(i.category), `${UI.num(i.stock)} ${UI.esc(i.unit)}`, i.minStock, UI.money(i.cost), UI.money(i.stock * i.cost), UI.badge(UI.stockStatus(i))],
            align: ['', '', '', 'r', 'r', 'r', 'r'],
          })));
        }
      }

      $('#ffrom').addEventListener('change', (e) => { st.from = e.target.value || '2000-01-01'; render(); });
      $('#fto').addEventListener('change', (e) => { st.to = e.target.value || '2999-12-31'; render(); });
      $('#fdept').addEventListener('change', (e) => { st.dept = e.target.value; render(); });
      $('#fst').addEventListener('change', (e) => { st.status = e.target.value; render(); });
      $('#exp').addEventListener('click', () => {
        if (exportRows.length < 2) return UI.toast('Nothing to export.', 'warn');
        UI.downloadCSV('ERS-Report-' + st.tab + '-' + UI.isoDay(new Date()) + '.csv', exportRows);
        ERS.log('Report', 'EXPORT', '-', 'Exported ' + st.tab + ' report.'); ERS.save();
        UI.toast('Report exported.');
      });
      renderTabs(); render();
    },
  };
})();
