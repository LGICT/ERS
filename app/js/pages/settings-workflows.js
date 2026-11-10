(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const NODE_COLORS = ['#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#4f46e5'];

  PAGES['settings/workflows'] = {
    admin: true,
    render(root) {
      App.setHeader('Workflows & Approvals', [['Settings', '#/settings/general'], ['Workflows & Approvals']]);
      const st = { sel: ERS.db.workflows[0] && ERS.db.workflows[0].id, q: '' };
      root.innerHTML = `
        <div class="page-intro"><p>Configure workflow templates and approval rules for different request types.</p><button class="btn btn-primary" id="addWf">${icon('plus')} Create New Workflow</button></div>
        <div class="grid g4 mb" id="stats"></div>
        <div class="alert amber mb">${icon('info')}<div><strong>How approvals run today</strong><span class="t">Every submitted request currently follows the <b>Standard Requisition Workflow</b>: Supervisor / Department Approver → Supply Chain Review → For Release. The other templates are recorded here for documentation; routing requests to them automatically is a future enhancement.</span></div></div>
        <div class="grid" style="grid-template-columns:minmax(260px,320px) minmax(0,1fr);align-items:start" id="wfGrid">
          <div class="card"><div class="card-h"><div><h3>Workflow Templates</h3><div class="muted small">List of all workflow templates.</div></div></div>
            <div style="padding:0 16px 12px"><div class="search"><input id="wq" placeholder="Search workflow…"><button tabindex="-1">${icon('search')}</button></div></div>
            <div id="wlist"></div></div>
          <div class="card" id="detail"></div>
        </div>`;
      const $ = (s) => root.querySelector(s);
      if (window.innerWidth < 1100) $('#wfGrid').style.gridTemplateColumns = '1fr';

      function stats() {
        const w = ERS.db.workflows, n = w.length || 1, c = (s) => w.filter((x) => x.status === s).length;
        $('#stats').innerHTML = UI.statCard({ icon: 'workflow', color: 'blue', label: 'Total Workflows', value: w.length, sub: 'Workflow templates' }) +
          UI.statCard({ icon: 'checkCircle', color: 'green', label: 'Active Workflows', value: c('Active'), sub: Math.round((c('Active') / n) * 100) + '% of total' }) +
          UI.statCard({ icon: 'clock', color: 'amber', label: 'Draft Workflows', value: c('Draft'), sub: 'Draft or for review' }) +
          UI.statCard({ icon: 'xCircle', color: 'violet', label: 'Inactive Workflows', value: c('Inactive'), sub: Math.round((c('Inactive') / n) * 100) + '% of total' });
      }
      function list() {
        const t = st.q.toLowerCase();
        const rows = ERS.db.workflows.filter((w) => !t || (w.name + ' ' + w.appliesTo).toLowerCase().includes(t));
        $('#wlist').innerHTML = `<table class="table compact"><tbody>${rows.map((w, i) => `<tr class="clickable ${w.id === st.sel ? 'selected' : ''}" data-w="${w.id}"><td>${i + 1}</td><td><div class="strong">${UI.esc(w.name)}</div><div class="muted small">${UI.esc(w.appliesTo)}</div></td><td>${UI.badge(w.status, w.status === 'Draft' ? 'amber' : undefined)}</td></tr>`).join('') || '<tr><td class="muted">No workflows.</td></tr>'}</tbody></table>`;
        $('#wlist').querySelectorAll('[data-w]').forEach((tr) => tr.addEventListener('click', () => { st.sel = tr.dataset.w; list(); detail(); }));
      }
      function detail() {
        const w = ERS.db.workflows.find((x) => x.id === st.sel);
        const el = $('#detail');
        if (!w) { el.innerHTML = UI.empty('No workflow selected', 'Create a workflow to get started.', 'workflow'); return; }
        const nodes = [{ name: 'Request Submitted', icon: 'cart', color: '#1a56db' }].concat(w.steps.map((s, i) => ({ name: s.name, sub: 'Level ' + (i + 1), icon: s.type === 'Automatic' ? 'truck' : 'user', color: NODE_COLORS[i % NODE_COLORS.length] }))).concat([{ name: 'Completed', icon: 'checkCircle', color: '#16a34a' }]);
        el.innerHTML = `
          <div class="card-h"><div><h3>${UI.esc(w.name)} ${UI.badge(w.status, w.status === 'Draft' ? 'amber' : undefined)}</h3><div class="muted small">${UI.esc(w.desc)}</div></div>
            <div class="row"><button class="btn btn-outline btn-sm" id="editWf">${icon('edit')} Edit Workflow</button><button class="btn btn-ghost btn-sm" id="moreWf">More Actions ${icon('chevronDown')}</button></div></div>
          <div class="card-b">
            <div class="lbl" style="margin-bottom:10px">Workflow Diagram</div>
            <div class="wf-diagram">${nodes.map((n) => `<div class="wf-node"><div class="n-ico" style="background:${n.color}">${icon(n.icon)}</div><strong>${UI.esc(n.name)}</strong>${n.sub ? `<small>${n.sub}</small>` : ''}</div>`).join(`<span class="wf-arrow">${icon('chevronRight')}</span>`)}</div>
            <div class="lbl" style="margin:16px 0 10px">Steps &amp; Approvers</div>
            <div class="card" style="box-shadow:none"><div class="table-wrap"><table class="table compact"><thead><tr><th>Level</th><th>Step Name</th><th>Approver Role</th><th>Approval Type</th><th>Conditions</th><th class="c">Actions</th></tr></thead><tbody>
              ${w.steps.map((s, i) => `<tr><td>${i + 1}</td><td class="strong">${UI.esc(s.name)}</td><td>${UI.esc(s.role)}</td><td>${UI.badge(s.type)}</td><td>${UI.esc(s.condition || '-')}</td><td class="c" style="white-space:nowrap"><button class="kebab" data-up="${i}" title="Move up" ${i === 0 ? 'disabled' : ''}>${icon('chevronUp')}</button><button class="kebab" data-edit="${i}" title="Edit">${icon('edit')}</button><button class="kebab" data-del="${i}" title="Delete" style="color:var(--red)">${icon('trash')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted c">No steps yet.</td></tr>'}
            </tbody></table></div>
            <button class="btn btn-ghost" id="addStep" style="width:100%;border-style:dashed;border-radius:0 0 12px 12px">${icon('plus')} Add Step</button></div>
            <div class="grid g2 mt"><div class="kv"><div>Workflow Code</div><div>${UI.esc(w.code)}</div><div>Applies To</div><div>${UI.esc(w.appliesTo)}</div></div><div class="kv"><div>Status</div><div>${UI.badge(w.status, w.status === 'Draft' ? 'amber' : undefined)}</div><div>Number of steps</div><div>${w.steps.length}</div></div></div>
          </div>`;
        el.querySelector('#editWf').addEventListener('click', () => editWf(w));
        el.querySelector('#addStep').addEventListener('click', () => editStep(w, null));
        el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editStep(w, Number(b.dataset.edit))));
        el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.up); [w.steps[i - 1], w.steps[i]] = [w.steps[i], w.steps[i - 1]]; ERS.save(); detail(); }));
        el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
          const i = Number(b.dataset.del);
          if (!(await UI.confirm({ message: 'Remove step <strong>' + UI.esc(w.steps[i].name) + '</strong>?', okText: 'Remove', danger: true }))) return;
          w.steps.splice(i, 1); ERS.log('Workflow', 'UPDATE', w.code, 'Step removed.'); ERS.save(); detail();
        }));
        el.querySelector('#moreWf').addEventListener('click', (e) => UI.menu(e.currentTarget, [
          { label: 'Duplicate workflow', icon: 'copy', onClick: () => { const c = JSON.parse(JSON.stringify(w)); c.id = ERS.uid('wf'); c.code = w.code + '-COPY'; c.name = w.name + ' (Copy)'; c.status = 'Draft'; ERS.db.workflows.push(c); st.sel = c.id; ERS.log('Workflow', 'CREATE', c.code, 'Workflow duplicated.'); ERS.save(); all(); UI.toast('Workflow duplicated.'); } },
          w.status !== 'Active' ? { label: 'Activate workflow', icon: 'checkCircle', onClick: () => setSt(w, 'Active') } : { label: 'Deactivate workflow', icon: 'xCircle', danger: true, onClick: () => setSt(w, 'Inactive') },
          { label: 'Delete workflow', icon: 'trash', danger: true, onClick: async () => { if (w.id === 'wf1') return UI.toast('The standard workflow cannot be deleted.', 'warn'); if (!(await UI.confirm({ message: 'Delete <strong>' + UI.esc(w.name) + '</strong>?', okText: 'Delete', danger: true }))) return; ERS.db.workflows = ERS.db.workflows.filter((x) => x !== w); st.sel = ERS.db.workflows[0] && ERS.db.workflows[0].id; ERS.log('Workflow', 'DELETE', w.code, 'Workflow deleted.'); ERS.save(); all(); } },
        ]));
      }
      function setSt(w, s) { if (w.id === 'wf1' && s !== 'Active') return UI.toast('The standard workflow must stay active.', 'warn'); w.status = s; ERS.log('Workflow', 'UPDATE', w.code, 'Workflow set to ' + s + '.'); ERS.save(); all(); }
      function editWf(w) {
        const isNew = !w; w = w || { code: 'WF-' + String(ERS.db.workflows.length + 1).padStart(3, '0'), name: '', appliesTo: '', desc: '', status: 'Draft', steps: [{ name: 'Supervisor Approval', role: 'Immediate Supervisor', type: 'Required', condition: '-' }] };
        UI.modal({
          title: isNew ? 'Create New Workflow' : 'Edit Workflow', okText: isNew ? 'Create Workflow' : 'Save Changes',
          body: `<div class="form-grid">
            <div class="field"><label>Workflow Name <span class="req">*</span></label><input name="name" required value="${UI.esc(w.name)}" placeholder="e.g., Marketing Materials Workflow"></div>
            <div class="field"><label>Workflow Code <span class="req">*</span></label><input name="code" required value="${UI.esc(w.code)}"></div>
            <div class="field"><label>Applies To <span class="req">*</span></label><input name="appliesTo" required value="${UI.esc(w.appliesTo)}" placeholder="e.g., Office Supplies, Above ₱50,000"></div>
            <div class="field"><label>Status</label><select name="status">${UI.options(['Draft', 'Active', 'Inactive'], w.status)}</select></div>
            <div class="field full"><label>Description</label><textarea name="desc" rows="2">${UI.esc(w.desc)}</textarea></div></div>
            ${isNew ? '<p class="muted small mt">The workflow starts with a Supervisor Approval step. You can add more steps after creating it.</p>' : ''}`,
          onOk(el) {
            if (!UI.validate(el)) return false;
            const d = UI.formData(el);
            if (w.id === 'wf1' && d.status !== 'Active') { UI.toast('The standard workflow must stay active.', 'warn'); return false; }
            Object.assign(w, d); if (isNew) { w.id = ERS.uid('wf'); ERS.db.workflows.push(w); st.sel = w.id; }
            ERS.log('Workflow', isNew ? 'CREATE' : 'UPDATE', w.code, (isNew ? 'Workflow created: ' : 'Workflow updated: ') + w.name);
            ERS.save(); UI.toast('Workflow saved.'); all();
          },
        });
      }
      function editStep(w, i) {
        const s = i == null ? { name: '', role: '', type: 'Required', condition: '-' } : w.steps[i];
        UI.modal({
          title: i == null ? 'Add Step' : 'Edit Step', size: 'sm', okText: 'Save Step',
          body: `<div class="stack" style="gap:14px"><div class="field"><label>Step Name <span class="req">*</span></label><input name="name" required value="${UI.esc(s.name)}" placeholder="e.g., Finance Approval"></div>
            <div class="field"><label>Approver Role <span class="req">*</span></label><input name="role" required list="roleList" value="${UI.esc(s.role)}"><datalist id="roleList">${['Immediate Supervisor', 'Department Head', 'Finance Manager', 'Budget Owner / GM', 'Supply Chain', 'Supply Chain / Storekeeper'].map((r) => `<option value="${r}">`).join('')}</datalist></div>
            <div class="field"><label>Approval Type</label><select name="type">${UI.options(['Required', 'Optional', 'Automatic'], s.type)}</select></div>
            <div class="field"><label>Condition</label><input name="condition" value="${UI.esc(s.condition)}" placeholder="e.g., Amount > ₱50,000 or -"></div></div>`,
          onOk(el) {
            if (!UI.validate(el)) return false;
            const d = UI.formData(el);
            if (i == null) w.steps.push(d); else Object.assign(s, d);
            ERS.log('Workflow', 'UPDATE', w.code, 'Step “' + d.name + '” saved.'); ERS.save(); detail();
          },
        });
      }
      function all() { stats(); list(); detail(); }
      $('#addWf').addEventListener('click', () => editWf(null));
      $('#wq').addEventListener('input', UI.debounce((e) => { st.q = e.target.value; list(); }));
      all();
    },
  };
})();
