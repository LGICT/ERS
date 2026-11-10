(function () {
  const PAGES = (window.PAGES = window.PAGES || {});

  PAGES['settings/departments'] = {
    admin: true,
    render(root) {
      App.setHeader('Department & Cost Center', [['Settings', '#/settings/general'], ['Department & Cost Center']]);
      const st = { dq: '', ds: '', dp: 1, cq: '', cs: '', cp: 1 };
      root.innerHTML = `
        <p class="muted" style="margin-top:0">Manage departments (organizational structure) and cost centers (budget and accounting units).</p>
        <div class="grid g4 mb" id="stats"></div>
        <div class="grid g2" style="align-items:start">
          <div class="card"><div class="card-h"><div><h3>Departments</h3><div class="muted small">List of all departments in the organization.</div></div><button class="btn btn-outline btn-sm" id="addD">${icon('plus')} Add Department</button></div>
            <div class="filters" style="padding-top:0"><div class="search"><input id="dq" placeholder="Search department…"><button tabindex="-1">${icon('search')}</button></div><select id="ds">${UI.options(['Active', 'Inactive'], '', 'All')}</select></div>
            <div id="dt"></div></div>
          <div class="card"><div class="card-h"><div><h3>Cost Centers</h3><div class="muted small">List of all cost centers for budgeting and tracking.</div></div><button class="btn btn-outline btn-sm" id="addC">${icon('plus')} Add Cost Center</button></div>
            <div class="filters" style="padding-top:0"><div class="search"><input id="cq" placeholder="Search cost center…"><button tabindex="-1">${icon('search')}</button></div><select id="cs">${UI.options(['Active', 'Inactive'], '', 'All')}</select></div>
            <div id="ct"></div></div>
        </div>
        <div class="alert blue mt">${icon('info')}<div><strong>About Departments &amp; Cost Centers</strong><span class="t">Departments represent the organizational structure of the company. Cost Centers are used for budgeting, expense tracking, and reporting. Each cost center is mapped to a department. Budgets are allocated per department in Budget Settings.</span></div></div>`;
      const $ = (s) => root.querySelector(s);
      const per = 8;

      function stats() {
        const d = ERS.db.departments, c = ERS.db.costCenters;
        const da = d.filter((x) => x.status === 'Active').length, ca = c.filter((x) => x.status === 'Active').length;
        $('#stats').innerHTML = UI.statCard({ icon: 'users', color: 'blue', label: 'Total Departments', value: d.length, sub: 'In the organization' }) +
          UI.statCard({ icon: 'workflow', color: 'green', label: 'Active Departments', value: da, sub: `<span class="text-green">${d.length ? ((da / d.length) * 100).toFixed(1) : 0}%</span> of total` }) +
          UI.statCard({ icon: 'building', color: 'violet', label: 'Total Cost Centers', value: c.length, sub: 'Across all departments' }) +
          UI.statCard({ icon: 'database', color: 'amber', label: 'Active Cost Centers', value: ca, sub: `<span class="text-green">${c.length ? ((ca / c.length) * 100).toFixed(1) : 0}%</span> of total` });
      }
      function dTable() {
        const t = st.dq.toLowerCase();
        const pg = UI.paginate(ERS.db.departments.filter((d) => (!st.ds || d.status === st.ds) && (!t || (d.name + ' ' + d.code + ' ' + d.head).toLowerCase().includes(t))), st.dp, per);
        $('#dt').innerHTML = `<div class="table-wrap"><table class="table compact"><thead><tr><th>#</th><th>Department Name</th><th>Code</th><th>Head of Department</th><th>Status</th><th class="c">Actions</th></tr></thead><tbody>
          ${pg.rows.map((d, i) => `<tr><td>${pg.from + i}</td><td class="strong">${UI.esc(d.name)}</td><td>${UI.esc(d.code)}</td><td>${UI.esc(d.head || '-')}</td><td>${UI.badge(d.status)}</td><td class="c"><button class="kebab" data-d="${d.id}">${icon('more')}</button></td></tr>`).join('') || `<tr><td colspan="6" class="muted c">No departments found.</td></tr>`}
          </tbody></table></div>${UI.pager(pg, 'departments')}`;
        UI.bindPager($('#dt'), (p) => { st.dp = p; dTable(); });
        $('#dt').querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
          const d = ERS.dept(b.dataset.d);
          UI.menu(b, [
            { label: 'Edit', icon: 'edit', onClick: () => editDept(d) },
            { label: d.status === 'Active' ? 'Deactivate' : 'Activate', icon: d.status === 'Active' ? 'xCircle' : 'checkCircle', danger: d.status === 'Active', onClick: () => { d.status = d.status === 'Active' ? 'Inactive' : 'Active'; ERS.log('Department', 'UPDATE', d.code, d.name + ' set to ' + d.status + '.'); ERS.save(); all(); } },
            { label: 'Delete', icon: 'trash', danger: true, onClick: () => delDept(d) },
          ]);
        }));
      }
      function cTable() {
        const t = st.cq.toLowerCase();
        const pg = UI.paginate(ERS.db.costCenters.filter((c) => (!st.cs || c.status === st.cs) && (!t || (c.name + ' ' + c.code + ' ' + ERS.deptName(c.deptId)).toLowerCase().includes(t))), st.cp, per);
        $('#ct').innerHTML = `<div class="table-wrap"><table class="table compact"><thead><tr><th>#</th><th>Cost Center Name</th><th>Code</th><th>Department</th><th>Status</th><th class="c">Actions</th></tr></thead><tbody>
          ${pg.rows.map((c, i) => `<tr><td>${pg.from + i}</td><td class="strong">${UI.esc(c.name)}</td><td>${UI.esc(c.code)}</td><td>${UI.esc(ERS.deptName(c.deptId))}</td><td>${UI.badge(c.status)}</td><td class="c"><button class="kebab" data-c="${c.id}">${icon('more')}</button></td></tr>`).join('') || `<tr><td colspan="6" class="muted c">No cost centers found.</td></tr>`}
          </tbody></table></div>${UI.pager(pg, 'cost centers')}`;
        UI.bindPager($('#ct'), (p) => { st.cp = p; cTable(); });
        $('#ct').querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
          const c = ERS.cc(b.dataset.c);
          UI.menu(b, [
            { label: 'Edit', icon: 'edit', onClick: () => editCC(c) },
            { label: c.status === 'Active' ? 'Deactivate' : 'Activate', icon: c.status === 'Active' ? 'xCircle' : 'checkCircle', danger: c.status === 'Active', onClick: () => { c.status = c.status === 'Active' ? 'Inactive' : 'Active'; ERS.log('Cost Center', 'UPDATE', c.code, c.name + ' set to ' + c.status + '.'); ERS.save(); all(); } },
            { label: 'Delete', icon: 'trash', danger: true, onClick: () => delCC(c) },
          ]);
        }));
      }
      function editDept(d) {
        const isNew = !d; d = d || { name: '', code: '', head: '', status: 'Active' };
        UI.modal({
          title: isNew ? 'Add Department' : 'Edit Department', okText: isNew ? 'Add Department' : 'Save Changes', size: 'sm',
          body: `<div class="stack" style="gap:14px"><div class="field"><label>Department Name <span class="req">*</span></label><input name="name" required value="${UI.esc(d.name)}" placeholder="e.g., Marketing Department"></div>
            <div class="field"><label>Department Code <span class="req">*</span></label><input name="code" required value="${UI.esc(d.code)}" placeholder="e.g., MKT" style="text-transform:uppercase"></div>
            <div class="field"><label>Head of Department</label><input name="head" list="userNames" value="${UI.esc(d.head)}"><datalist id="userNames">${ERS.db.users.map((u) => `<option value="${UI.esc(u.name)}">`).join('')}</datalist></div>
            <div class="field"><label>Status</label><select name="status">${UI.options(['Active', 'Inactive'], d.status)}</select></div></div>`,
          onOk(el) {
            if (!UI.validate(el)) return false;
            const v = UI.formData(el); v.code = v.code.toUpperCase();
            if (ERS.db.departments.some((x) => x !== d && x.code === v.code)) { UI.fieldError(el.querySelector('[name=code]'), 'Code already exists.'); return false; }
            Object.assign(d, v); if (isNew) { d.id = ERS.uid('d'); ERS.db.departments.push(d); }
            ERS.log('Department', isNew ? 'CREATE' : 'UPDATE', d.code, (isNew ? 'Department created: ' : 'Department updated: ') + d.name);
            ERS.save(); UI.toast('Department saved.'); all();
          },
        });
      }
      function editCC(c) {
        const isNew = !c; c = c || { name: '', code: '', deptId: '', status: 'Active' };
        UI.modal({
          title: isNew ? 'Add Cost Center' : 'Edit Cost Center', okText: isNew ? 'Add Cost Center' : 'Save Changes', size: 'sm',
          body: `<div class="stack" style="gap:14px"><div class="field"><label>Cost Center Name <span class="req">*</span></label><input name="name" required value="${UI.esc(c.name)}" placeholder="e.g., ICT - Help Desk"></div>
            <div class="field"><label>Cost Center Code <span class="req">*</span></label><input name="code" required value="${UI.esc(c.code)}" placeholder="e.g., ICT-HD" style="text-transform:uppercase"></div>
            <div class="field"><label>Department <span class="req">*</span></label><select name="deptId" required>${UI.options(ERS.db.departments.map((d) => ({ value: d.id, label: d.name })), c.deptId, 'Select department')}</select></div>
            <div class="field"><label>Status</label><select name="status">${UI.options(['Active', 'Inactive'], c.status)}</select></div></div>`,
          onOk(el) {
            if (!UI.validate(el)) return false;
            const v = UI.formData(el); v.code = v.code.toUpperCase();
            if (ERS.db.costCenters.some((x) => x !== c && x.code === v.code)) { UI.fieldError(el.querySelector('[name=code]'), 'Code already exists.'); return false; }
            Object.assign(c, v); if (isNew) { c.id = ERS.uid('cc'); ERS.db.costCenters.push(c); }
            ERS.log('Cost Center', isNew ? 'CREATE' : 'UPDATE', c.code, (isNew ? 'Cost center created: ' : 'Cost center updated: ') + c.name);
            ERS.save(); UI.toast('Cost center saved.'); all();
          },
        });
      }
      async function delDept(d) {
        if (ERS.db.users.some((u) => u.deptId === d.id) || ERS.db.requests.some((q) => q.deptId === d.id) || ERS.db.costCenters.some((c) => c.deptId === d.id))
          return UI.toast(d.name + ' is in use by users, cost centers or requests. Deactivate it instead.', 'warn');
        if (!(await UI.confirm({ message: 'Delete <strong>' + UI.esc(d.name) + '</strong>?', okText: 'Delete', danger: true }))) return;
        ERS.db.departments = ERS.db.departments.filter((x) => x !== d); ERS.log('Department', 'DELETE', d.code, 'Department deleted: ' + d.name); ERS.save(); all();
      }
      async function delCC(c) {
        if (ERS.db.requests.some((q) => q.costCenterId === c.id)) return UI.toast(c.code + ' is used by requests. Deactivate it instead.', 'warn');
        if (!(await UI.confirm({ message: 'Delete <strong>' + UI.esc(c.name) + '</strong>?', okText: 'Delete', danger: true }))) return;
        ERS.db.costCenters = ERS.db.costCenters.filter((x) => x !== c); ERS.log('Cost Center', 'DELETE', c.code, 'Cost center deleted: ' + c.name); ERS.save(); all();
      }
      function all() { stats(); dTable(); cTable(); }

      $('#addD').addEventListener('click', () => editDept(null));
      $('#addC').addEventListener('click', () => editCC(null));
      $('#dq').addEventListener('input', UI.debounce((e) => { st.dq = e.target.value; st.dp = 1; dTable(); }));
      $('#cq').addEventListener('input', UI.debounce((e) => { st.cq = e.target.value; st.cp = 1; cTable(); }));
      $('#ds').addEventListener('change', (e) => { st.ds = e.target.value; st.dp = 1; dTable(); });
      $('#cs').addEventListener('change', (e) => { st.cs = e.target.value; st.cp = 1; cTable(); });
      all();
    },
  };
})();
