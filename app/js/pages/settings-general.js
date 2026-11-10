(function () {
  const PAGES = (window.PAGES = window.PAGES || {});

  PAGES['settings/general'] = {
    admin: true,
    render(root) {
      App.setHeader('Settings', 'Manage system configurations and preferences.');
      const db = ERS.db;
      const draw = () => {
        const c = db.company, p = db.prefs, n = db.notifPrefs;
        const sysToggles = [['allowCancel', 'Allow Request Cancellation', 'Allow users to cancel their requests'], ['allowEditAfterSubmit', 'Allow Request Changes', 'Allow users to modify requests after submission'], ['requireAttachment', 'Attach File Requirement', 'Require attachment for certain request types'], ['showBudgetOnForm', 'Show Budget on Request Form', 'Display budget information when creating request'], ['autoNumber', 'Auto-generate Request Number', 'Automatically generate request number']];
        const notifToggles = [['email', 'Email Notifications', 'Enable email notifications'], ['submitted', 'Request Submitted', 'Notify when a request is submitted'], ['approved', 'Request Approved', 'Notify when a request is approved'], ['rejected', 'Request Rejected', 'Notify when a request is rejected'], ['released', 'Request Released', 'Notify when a request is released'], ['lowBudget', 'Low Budget Alert', 'Notify when budget is low']];
        const cc = ERS.cc(p.defaultCostCenterId);
        root.innerHTML = `
        <div class="split">
          <div class="grid g2" style="align-items:start">
            <div class="card"><div class="card-h"><h3>${icon('building')} Company Information</h3><button class="btn btn-outline btn-sm" id="editCo">${icon('edit')} Edit</button></div>
              <div class="card-b kv"><div>Company Name</div><div>${UI.esc(c.name)}</div><div>Address</div><div>${UI.esc(c.address)}</div><div>Phone</div><div>${UI.esc(c.phone)}</div><div>Email</div><div>${UI.esc(c.email)}</div><div>Support Contact</div><div>${UI.esc(c.supportPhone)}<br>${UI.esc(c.supportEmail)}</div><div>Timezone</div><div>${UI.esc(c.timezone)}</div><div>Date Format</div><div>${UI.date(new Date())} (MMM DD, YYYY)</div><div>Currency</div><div>${UI.esc(c.currency)}</div></div></div>
            <div class="card"><div class="card-h"><h3>${icon('sliders')} System Preferences</h3><a class="btn btn-outline btn-sm" href="#/settings/preferences">${icon('edit')} More</a></div>
              <div class="card-b" data-group="prefs">${sysToggles.map((t) => `<div class="toggle-row"><div><strong>${t[1]}</strong><small>${t[2]}</small></div>${UI.toggle(t[0], p[t[0]])}</div>`).join('')}</div></div>
            <div class="card"><div class="card-h"><h3>${icon('fileText')} Default Request Settings</h3><button class="btn btn-outline btn-sm" id="editDef">${icon('edit')} Edit</button></div>
              <div class="card-b kv"><div>Default Department</div><div>${UI.esc(ERS.deptName(p.defaultDeptId))}</div><div>Default Cost Center</div><div>${cc ? UI.esc(cc.code + ' – ' + cc.name) : '-'}</div><div>Default Priority</div><div>${UI.priority(p.defaultPriority)}</div><div>Attachment Size Limit</div><div>${p.maxAttachmentMb} MB</div><div>Allowed File Types</div><div>${UI.esc(p.fileTypes)}</div><div>Items Per Page</div><div>${p.itemsPerPage}</div></div></div>
            <div class="card"><div class="card-h"><h3>${icon('bell')} Notifications Settings</h3></div>
              <div class="card-b" data-group="notifPrefs">${notifToggles.map((t) => `<div class="toggle-row"><div><strong>${t[1]}</strong><small>${t[2]}</small></div>${UI.toggle(t[0], n[t[0]])}</div>`).join('')}</div></div>
            <div class="card" style="grid-column:1/-1"><div class="card-h"><h3>${icon('info')} About the System</h3></div>
              <div class="card-b kv"><div>System Name</div><div>Enterprise Requisition System (ERS)</div><div>Version</div><div>v1.0.0</div><div>Data storage</div><div>This browser (local storage) – see Backup &amp; Security</div><div>Copyright</div><div>© ${new Date().getFullYear()} ${UI.esc(c.name)}. All rights reserved.</div></div></div>
          </div>
          <div class="card"><div class="card-h"><h3>Quick Actions</h3></div><div class="card-b stack" style="gap:10px">
            ${[['users', 'Manage Users', 'Add or manage system users', 'settings/users', 'blue'], ['workflow', 'Manage Workflows', 'Configure approval workflows', 'settings/workflows', 'green'], ['box', 'Manage Items', 'Add or update catalog items', 'settings/items', 'violet'], ['wallet', 'Budget Configuration', 'Set up department budgets', 'settings/budget', 'amber'], ['history', 'Audit Trail', 'Review system activity', 'settings/audit', 'teal'], ['database', 'System Backup', 'Backup or restore system data', 'settings/backup', 'blue']]
              .map((q) => `<a class="card row" style="padding:12px;box-shadow:none;flex-wrap:nowrap" href="#/${q[3]}"><span class="stat-ico ${q[4]}" style="width:40px;height:40px">${icon(q[0])}</span><span style="flex:1"><strong class="text-blue">${q[1]}</strong><div class="muted small">${q[2]}</div></span>${icon('chevronRight')}</a>`).join('')}
          </div></div>
        </div>`;

        root.querySelectorAll('[data-group]').forEach((g) => g.querySelectorAll('input[data-key]').forEach((inp) => inp.addEventListener('change', () => {
          db[g.dataset.group][inp.dataset.key] = inp.checked;
          ERS.log('Settings', 'UPDATE', '-', (g.dataset.group === 'prefs' ? 'System preference' : 'Notification setting') + ' “' + inp.dataset.key + '” set to ' + (inp.checked ? 'ON' : 'OFF') + '.');
          ERS.save(); UI.toast('Setting saved.');
        })));
        root.querySelector('#editCo').addEventListener('click', () => UI.modal({
          title: 'Edit Company Information',
          body: `<div class="form-grid">
            <div class="field full"><label>Company Name <span class="req">*</span></label><input name="name" required value="${UI.esc(c.name)}"></div>
            <div class="field full"><label>Address</label><textarea name="address" rows="2">${UI.esc(c.address)}</textarea></div>
            <div class="field"><label>Phone</label><input name="phone" value="${UI.esc(c.phone)}"></div>
            <div class="field"><label>Email</label><input name="email" type="email" value="${UI.esc(c.email)}"></div>
            <div class="field"><label>Support Phone (sidebar)</label><input name="supportPhone" value="${UI.esc(c.supportPhone)}"></div>
            <div class="field"><label>Support Email (sidebar)</label><input name="supportEmail" value="${UI.esc(c.supportEmail)}"></div>
            <div class="field"><label>Timezone</label><select name="timezone">${UI.options(['(GMT+8:00) Asia/Manila', '(GMT+8:00) Asia/Singapore', '(GMT+0:00) UTC'], c.timezone)}</select></div>
            <div class="field"><label>Currency</label><select name="currency">${UI.options(['PHP - Philippine Peso (₱)'], c.currency)}</select></div></div>`,
          onOk(el) { if (!UI.validate(el)) return false; Object.assign(c, UI.formData(el)); ERS.log('Settings', 'UPDATE', '-', 'Company information updated.'); ERS.save(); UI.toast('Company information saved.'); App.chrome(); draw(); },
        }));
        root.querySelector('#editDef').addEventListener('click', () => UI.modal({
          title: 'Edit Default Request Settings',
          body: `<div class="form-grid">
            <div class="field"><label>Default Department</label><select name="defaultDeptId">${UI.options(db.departments.map((d) => ({ value: d.id, label: d.name })), p.defaultDeptId)}</select></div>
            <div class="field"><label>Default Cost Center</label><select name="defaultCostCenterId">${UI.options(db.costCenters.map((x) => ({ value: x.id, label: x.code + ' – ' + x.name })), p.defaultCostCenterId)}</select></div>
            <div class="field"><label>Default Priority</label><select name="defaultPriority">${UI.options(['Normal', 'Urgent'], p.defaultPriority)}</select></div>
            <div class="field"><label>Items Per Page</label><select name="itemsPerPage">${UI.options(['5', '10', '20', '50'], String(p.itemsPerPage))}</select></div>
            <div class="field"><label>Attachment Size Limit (MB)</label><input name="maxAttachmentMb" type="number" min="1" value="${p.maxAttachmentMb}"></div>
            <div class="field"><label>Allowed File Types</label><input name="fileTypes" value="${UI.esc(p.fileTypes)}"></div></div>`,
          onOk(el) { const d = UI.formData(el); d.itemsPerPage = Number(d.itemsPerPage); d.maxAttachmentMb = Number(d.maxAttachmentMb); Object.assign(p, d); ERS.log('Settings', 'UPDATE', '-', 'Default request settings updated.'); ERS.save(); UI.toast('Defaults saved.'); draw(); },
        }));
      };
      draw();
    },
  };
})();
