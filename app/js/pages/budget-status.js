(function () {
  const PAGES = (window.PAGES = window.PAGES || {});

  PAGES.budget = {
    render(root) {
      const me = ERS.me();
      App.setHeader('Budget Status', [['Home', '#/dashboard'], ['Budget Status']]);
      const canAll = me.role === 'Administrator' || me.role === 'Supply Chain';
      const depts = canAll ? ERS.db.departments.filter((d) => d.status === 'Active') : [ERS.dept(me.deptId)];
      const years = Object.keys(ERS.db.allocations).sort();
      const st = { year: ERS.year(), dept: me.deptId };

      root.innerHTML = `
        <div class="row between mb" style="align-items:flex-end">
          <div class="row" style="align-items:flex-end">
            <div class="field"><label class="small muted">Budget Year</label><select id="fy" style="min-width:140px">${UI.options(years, st.year)}</select></div>
            <div class="field"><label class="small muted">Department</label><select id="fd" style="min-width:240px" ${depts.length < 2 ? 'disabled' : ''}>${UI.options(depts.map((d) => ({ value: d.id, label: d.name })), st.dept)}</select></div>
          </div>
          <button class="btn btn-outline" id="exp">${icon('download')} Export Report</button>
        </div>
        <div id="body"></div>`;
      const $ = (s) => root.querySelector(s);

      function render() {
        const y = Number(st.year);
        const b = ERS.budget(st.dept, null, y);
        const pct = (v) => (b.allocated ? (v / b.allocated) * 100 : 0);
        const remPct = Math.max(0, pct(b.remaining));
        const cats = ERS.CATEGORIES.map((c) => ({ c, ...ERS.budget(st.dept, c, y) })).filter((x) => x.allocated || x.consumed || x.committed);
        const pend = ERS.db.requests.filter((q) => q.deptId === st.dept && ERS.OPEN_STATUSES.includes(q.status) && new Date(q.date).getFullYear() === y).sort((a, b2) => (a.date < b2.date ? 1 : -1)).slice(0, 5);
        // cumulative utilisation by month
        const nowM = y === new Date().getFullYear() ? new Date().getMonth() : 11;
        const labels = UI.MON.slice(0, nowM + 1);
        const trend = labels.map((_, m) => {
          let used = 0;
          ERS.db.requests.forEach((q) => { const d = new Date(q.date); if (q.deptId !== st.dept || d.getFullYear() !== y || d.getMonth() > m) return; if (q.status === 'Released' || ERS.OPEN_STATUSES.includes(q.status)) used += ERS.reqTotal(q); });
          return b.allocated ? Math.round((used / b.allocated) * 100) : 0;
        });
        const hc = UI.healthColor(b.health);

        $('#body').innerHTML = `
          <div class="grid g4 mb">
            ${UI.statCard({ icon: 'wallet', color: 'blue', label: 'Annual Budget', value: UI.money(b.allocated), sub: 'Total allocated budget' })}
            ${UI.statCard({ icon: 'box', color: 'green', label: 'Consumed', value: UI.money(b.consumed), sub: `<span class="text-green strong">${pct(b.consumed).toFixed(0)}%</span> of annual budget` })}
            ${UI.statCard({ icon: 'fileText', color: 'amber', label: 'Committed (Requested)', value: UI.money(b.committed), sub: 'Pending + for approval/release' })}
            ${UI.statCard({ icon: 'pie', color: b.remaining < 0 ? 'red' : 'green', label: 'Remaining', value: UI.money(b.remaining), sub: `<span class="${b.remaining < 0 ? 'text-red' : 'text-green'} strong">${pct(b.remaining).toFixed(0)}%</span> of annual budget` })}
          </div>
          <div class="split mb">
            <div class="card"><div class="card-h"><h3>Budget Utilization Overview</h3></div><div class="card-b">
              <div class="row" style="flex-wrap:nowrap;gap:24px"><div style="flex:1">
                <div class="stacked"><span style="width:${Math.min(100, pct(b.consumed))}%;background:${UI.COLORS.blue}"></span><span style="width:${Math.min(100 - Math.min(100, pct(b.consumed)), pct(b.committed))}%;background:${UI.COLORS.amber}"></span><span style="width:${remPct}%;background:${UI.COLORS.green}"></span></div>
                <div class="row mt small" style="gap:18px"><span><span class="dot" style="background:${UI.COLORS.blue}"></span> Consumed (${UI.short(b.consumed)})</span><span><span class="dot" style="background:${UI.COLORS.amber}"></span> Committed (${UI.short(b.committed)})</span><span><span class="dot" style="background:${UI.COLORS.green}"></span> Remaining (${UI.short(Math.max(0, b.remaining))})</span></div>
              </div><div class="c"><div style="font-size:32px;font-weight:700">${b.usedPct.toFixed(0)}%</div><div class="muted">Utilized</div></div></div>
              <div class="divider mt"></div><div class="row between small"><span>Annual Budget: <strong>${UI.money(b.allocated)}</strong></span><span class="muted">As of ${UI.date(new Date())}</span></div>
            </div></div>
            <div class="card"><div class="card-h"><h3>Budget Health</h3></div><div class="card-b c" style="position:relative">
              ${UI.gauge(remPct, hc)}<div style="margin-top:-48px;font-size:28px;font-weight:700">${remPct.toFixed(0)}%</div><div class="muted small">Remaining</div>
              <div class="alert ${b.health === 'Within Budget' ? 'green' : b.health === 'Over Budget' ? 'red' : 'amber'} mt" style="text-align:left">${icon(b.health === 'Within Budget' ? 'checkCircle' : 'alert')}<div><strong>${b.health}</strong><span class="t">${b.health === 'Within Budget' ? 'You are within the allocated budget.' : b.health === 'Over Budget' ? 'Spending and commitments exceed the allocated budget.' : 'Utilization is above the ' + ERS.db.budgetConfig.warnPct + '% warning threshold.'}</span></div></div>
            </div></div>
          </div>
          <div class="split">
            <div class="card"><div class="card-h"><h3>Budget Breakdown by Category</h3></div>
              <div class="table-wrap"><table class="table"><thead><tr><th>Category</th><th class="r">Annual Budget</th><th class="r">Consumed</th><th class="r">%</th><th class="r">Committed</th><th class="r">Remaining</th><th class="r">%</th><th>Status</th></tr></thead>
              <tbody>${cats.map((x) => `<tr><td class="strong nowrap">${ERS.CAT_STYLE[x.c].emoji} ${x.c}</td><td class="r">${UI.money(x.allocated)}</td><td class="r">${UI.money(x.consumed)}</td><td class="r muted">${x.allocated ? Math.round((x.consumed / x.allocated) * 100) : 0}%</td><td class="r">${UI.money(x.committed)}</td><td class="r ${x.remaining < 0 ? 'text-red' : ''}">${UI.money(x.remaining)}</td><td class="r muted">${x.allocated ? Math.round((x.remaining / x.allocated) * 100) : 0}%</td><td>${UI.badge(x.health)}</td></tr>`).join('')}</tbody>
              <tfoot><tr><td>TOTAL</td><td class="r">${UI.money(b.allocated)}</td><td class="r">${UI.money(b.consumed)}</td><td class="r">${pct(b.consumed).toFixed(0)}%</td><td class="r">${UI.money(b.committed)}</td><td class="r">${UI.money(b.remaining)}</td><td class="r">${pct(b.remaining).toFixed(0)}%</td><td>${UI.badge(b.health)}</td></tr></tfoot></table></div>
              <div class="muted small pad">${icon('info')} Budgets are amount-based (PHP). “Committed” includes requests that are pending approval, in Supply Chain review, or for release.</div>
            </div>
            <div class="stack">
              <div class="card"><div class="card-h"><h3>Recent Budget Impact <small>(Open requests)</small></h3></div><div class="card-b">
                ${pend.length ? pend.map((q) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--border)"><div><a class="strong" href="#/approvals?open=${q.id}">${q.no}</a><div class="muted small">${UI.date(q.date)}</div></div><div class="r"><div class="strong">${UI.money(ERS.reqTotal(q))}</div><div class="small">${UI.badge(q.status)}</div></div></div>`).join('') : '<div class="muted">No open requests.</div>'}
              </div></div>
              <div class="card"><div class="card-h"><h3>Budget Trend <small>(${y}, cumulative % used)</small></h3></div><div class="card-b">${UI.lineChart([{ label: 'Utilization', color: UI.COLORS.blue, values: trend }], labels, { width: 420, height: 240, vFmt: (v) => v + '%', yFmt: (v) => Math.round(v) + '%' })}</div></div>
            </div>
          </div>`;
      }

      $('#fy').addEventListener('change', (e) => { st.year = e.target.value; render(); });
      $('#fd').addEventListener('change', (e) => { st.dept = e.target.value; render(); });
      $('#exp').addEventListener('click', () => {
        const y = Number(st.year);
        const rows = [['Department', 'Category', 'Annual Budget', 'Consumed', 'Committed', 'Remaining', 'Utilization %', 'Status']];
        ERS.CATEGORIES.forEach((c) => { const x = ERS.budget(st.dept, c, y); rows.push([ERS.deptName(st.dept), c, x.allocated, x.consumed, x.committed, x.remaining, x.usedPct.toFixed(1), x.health]); });
        const t = ERS.budget(st.dept, null, y); rows.push([ERS.deptName(st.dept), 'TOTAL', t.allocated, t.consumed, t.committed, t.remaining, t.usedPct.toFixed(1), t.health]);
        UI.downloadCSV('ERS-Budget-' + ERS.dept(st.dept).code + '-' + y + '.csv', rows);
        UI.toast('Budget report exported.');
      });
      render();
    },
  };
})();
