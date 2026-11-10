(function () {
  const PAGES = (window.PAGES = window.PAGES || {});

  PAGES['settings/users'] = {
    admin: true,
    render(root) {
      App.setHeader('User Management', [['Settings', '#/settings/general'], ['User Management']]);
      const st = { q: '', dept: '', role: '', status: '', page: 1 };
      root.innerHTML = `
        <div class="page-intro"><p>Manage system users, their roles, and access permissions.</p><button class="btn btn-primary" id="addUser">${icon('plus')} Add New User</button></div>
        <div class="grid g4 mb" id="stats"></div>
        <div class="card">
          <div class="filters">
            <div class="search"><input id="fq" placeholder="Search by name, email, or employee no…"><button tabindex="-1">${icon('search')}</button></div>
            <select id="fdept">${UI.options(ERS.db.departments.map((d) => ({ value: d.id, label: d.name })), '', 'All departments')}</select>
            <select id="frole">${UI.options(ERS.ROLES, '', 'All roles')}</select>
            <select id="fst">${UI.options(['Active', 'Inactive', 'Locked'], '', 'All statuses')}</select>
          </div>
          <div id="table"></div>
        </div>
        <div class="card mt pad-lg"><h3 style="font-size:15px;margin-bottom:10px">Role permissions</h3>
          <div class="table-wrap"><table class="table compact"><thead><tr><th>Role</th><th>Create requests</th><th>Approve (own department)</th><th>Supply Chain review &amp; release</th><th>Settings &amp; all reports</th></tr></thead><tbody>
          <tr><td>${UI.badge('Requestor')}</td><td>✔</td><td>–</td><td>–</td><td>–</td></tr>
          <tr><td>${UI.badge('Approver')}</td><td>✔</td><td>✔</td><td>–</td><td>Department reports</td></tr>
          <tr><td>${UI.badge('Supply Chain')}</td><td>✔</td><td>–</td><td>✔</td><td>All reports</td></tr>
          <tr><td>${UI.badge('Administrator')}</td><td>✔</td><td>✔ (all departments)</td><td>✔</td><td>✔</td></tr></tbody></table></div></div>`;
      const $ = (s) => root.querySelector(s);

      function stats() {
        const u = ERS.db.users, n = u.length || 1;
        const c = (s) => u.filter((x) => x.status === s).length;
        $('#stats').innerHTML = UI.statCard({ icon: 'users', color: 'blue', label: 'Total Users', value: u.length, sub: 'Users in the system' }) +
          UI.statCard({ icon: 'users', color: 'green', label: 'Active Users', value: c('Active'), sub: ((c('Active') / n) * 100).toFixed(1) + '% of total users' }) +
          UI.statCard({ icon: 'user', color: 'amber', label: 'Inactive Users', value: c('Inactive'), sub: ((c('Inactive') / n) * 100).toFixed(1) + '% of total users' }) +
          UI.statCard({ icon: 'lock', color: 'violet', label: 'Locked Users', value: c('Locked'), sub: ((c('Locked') / n) * 100).toFixed(1) + '% of total users' });
      }
      function list() {
        const t = st.q.toLowerCase();
        return ERS.db.users.filter((u) => (!st.dept || u.deptId === st.dept) && (!st.role || u.role === st.role) && (!st.status || u.status === st.status) && (!t || (u.name + ' ' + u.email + ' ' + u.empNo).toLowerCase().includes(t)));
      }
      function table() {
        const pg = UI.paginate(list(), st.page, Number(ERS.db.prefs.itemsPerPage) || 10);
        const me = ERS.me();
        $('#table').innerHTML = pg.rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>User</th><th>Employee No.</th><th>Department</th><th>User Role</th><th>Status</th><th>Last Login</th><th class="c">Actions</th></tr></thead><tbody>
          ${pg.rows.map((u, i) => `<tr><td>${pg.from + i}</td><td><div class="item-cell">${UI.avatar(u)}<div><div class="strong">${UI.esc(u.name)} ${u.id === me.id ? '<span class="muted small">(you)</span>' : ''}</div><div class="muted small">${UI.esc(u.email)}</div></div></div></td><td>${UI.esc(u.empNo)}</td><td>${UI.esc(ERS.deptName(u.deptId))}</td><td>${UI.badge(u.role)}</td><td>${UI.badge(u.status)}</td><td>${u.lastLogin ? UI.dateTime(u.lastLogin) : '-'}</td><td class="c"><button class="kebab" data-more="${u.id}">${icon('more')}</button></td></tr>`).join('')}
          </tbody></table></div>${UI.pager(pg, 'users')}` : UI.empty('No users found', 'Try different filters.', 'users');
        UI.bindPager($('#table'), (p) => { st.page = p; table(); });
        $('#table').querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', () => {
          const u = ERS.user(b.dataset.more);
          const items = [{ label: 'Edit user', icon: 'edit', onClick: () => edit(u) }];
          if (u.status === 'Active' && u.id !== me.id) items.push({ label: 'Sign in as this user', icon: 'swap', onClick: () => { ERS.switchUser(u.id); UI.toast('You are now signed in as ' + u.name + '.'); App.go('#/dashboard'); } });
          if (u.status === 'Locked') items.push({ label: 'Unlock account', icon: 'unlock', onClick: () => setStatus(u, 'Active', 'UNLOCK') });
          if (u.status === 'Active' && u.id !== me.id) items.push({ label: 'Lock account', icon: 'lock', onClick: () => setStatus(u, 'Locked', 'LOCK') });
          if (u.status === 'Inactive') items.push({ label: 'Activate', icon: 'checkCircle', onClick: () => setStatus(u, 'Active', 'ACTIVATE') });
          if (u.status === 'Active' && u.id !== me.id) items.push({ label: 'Deactivate', icon: 'xCircle', danger: true, onClick: () => setStatus(u, 'Inactive', 'DEACTIVATE') });
          if (u.id !== me.id) items.push({ label: 'Delete user', icon: 'trash', danger: true, onClick: () => del(u) });
          UI.menu(b, items);
        }));
      }
      function setStatus(u, s, action) { u.status = s; ERS.log('User', action, u.empNo, u.name + ' set to ' + s + '.'); ERS.save(); UI.toast(u.name + ' is now ' + s + '.'); stats(); table(); }
      async function del(u) {
        const used = ERS.db.requests.some((q) => q.requesterId === u.id || q.history.some((h) => h.userId === u.id));
        if (used) return UI.toast(u.name + ' has request history and cannot be deleted. Deactivate the account instead.', 'warn');
        if (!(await UI.confirm({ message: 'Delete <strong>' + UI.esc(u.name) + '</strong>? This cannot be undone.', okText: 'Delete', danger: true }))) return;
        ERS.db.users = ERS.db.users.filter((x) => x.id !== u.id);
        ERS.log('User', 'DELETE', u.empNo, 'User ' + u.name + ' deleted.'); ERS.save(); UI.toast('User deleted.'); stats(); table();
      }
      function edit(u) {
        const isNew = !u;
        u = u || { name: '', email: '', empNo: 'EMP-' + String(ERS.db.users.length + 800).padStart(5, '0'), deptId: '', role: 'Requestor', status: 'Active' };
        UI.modal({
          title: isNew ? 'Add New User' : 'Edit User', subtitle: isNew ? 'Create a user account and assign a role.' : UI.esc(u.name), okText: isNew ? 'Create User' : 'Save Changes',
          body: `<div class="form-grid">
            <div class="field"><label>Full Name <span class="req">*</span></label><input name="name" required value="${UI.esc(u.name)}" placeholder="e.g., Juan Dela Cruz"></div>
            <div class="field"><label>Employee No. <span class="req">*</span></label><input name="empNo" required value="${UI.esc(u.empNo)}"></div>
            <div class="field"><label>Email Address <span class="req">*</span></label><input name="email" type="email" required value="${UI.esc(u.email)}" placeholder="name@leonio.com"></div>
            <div class="field"><label>Department <span class="req">*</span></label><select name="deptId" required>${UI.options(ERS.db.departments.filter((d) => d.status === 'Active' || d.id === u.deptId).map((d) => ({ value: d.id, label: d.name })), u.deptId, 'Select department')}</select></div>
            <div class="field"><label>User Role <span class="req">*</span></label><select name="role" required>${UI.options(ERS.ROLES, u.role)}</select><div class="hint">Approvers approve requests from their own department.</div></div>
            <div class="field"><label>Status</label><select name="status">${UI.options(['Active', 'Inactive', 'Locked'], u.status)}</select></div></div>`,
          onOk(el) {
            if (!UI.validate(el)) return false;
            const d = UI.formData(el);
            if (!/^\S+@\S+\.\S+$/.test(d.email)) { UI.fieldError(el.querySelector('[name=email]'), 'Enter a valid email address.'); return false; }
            if (ERS.db.users.some((x) => x !== u && x.email.toLowerCase() === d.email.toLowerCase())) { UI.fieldError(el.querySelector('[name=email]'), 'This email is already used.'); return false; }
            if (ERS.db.users.some((x) => x !== u && x.empNo === d.empNo)) { UI.fieldError(el.querySelector('[name=empNo]'), 'This employee no. is already used.'); return false; }
            if (!isNew && u.id === ERS.me().id && d.role !== 'Administrator' && !ERS.db.users.some((x) => x.id !== u.id && x.role === 'Administrator' && x.status === 'Active')) { UI.toast('At least one active Administrator is required.', 'error'); return false; }
            Object.assign(u, d);
            if (isNew) { u.id = ERS.uid('u'); u.lastLogin = null; ERS.db.users.push(u); }
            ERS.log('User', isNew ? 'CREATE' : 'UPDATE', u.empNo, (isNew ? 'New user account created: ' : 'User updated: ') + u.name + ' (' + u.role + ').');
            ERS.save(); UI.toast(isNew ? 'User created.' : 'User updated.'); App.chrome(); stats(); table();
          },
        });
      }

      $('#addUser').addEventListener('click', () => edit(null));
      $('#fq').addEventListener('input', UI.debounce((e) => { st.q = e.target.value; st.page = 1; table(); }));
      ['fdept', 'frole', 'fst'].forEach((id) => $('#' + id).addEventListener('change', (e) => { st[{ fdept: 'dept', frole: 'role', fst: 'status' }[id]] = e.target.value; st.page = 1; table(); }));
      stats(); table();
    },
  };
})();
