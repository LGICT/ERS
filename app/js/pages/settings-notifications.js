(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const TABS = { all: ['All Notifications', () => true], unread: ['Unread', (n) => !n.read], requests: ['Requests', (n) => n.type === 'request'], approvals: ['Approvals', (n) => n.type === 'approval'], inventory: ['Inventory', (n) => n.type === 'inventory'], budget: ['Budget', (n) => n.type === 'budget'], system: ['System', (n) => n.type === 'system'] };

  PAGES.notifications = {
    render(root) {
      App.setHeader('Notifications', [['Home', '#/dashboard'], ['Notifications']]);
      const st = { tab: 'all', q: '', page: 1 };
      root.innerHTML = `<div class="split"><div><div class="tabs" id="tabs"></div>
          <div class="row between mb"><div class="search" style="max-width:360px"><input id="nq" placeholder="Search notifications…"><button tabindex="-1">${icon('search')}</button></div>
          <div class="row"><button class="link" id="markAll">${icon('check')} Mark all as read</button><button class="btn btn-ghost btn-sm" id="clearRead">${icon('trash')} Clear read</button></div></div>
          <div id="list"></div></div>
        <div class="stack"><div class="card" id="prefs"></div><div class="card" id="sum"></div></div></div>`;
      const $ = (s) => root.querySelector(s);

      function mine() { return ERS.myNotifications(); }
      function tabs() {
        $('#tabs').innerHTML = Object.keys(TABS).map((k) => `<button data-t="${k}" class="${st.tab === k ? 'active' : ''}">${TABS[k][0]} <span class="count">${mine().filter(TABS[k][1]).length}</span></button>`).join('');
        $('#tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.t; st.page = 1; tabs(); list(); }));
      }
      function dayLabel(iso) {
        const d = new Date(iso), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
        if (UI.isoDay(d) === UI.isoDay(t)) return 'Today'; if (UI.isoDay(d) === UI.isoDay(y)) return 'Yesterday'; return UI.date(iso);
      }
      function list() {
        const t = st.q.toLowerCase();
        const pg = UI.paginate(mine().filter((n) => TABS[st.tab][1](n) && (!t || (n.title + ' ' + n.message).toLowerCase().includes(t))), st.page, 10);
        let last = '', html = '';
        pg.rows.forEach((n) => {
          const g = dayLabel(n.date);
          if (g !== last) { html += `<div class="group-t">${g}</div>`; last = g; }
          html += `<div class="notif-item ${n.read ? '' : 'unread'}" data-n="${n.id}"><span class="nm-ico ${App.notifTone(n.type)}">${icon(App.notifIcon(n))}</span><div style="min-width:0"><div class="t">${UI.esc(n.title)}</div><div class="m">${UI.esc(n.message)}</div></div><div class="d">${UI.time(n.date)}<br>${UI.date(n.date)}</div>${icon('chevronRight')}</div>`;
        });
        $('#list').innerHTML = pg.rows.length ? html + `<div class="card mt">${UI.pager(pg, 'notifications')}</div>` : `<div class="card">${UI.empty('No notifications', 'You are all caught up.', 'bell')}</div>`;
        UI.bindPager($('#list'), (p) => { st.page = p; list(); });
        $('#list').querySelectorAll('[data-n]').forEach((el) => el.addEventListener('click', () => {
          const n = ERS.db.notifications.find((x) => x.id === el.dataset.n); n.read = true; ERS.save(); App.chrome();
          if (n.link) location.hash = n.link; else { tabs(); list(); sum(); }
        }));
      }
      function prefs() {
        const p = ERS.db.notifPrefs;
        const rows = [['requestUpdates', 'Request Updates', 'Submission, updates, changes', 'fileText', 'blue'], ['approvalNotifs', 'Approval Notifications', 'Requests pending approval', 'clipboardCheck', 'violet'], ['inventory', 'Delivery & Inventory', 'Releases, low stock alerts', 'truck', 'green'], ['budgetAlerts', 'Budget Alerts', 'Thresholds, budget updates', 'alert', 'amber'], ['system', 'System Notifications', 'System updates and announcements', 'settings', 'teal']];
        $('#prefs').innerHTML = `<div class="card-h"><h3>Notification Preferences</h3></div><div class="card-b">${rows.map((r) => `<div class="toggle-row"><div class="row" style="flex-wrap:nowrap"><span class="nm-ico ${r[4]}">${icon(r[3])}</span><div><strong>${r[1]}</strong><small>${r[2]}</small></div></div><input type="checkbox" data-k="${r[0]}" ${p[r[0]] ? 'checked' : ''}></div>`).join('')}
          <p class="muted small" style="margin-bottom:0">${icon('info')} Email delivery requires connecting ERS to a mail server (not part of this offline version).</p></div>`;
        $('#prefs').querySelectorAll('[data-k]').forEach((c) => c.addEventListener('change', () => { p[c.dataset.k] = c.checked; ERS.save(); UI.toast('Preference saved.'); }));
      }
      function sum() {
        const all = mine(), un = all.filter((n) => !n.read).length;
        $('#sum').innerHTML = `<div class="card-h"><h3>Notification Summary</h3></div><div class="card-b kv-rows">
          <div><span>${icon('bell')} Total Notifications</span><strong>${all.length}</strong></div><div><span>${icon('mail')} Unread</span><strong>${un}</strong></div><div><span>${icon('checkCircle')} Read</span><strong>${all.length - un}</strong></div></div>`;
      }
      $('#markAll').addEventListener('click', () => { mine().forEach((n) => (n.read = true)); ERS.save(); App.chrome(); tabs(); list(); sum(); UI.toast('All notifications marked as read.'); });
      $('#clearRead').addEventListener('click', async () => {
        const me = ERS.db.currentUserId;
        if (!(await UI.confirm({ message: 'Remove all <strong>read</strong> notifications?', okText: 'Clear', danger: true }))) return;
        ERS.db.notifications = ERS.db.notifications.filter((n) => n.userId !== me || !n.read); ERS.save(); tabs(); list(); sum();
      });
      $('#nq').addEventListener('input', UI.debounce((e) => { st.q = e.target.value; st.page = 1; list(); }));
      tabs(); list(); prefs(); sum();
    },
  };
})();
