(function () {
  const PAGES = (window.PAGES = window.PAGES || {});

  PAGES['settings/backup'] = {
    admin: true,
    render(root) {
      App.setHeader('Backup & Security', [['Settings', '#/settings/general'], ['Backup & Security']]);
      const db = ERS.db;
      const size = new Blob([JSON.stringify(db)]).size;
      root.innerHTML = `
        <div class="alert amber mb">${icon('alert')}<div><strong>Where your data is stored</strong><span class="t">This version of ERS saves everything inside <b>this web browser on this computer</b>. Other people and other computers do not see it, and clearing the browser's site data erases it. Download a backup regularly. To share one live system with the whole company, ERS needs a central server and database (see the README).</span></div></div>
        <div class="grid g3 mb">
          ${UI.statCard({ icon: 'fileText', color: 'blue', label: 'Requests stored', value: db.requests.length, sub: 'Including drafts' })}
          ${UI.statCard({ icon: 'history', color: 'violet', label: 'Audit records', value: db.audit.length, sub: 'Immutable activity log' })}
          ${UI.statCard({ icon: 'database', color: 'green', label: 'Data size', value: (size / 1024).toFixed(0) + ' KB', sub: 'Browser storage limit is about 5 MB' })}
        </div>
        <div class="grid g3" style="align-items:start">
          <div class="card pad-lg"><div class="stat-ico blue mb">${icon('download')}</div><h3 style="font-size:16px">Download Backup</h3><p class="muted small">Saves every request, user, item, budget and setting into one file you can keep safe.</p><button class="btn btn-primary" id="bk">${icon('download')} Download Backup</button></div>
          <div class="card pad-lg"><div class="stat-ico green mb">${icon('upload')}</div><h3 style="font-size:16px">Restore from Backup</h3><p class="muted small">Replaces all current data with the contents of a backup file.</p><label class="btn btn-outline">${icon('upload')} Choose Backup File<input type="file" id="rs" accept=".json,application/json" class="hidden"></label></div>
          <div class="card pad-lg"><div class="stat-ico red mb">${icon('refresh')}</div><h3 style="font-size:16px">Reset Demo Data</h3><p class="muted small">Erases everything and reloads the original sample data. Download a backup first if you want to keep your changes.</p><button class="btn btn-danger-o" id="rst">${icon('refresh')} Reset to Sample Data</button></div>
        </div>
        <div class="card mt pad-lg"><h3 style="font-size:16px;margin-bottom:10px">Security overview</h3>
          <div class="kv"><div>Active administrators</div><div>${db.users.filter((u) => u.role === 'Administrator' && u.status === 'Active').map((u) => UI.esc(u.name)).join(', ')}</div>
          <div>Locked accounts</div><div>${db.users.filter((u) => u.status === 'Locked').map((u) => UI.esc(u.name)).join(', ') || 'None'}</div>
          <div>Sign-in</div><div>Demo mode: anyone using this browser can switch users from the profile menu. Real passwords / company single sign-on require the server version.</div></div></div>`;
      root.querySelector('#bk').addEventListener('click', () => {
        ERS.log('System', 'EXPORT', '-', 'Full system backup downloaded.'); ERS.save();
        UI.downloadFile('ERS-Backup-' + UI.isoDay(new Date()) + '.json', JSON.stringify(ERS.db, null, 1), 'application/json');
        UI.toast('Backup downloaded.');
      });
      root.querySelector('#rs').addEventListener('change', (e) => {
        const f = e.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = async () => {
          let obj; try { obj = JSON.parse(rd.result); } catch (err) { return UI.toast('That file is not a valid backup.', 'error'); }
          if (!(await UI.confirm({ message: `Restore <strong>${UI.esc(f.name)}</strong>? All current data will be replaced.`, okText: 'Restore', danger: true }))) return;
          try { ERS.importData(obj); ERS.log('System', 'IMPORT', '-', 'System restored from backup ' + f.name + '.'); ERS.save(); UI.toast('Backup restored.'); App.go('#/dashboard'); }
          catch (err) { UI.toast(err.message, 'error'); }
        };
        rd.readAsText(f);
      });
      root.querySelector('#rst').addEventListener('click', async () => {
        if (!(await UI.confirm({ message: 'Erase all data and reload the sample data? <strong>This cannot be undone.</strong>', okText: 'Reset Everything', danger: true }))) return;
        ERS.reset(); UI.toast('Sample data restored.'); App.go('#/dashboard');
      });
    },
  };
})();
