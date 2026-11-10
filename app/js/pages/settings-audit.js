(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const ACTION_CLASS = { CREATE: 'green', APPROVE: 'green', REVIEW: 'teal', RELEASE: 'blue', SUBMIT: 'violet', UPDATE: 'blue', REJECT: 'red', DELETE: 'red', CANCEL: 'gray', RETURN: 'amber', LOGIN: 'gray', ADJUST: 'orange', IMPORT: 'violet', EXPORT: 'gray', ALLOCATE: 'teal' };

  PAGES['settings/audit'] = {
    admin: true,
    render(root) {
      App.setHeader('Audit Trail', [['Home', '#/dashboard'], ['Settings', '#/settings/general'], ['Audit Trail']]);
      const audit = ERS.db.audit;
      const mods = [...new Set(audit.map((a) => a.module))].sort(), acts = [...new Set(audit.map((a) => a.action))].sort();
      const st = { from: '', to: '', user: '', mod: '', act: '', ref: '', page: 1, sel: null, per: 10 };
      root.innerHTML = `
        <div class="card mb"><div class="filters">
          <div class="field"><label class="small muted">From</label><input type="date" id="ffrom"></div>
          <div class="field"><label class="small muted">To</label><input type="date" id="fto"></div>
          <div class="field"><label class="small muted">User</label><select id="fuser">${UI.options(ERS.db.users.map((u) => ({ value: u.id, label: u.name })), '', 'All users')}</select></div>
          <div class="field"><label class="small muted">Module</label><select id="fmod">${UI.options(mods, '', 'All modules')}</select></div>
          <div class="field"><label class="small muted">Action</label><select id="fact">${UI.options(acts, '', 'All actions')}</select></div>
          <div class="field"><label class="small muted">Reference No.</label><input id="fref" placeholder="Enter reference no."></div>
          <button class="btn btn-ghost" id="fclear">${icon('refresh')} Clear Filters</button>
        </div></div>
        <div class="split-wide"><div class="card"><div class="card-h"><h3>Audit Trail Records <span class="badge gray" id="cnt"></span></h3><button class="btn btn-outline btn-sm" id="exp">${icon('download')} Export</button></div><div id="table"></div></div>
        <div class="card panel" id="panel"></div></div>`;
      const $ = (s) => root.querySelector(s);

      function rows() {
        const r = st.ref.toLowerCase();
        return audit.filter((a) => (!st.from || UI.isoDay(a.date) >= st.from) && (!st.to || UI.isoDay(a.date) <= st.to) && (!st.user || a.userId === st.user) && (!st.mod || a.module === st.mod) && (!st.act || a.action === st.act) && (!r || String(a.ref).toLowerCase().includes(r)));
      }
      function table() {
        const list = rows();
        $('#cnt').textContent = list.length.toLocaleString() + ' records found';
        const pg = UI.paginate(list, st.page, st.per);
        $('#table').innerHTML = pg.rows.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>Date / Time</th><th>User</th><th>Module</th><th>Action</th><th>Reference</th><th>Details</th></tr></thead><tbody>
          ${pg.rows.map((a) => `<tr class="clickable ${st.sel === a.id ? 'selected' : ''}" data-id="${a.id}"><td style="white-space:nowrap">${UI.dateTime(a.date)}</td><td><div class="item-cell">${UI.avatar(ERS.user(a.userId), 'sm')}<span>${UI.esc(ERS.userName(a.userId))}</span></div></td><td>${UI.esc(a.module)}</td><td>${UI.badge(a.action, ACTION_CLASS[a.action] || 'gray')}</td><td class="text-blue">${UI.esc(a.ref)}</td><td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(a.details)}</td></tr>`).join('')}
          </tbody></table></div>
          <div class="row between" style="padding-right:20px">${UI.pager(pg, 'records')}<select id="per" style="width:auto">${UI.options([10, 25, 50, 100].map((n) => ({ value: n, label: n + ' / page' })), st.per)}</select></div>` : UI.empty('No records found', 'Try different filters.', 'history');
        UI.bindPager($('#table'), (p) => { st.page = p; table(); });
        const per = $('#per'); if (per) per.addEventListener('change', (e) => { st.per = Number(e.target.value); st.page = 1; table(); });
        $('#table').querySelectorAll('[data-id]').forEach((tr) => tr.addEventListener('click', () => { st.sel = tr.dataset.id; table(); panel(); }));
      }
      function panel() {
        const a = audit.find((x) => x.id === st.sel);
        const el = $('#panel');
        el.classList.toggle('hidden', !a);
        el.parentElement.className = a ? 'split-wide' : 'stack';
        if (!a) return;
        const u = ERS.user(a.userId);
        const reqMatch = ERS.db.requests.find((q) => q.no === a.ref);
        el.innerHTML = `<div class="panel-h"><h3>Audit Trail Details</h3><button class="icon-btn" id="pc">${icon('x')}</button></div><div class="card-b kv">
          <div>${icon('calendar')} Date / Time</div><div>${UI.dateTime(a.date)}</div>
          <div>${icon('user')} User</div><div>${UI.esc(ERS.userName(a.userId))}${u ? '<br><span class="muted small">' + UI.esc(ERS.deptName(u.deptId)) + '</span>' : ''}</div>
          <div>${icon('fileText')} Module</div><div>${UI.esc(a.module)}</div>
          <div>${icon('tag')} Action</div><div>${UI.badge(a.action, ACTION_CLASS[a.action] || 'gray')}</div>
          <div>${icon('fileText')} Reference No.</div><div>${reqMatch ? `<a href="#/approvals?open=${reqMatch.id}">${UI.esc(a.ref)}</a>` : UI.esc(a.ref)}</div>
          <div>${icon('info')} Details</div><div>${UI.esc(a.details)}</div>
          <div>${icon('shield')} IP Address</div><div>${UI.esc(a.ip || '-')}</div>
          <div>${icon('sliders')} Device / Browser</div><div>${UI.esc(a.device || '-')}</div></div>
          <div class="card-b"><div class="alert blue">${icon('info')}<div><strong>Audit Trail records are immutable</strong><span class="t">Changes are logged to ensure transparency and accountability.</span></div></div></div>`;
        el.querySelector('#pc').addEventListener('click', () => { st.sel = null; table(); panel(); });
      }
      const bind = (id, key, ev) => $(id).addEventListener(ev || 'change', (e) => { st[key] = e.target.value; st.page = 1; table(); });
      bind('#ffrom', 'from'); bind('#fto', 'to'); bind('#fuser', 'user'); bind('#fmod', 'mod'); bind('#fact', 'act'); bind('#fref', 'ref', 'input');
      $('#fclear').addEventListener('click', () => { Object.assign(st, { from: '', to: '', user: '', mod: '', act: '', ref: '', page: 1 }); ['#ffrom', '#fto', '#fuser', '#fmod', '#fact', '#fref'].forEach((s) => ($(s).value = '')); table(); });
      $('#exp').addEventListener('click', () => {
        UI.downloadCSV('ERS-Audit-Trail-' + UI.isoDay(new Date()) + '.csv', [['Date/Time', 'User', 'Module', 'Action', 'Reference', 'Details', 'IP Address', 'Device']].concat(rows().map((a) => [UI.dateTime(a.date), ERS.userName(a.userId), a.module, a.action, a.ref, a.details, a.ip, a.device])));
        UI.toast('Audit trail exported.');
      });
      table(); panel();
    },
  };
})();
