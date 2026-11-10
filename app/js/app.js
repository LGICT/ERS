/* App shell: sidebar navigation, top bar, router. */
(function () {
  const App = (window.App = {});
  const $ = (s) => document.querySelector(s);

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'home' },
    { key: 'new-request', label: 'New Request', icon: 'plusSquare' },
    { key: 'my-requests', label: 'My Requests', icon: 'fileText' },
    { key: 'approvals', label: 'Approvals', icon: 'clipboardCheck', badge: () => App.myApprovalCount() },
    { key: 'catalog', label: 'Items Catalog', icon: 'grid' },
    { key: 'budget', label: 'Budget Status', icon: 'wallet' },
    { key: 'reports', label: 'Reports', icon: 'barChart' },
    { key: 'settings', label: 'Settings', icon: 'settings', admin: true, children: [
      { key: 'settings/general', label: 'General Settings' },
      { key: 'settings/users', label: 'User Management' },
      { key: 'settings/departments', label: 'Department & Cost Center' },
      { key: 'settings/workflows', label: 'Workflows & Approvals' },
      { key: 'settings/items', label: 'Item Management' },
      { key: 'settings/budget', label: 'Budget Settings' },
      { key: 'notifications', label: 'Notifications', all: true },
      { key: 'settings/preferences', label: 'System Preferences' },
      { key: 'settings/audit', label: 'Audit Trail' },
      { key: 'settings/backup', label: 'Backup & Security' },
    ] },
  ];

  App.myApprovalCount = () => { const me = ERS.me(); return ERS.db.requests.filter((q) => ERS.canApproveStage(me, q)).length; };

  App.parse = function () {
    const h = (location.hash || '#/' + (ERS.db.prefs.landingPage || 'dashboard')).slice(2);
    const [path, qs] = h.split('?');
    const params = {};
    (qs || '').split('&').filter(Boolean).forEach((p) => { const [k, v] = p.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { path: path || 'dashboard', params };
  };

  App.setHeader = function (title, sub) {
    $('#pageTitle').textContent = title;
    document.title = title + ' – ERS';
    let html = '';
    if (Array.isArray(sub)) html = '<nav class="crumbs">' + sub.map((c, i) => (i < sub.length - 1 ? `<a href="${c[1]}">${UI.esc(c[0])}</a>${icon('chevronRight')}` : `<span>${UI.esc(c[0] || c)}</span>`)).join('') + '</nav>';
    else if (sub) html = UI.esc(sub);
    $('#pageSub').innerHTML = html;
  };

  function renderNav(path) {
    const me = ERS.me();
    const isAdmin = me.role === 'Administrator';
    const html = NAV.map((n) => {
      if (n.children) {
        const open = path.startsWith('settings') || path === 'notifications';
        const kids = n.children.filter((c) => isAdmin || c.all);
        if (!kids.length) return '';
        const target = isAdmin ? 'settings/general' : kids[0].key;
        return `<a class="nav-item ${open ? 'active' : ''}" href="#/${target}">${icon(n.icon)}<span>${n.label}</span>${icon(open ? 'chevronUp' : 'chevronDown', 'caret')}</a>
          ${open ? `<div class="nav-sub">${kids.map((c) => `<a class="${path === c.key ? 'active' : ''}" href="#/${c.key}">${c.label}</a>`).join('')}</div>` : ''}`;
      }
      const b = n.badge ? n.badge() : 0;
      return `<a class="nav-item ${path === n.key ? 'active' : ''}" href="#/${n.key}">${icon(n.icon)}<span>${n.label}</span>${b ? `<span class="nav-badge">${b}</span>` : ''}</a>`;
    }).join('');
    $('#nav').innerHTML = html;
  }

  function renderTop() {
    const me = ERS.me();
    $('#userBtn').innerHTML = `${UI.avatar(me)}<span class="user-info"><strong>${UI.esc(me.name)}</strong><small>${UI.esc(ERS.deptName(me.deptId))}</small></span>${icon('chevronDown')}`;
    const unread = ERS.unreadCount();
    $('#bellCount').textContent = unread > 9 ? '9+' : unread;
    $('#bellCount').style.display = unread ? '' : 'none';
    $('#helpPhone').textContent = ERS.db.company.supportPhone || ERS.db.company.phone;
    $('#helpEmail').textContent = ERS.db.company.supportEmail || ERS.db.company.email;
  }

  function renderUserMenu() {
    const me = ERS.me();
    const others = ERS.db.users.filter((u) => u.status === 'Active' && u.id !== me.id);
    $('#userMenu').innerHTML = `
      <div class="um-head">${UI.avatar(me, 'lg')}<div><strong>${UI.esc(me.name)}</strong><div class="muted small">${UI.esc(me.email)}</div><div class="um-role">${UI.badge(me.role)}</div></div></div>
      <div class="um-sec">Switch user (demo)</div>
      <div class="um-list">${others.map((u) => `<button data-user="${u.id}">${UI.avatar(u, 'sm')}<span><strong>${UI.esc(u.name)}</strong><small>${UI.esc(u.role)} · ${UI.esc(ERS.deptName(u.deptId))}</small></span></button>`).join('')}</div>
      <div class="um-foot"><a href="#/notifications">${icon('bell')} Notifications</a>${me.role === 'Administrator' ? `<a href="#/settings/general">${icon('settings')} Settings</a>` : ''}</div>`;
    $('#userMenu').querySelectorAll('[data-user]').forEach((b) => b.addEventListener('click', () => {
      ERS.switchUser(b.dataset.user);
      closeMenus();
      UI.toast('You are now signed in as ' + ERS.me().name + ' (' + ERS.me().role + ').');
      location.hash = '#/dashboard';
      App.render();
    }));
  }

  function renderBellMenu() {
    const list = ERS.myNotifications().slice(0, 6);
    $('#bellMenu').innerHTML = `<div class="nm-head"><strong>Notifications</strong><button class="link small" id="nmAll">Mark all as read</button></div>
      <div class="nm-list">${list.length ? list.map((n) => `<a href="${n.link || '#/notifications'}" data-n="${n.id}" class="${n.read ? '' : 'unread'}"><span class="nm-ico ${App.notifTone(n.type)}">${icon(App.notifIcon(n))}</span><span><strong>${UI.esc(n.title)}</strong><small>${UI.esc(n.message)}</small><em>${UI.dateTime(n.date)}</em></span></a>`).join('') : '<div class="muted pad">No notifications.</div>'}</div>
      <a class="nm-foot" href="#/notifications">View all notifications</a>`;
    $('#nmAll').addEventListener('click', (e) => { e.stopPropagation(); ERS.myNotifications().forEach((n) => (n.read = true)); ERS.save(); renderTop(); renderBellMenu(); });
    $('#bellMenu').querySelectorAll('[data-n]').forEach((a) => a.addEventListener('click', () => { const n = ERS.db.notifications.find((x) => x.id === a.dataset.n); if (n) { n.read = true; ERS.save(); } closeMenus(); }));
  }
  App.notifIcon = (n) => ({ request: 'fileText', approval: 'clock', inventory: 'truck', budget: 'alert', system: 'info', comment: 'message' }[n.type] || (/Approved/.test(n.title) ? 'checkCircle' : 'bell'));
  App.notifTone = (t) => ({ request: 'blue', approval: 'amber', inventory: 'violet', budget: 'amber', system: 'teal' }[t] || 'blue');

  function closeMenus() { document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open')); }

  App.render = function () {
    const { path, params } = App.parse();
    const page = window.PAGES[path] || window.PAGES.dashboard;
    const me = ERS.me();
    document.documentElement.dataset.theme = ERS.db.prefs.theme === 'dark' ? 'dark' : 'light';
    renderNav(path);
    renderTop();
    document.body.classList.remove('nav-open');
    const root = $('#content');
    if (page.admin && me.role !== 'Administrator') {
      App.setHeader('Access restricted', 'Settings');
      root.innerHTML = `<div class="card pad-lg">${UI.empty('Administrators only', 'Only users with the Administrator role can open this page. Use the profile menu (top right) to switch to an administrator such as Ralphson Guya.', 'lock')}</div>`;
      return;
    }
    root.innerHTML = '';
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    try { page.render(root, params); }
    catch (e) { console.error(e); root.innerHTML = `<div class="card pad-lg">${UI.empty('Something went wrong', UI.esc(e.message), 'alert')}</div>`; }
  };
  /** Re-renders current page plus chrome (badges etc.). */
  App.refresh = () => App.render();
  App.chrome = () => { const { path } = App.parse(); renderNav(path); renderTop(); };
  App.go = (hash) => { if (location.hash === hash) App.render(); else location.hash = hash; };

  /* ---------- boot ---------- */
  window.PAGES = window.PAGES || {};
  document.addEventListener('DOMContentLoaded', () => {
    UI.hydrateIcons();
    $('#bellBtn').addEventListener('click', (e) => { e.stopPropagation(); const w = $('#bellWrap'); const o = w.classList.contains('open'); closeMenus(); if (!o) { renderBellMenu(); w.classList.add('open'); } });
    $('#userBtn').addEventListener('click', (e) => { e.stopPropagation(); const w = $('#userWrap'); const o = w.classList.contains('open'); closeMenus(); if (!o) { renderUserMenu(); w.classList.add('open'); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.dropdown')) closeMenus(); });
    $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    $('#sidebarBackdrop').addEventListener('click', () => document.body.classList.remove('nav-open'));
    window.addEventListener('hashchange', App.render);
    App.render();
  });
})();
