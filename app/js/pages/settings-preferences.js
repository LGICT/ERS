(function () {
  const PAGES = (window.PAGES = window.PAGES || {});

  PAGES['settings/preferences'] = {
    admin: true,
    render(root) {
      App.setHeader('System Preferences', [['Home', '#/dashboard'], ['Settings', '#/settings/general'], ['System Preferences']]);
      const draw = () => {
        const p = ERS.db.prefs, c = ERS.db.company;
        const tg = (k, label) => `<div class="toggle-row"><div><strong>${label}</strong></div>${UI.toggle(k, p[k])}</div>`;
        root.innerHTML = `<p class="muted" style="margin-top:0">Configure general settings that apply across the system.</p>
        <div class="split"><div class="grid g2" style="align-items:start" id="form">
          <div class="card"><div class="card-h"><h3>1. Organization Settings</h3></div><div class="card-b form-grid">
            <div class="field full"><label>Organization Name</label><input name="c.name" value="${UI.esc(c.name)}"></div>
            <div class="field"><label>Default Currency</label><select name="c.currency">${UI.options(['PHP - Philippine Peso (₱)'], c.currency)}</select></div>
            <div class="field"><label>Time Zone</label><select name="c.timezone">${UI.options(['(GMT+8:00) Asia/Manila', '(GMT+8:00) Asia/Singapore', '(GMT+0:00) UTC'], c.timezone)}</select></div></div></div>
          <div class="card"><div class="card-h"><h3>2. Default Values</h3></div><div class="card-b form-grid">
            <div class="field full"><label>Default Department</label><select name="defaultDeptId">${UI.options(ERS.db.departments.map((d) => ({ value: d.id, label: d.name })), p.defaultDeptId)}</select></div>
            <div class="field full"><label>Default Cost Center</label><select name="defaultCostCenterId">${UI.options(ERS.db.costCenters.map((x) => ({ value: x.id, label: x.code + ' – ' + x.name })), p.defaultCostCenterId)}</select></div>
            <div class="field full"><label>Default Priority</label><select name="defaultPriority">${UI.options(['Normal', 'Urgent'], p.defaultPriority)}</select></div></div></div>
          <div class="card"><div class="card-h"><h3>3. System Behavior</h3></div><div class="card-b">
            ${tg('allowCancel', 'Allow users to cancel their requests')}${tg('requireRejectReason', 'Require reason for rejection / request changes')}${tg('autosave', 'Enable autosave on request forms')}${tg('showBudgetOnForm', 'Show budget on request form')}</div></div>
          <div class="card"><div class="card-h"><h3>4. Numbering Preferences</h3></div><div class="card-b form-grid">
            <div class="field"><label>Request Number Prefix</label><input name="reqPrefix" maxlength="6" value="${UI.esc(p.reqPrefix)}"></div>
            <div class="field"><label>Next Number</label><input name="nextNumber" type="number" min="1" value="${p.nextNumber}"></div>
            <div class="field full"><label>Number Format Preview</label><input id="preview" readonly value="${ERS.previewReqNo()}"></div></div></div>
          <div class="card"><div class="card-h"><h3>5. Attachments</h3></div><div class="card-b form-grid">
            <div class="field"><label>Max file size (MB)</label><input name="maxAttachmentMb" type="number" min="1" value="${p.maxAttachmentMb}"></div>
            <div class="field"><label>Allowed file types</label><input name="fileTypes" value="${UI.esc(p.fileTypes)}"></div></div></div>
          <div class="card"><div class="card-h"><h3>6. Display Preferences</h3></div><div class="card-b form-grid">
            <div class="field"><label>Items per page</label><select name="itemsPerPage">${UI.options(['5', '10', '20', '50'], String(p.itemsPerPage))}</select></div>
            <div class="field"><label>Default landing page</label><select name="landingPage">${UI.options([{ value: 'dashboard', label: 'Dashboard' }, { value: 'my-requests', label: 'My Requests' }, { value: 'approvals', label: 'Approvals' }, { value: 'new-request', label: 'New Request' }], p.landingPage)}</select></div>
            <div class="field full"><label>Theme</label><div class="row"><label class="check"><input type="radio" name="theme" value="light" ${p.theme !== 'dark' ? 'checked' : ''}> Light</label><label class="check"><input type="radio" name="theme" value="dark" ${p.theme === 'dark' ? 'checked' : ''}> Dark</label></div></div></div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-h"><h3>Your Preferences Summary</h3></div><div class="card-b kv-rows">
            <div><span>${icon('clock')} Timezone</span><strong>${UI.esc(c.timezone)}</strong></div><div><span>${icon('calendar')} Date Format</span><strong>${UI.date(new Date())}</strong></div>
            <div><span>${icon('peso')} Currency</span><strong>PHP (₱)</strong></div><div><span>${icon('fileText')} Next Request Number</span><strong>${ERS.previewReqNo()}</strong></div></div></div>
          <div class="card"><div class="card-h"><h3>Quick Actions</h3></div><div class="card-b stack" style="gap:8px">
            <button class="btn btn-ghost" id="exportP" style="justify-content:flex-start">${icon('download')} Export Preferences</button>
            <label class="btn btn-ghost" style="justify-content:flex-start">${icon('upload')} Import Preferences<input type="file" id="importP" accept=".json" class="hidden"></label></div></div>
        </div></div>
        <div class="card mt"><div class="row between pad"><span class="muted small">Changes apply to all users after saving.</span><div class="row"><button class="btn btn-outline" id="reset">Reset Changes</button><button class="btn btn-primary" id="save">${icon('save')} Save Changes</button></div></div></div>`;
        const form = root.querySelector('#form');
        const upd = () => { const pf = form.querySelector('[name=reqPrefix]').value || 'REQ'; const n = form.querySelector('[name=nextNumber]').value || 1; root.querySelector('#preview').value = pf + '-' + new Date().getFullYear() + '-' + String(n).padStart(5, '0'); };
        form.querySelector('[name=reqPrefix]').addEventListener('input', upd); form.querySelector('[name=nextNumber]').addEventListener('input', upd);
        root.querySelector('#reset').addEventListener('click', draw);
        root.querySelector('#save').addEventListener('click', () => {
          const d = {};
          form.querySelectorAll('[name]').forEach((f) => { if (f.type === 'radio') { if (f.checked) d[f.name] = f.value; } else d[f.name] = f.value.trim(); });
          form.querySelectorAll('input[data-key]').forEach((f) => (p[f.dataset.key] = f.checked));
          if (!d.reqPrefix) return UI.fieldError(form.querySelector('[name=reqPrefix]'), 'Prefix is required.');
          Object.keys(d).forEach((k) => { if (k.startsWith('c.')) c[k.slice(2)] = d[k]; else p[k] = ['nextNumber', 'itemsPerPage', 'maxAttachmentMb'].includes(k) ? Number(d[k]) : d[k]; });
          p.reqPrefix = p.reqPrefix.toUpperCase();
          ERS.log('Settings', 'UPDATE', '-', 'System preferences saved.'); ERS.save(); UI.toast('Preferences saved.'); App.render();
        });
        root.querySelector('#exportP').addEventListener('click', () => UI.downloadFile('ERS-Preferences.json', JSON.stringify({ prefs: p, notifPrefs: ERS.db.notifPrefs, budgetConfig: ERS.db.budgetConfig }, null, 2), 'application/json'));
        root.querySelector('#importP').addEventListener('change', (e) => {
          const f = e.target.files[0]; if (!f) return;
          const rd = new FileReader();
          rd.onload = () => { try { const o = JSON.parse(rd.result); if (!o.prefs) throw new Error(); Object.assign(p, o.prefs); if (o.notifPrefs) Object.assign(ERS.db.notifPrefs, o.notifPrefs); if (o.budgetConfig) Object.assign(ERS.db.budgetConfig, o.budgetConfig); ERS.log('Settings', 'IMPORT', '-', 'Preferences imported.'); ERS.save(); UI.toast('Preferences imported.'); App.render(); } catch (err) { UI.toast('That file is not a valid preferences file.', 'error'); } };
          rd.readAsText(f);
        });
      };
      draw();
    },
  };
})();
