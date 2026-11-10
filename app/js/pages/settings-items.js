(function () {
  const PAGES = (window.PAGES = window.PAGES || {});
  const IMPORT_COLS = ['Item Code', 'Item Name', 'Description', 'Category', 'Item Type', 'Unit', 'Unit Cost', 'Available Stock', 'Min. Stock', 'Supplier'];

  PAGES['settings/items'] = {
    admin: true,
    render(root, params) {
      App.setHeader('Item Management', [['Settings', '#/settings/general'], ['Item Management']]);
      const st = { tab: 'All', q: '', cat: '', page: 1, sel: params.open || null };
      root.innerHTML = `
        <div class="page-intro"><p>Manage all items in the catalog including consumables, supplies, and assets.</p>
          <div class="row"><button class="btn btn-outline" id="imp">${icon('upload')} Import Items</button><button class="btn btn-primary" id="add">${icon('plus')} Add New Item</button></div></div>
        <div class="grid g4 mb" id="stats"></div>
        <div class="split-wide">
          <div class="card">
            <div class="tabs" id="tabs" style="padding:0 16px;margin:0"></div>
            <div class="filters"><div class="search"><input id="fq" placeholder="Search by item name, code, or category…"><button tabindex="-1">${icon('search')}</button></div>
              <select id="fcat">${UI.options(ERS.CATEGORIES, '', 'All categories')}</select></div>
            <div id="table"></div>
          </div>
          <div class="card panel" id="panel"></div>
        </div>`;
      const $ = (s) => root.querySelector(s);
      const TABS = { All: (i) => i.status === 'Active', Consumables: (i) => i.status === 'Active' && i.type === 'Consumable', Assets: (i) => i.status === 'Active' && i.type === 'Asset', 'Low Stock': (i) => i.status === 'Active' && i.stock < i.minStock, Inactive: (i) => i.status !== 'Active' };

      function stats() {
        const a = ERS.db.items.filter((i) => i.status === 'Active'), n = a.length || 1;
        const cons = a.filter((i) => i.type === 'Consumable').length, ast = a.filter((i) => i.type === 'Asset').length, low = a.filter((i) => i.stock < i.minStock).length;
        $('#stats').innerHTML = UI.statCard({ icon: 'box', color: 'blue', label: 'Total Items', value: a.length, sub: 'All active items' }) +
          UI.statCard({ icon: 'cart', color: 'green', label: 'Consumable Items', value: cons, sub: ((cons / n) * 100).toFixed(1) + '% of total items' }) +
          UI.statCard({ icon: 'layers', color: 'amber', label: 'Asset Items', value: ast, sub: ((ast / n) * 100).toFixed(1) + '% of total items' }) +
          UI.statCard({ icon: 'alert', color: 'violet', label: 'Low Stock Items', value: low, sub: low ? '<span class="text-red">Reorder required</span>' : 'All stocked' });
      }
      function tabs() {
        $('#tabs').innerHTML = Object.keys(TABS).map((k) => `<button data-t="${k}" class="${st.tab === k ? 'active' : ''}">${k === 'All' ? 'All Items' : k} <span class="count">${ERS.db.items.filter(TABS[k]).length}</span></button>`).join('');
        $('#tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.t; st.page = 1; tabs(); table(); }));
      }
      function table() {
        const t = st.q.toLowerCase();
        const pg = UI.paginate(ERS.db.items.filter((i) => TABS[st.tab](i) && (!st.cat || i.category === st.cat) && (!t || (i.name + ' ' + i.code + ' ' + i.category).toLowerCase().includes(t))), st.page, Number(ERS.db.prefs.itemsPerPage) || 10);
        $('#table').innerHTML = pg.rows.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>Item Code</th><th>Item Name</th><th>Category</th><th>Item Type</th><th>Unit</th><th class="r">Unit Cost (₱)</th><th class="r">Stock</th><th>Status</th><th class="c"></th></tr></thead><tbody>
          ${pg.rows.map((i) => `<tr class="clickable ${st.sel === i.id ? 'selected' : ''}" data-id="${i.id}"><td class="small">${UI.esc(i.code)}</td><td><div class="item-cell">${UI.thumb(i, 'sm')}<div><div class="strong">${UI.esc(i.name)}</div><div class="muted small">${UI.esc(i.desc)}</div></div></div></td><td>${UI.esc(i.category)}</td><td>${UI.badge(i.type)}</td><td>${UI.esc(i.unit)}</td><td class="r">${UI.money(i.cost).slice(1)}</td><td class="r ${i.stock < i.minStock ? 'text-red strong' : ''}">${UI.num(i.stock)}</td><td>${UI.badge(UI.stockStatus(i))}</td><td class="c"><button class="kebab" data-more="${i.id}">${icon('more')}</button></td></tr>`).join('')}
          </tbody></table></div>${UI.pager(pg, 'items')}` : UI.empty('No items found', 'Try a different tab or search.', 'box');
        UI.bindPager($('#table'), (p) => { st.page = p; table(); });
        $('#table').querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.closest('button')) return; st.sel = tr.dataset.id; table(); panel(); }));
        $('#table').querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', () => {
          const i = ERS.item(b.dataset.more);
          UI.menu(b, [{ label: 'Edit item', icon: 'edit', onClick: () => edit(i) }, { label: 'Adjust stock', icon: 'package', onClick: () => adjust(i) }, { label: i.status === 'Active' ? 'Deactivate' : 'Activate', icon: i.status === 'Active' ? 'xCircle' : 'checkCircle', danger: i.status === 'Active', onClick: () => toggle(i) }]);
        }));
      }
      function panel() {
        const i = st.sel ? ERS.item(st.sel) : null;
        const el = $('#panel');
        el.classList.toggle('hidden', !i);
        el.parentElement.className = i ? 'split-wide' : 'stack';
        if (!i) return;
        const acts = ERS.db.audit.filter((a) => a.ref === i.code).slice(0, 5);
        const used = ERS.db.requests.filter((q) => q.status === 'Released' && q.items.some((l) => l.itemId === i.id)).reduce((s, q) => s + q.items.filter((l) => l.itemId === i.id).reduce((a, l) => a + l.qty, 0), 0);
        el.innerHTML = `<div class="panel-h"><h3>Item Details</h3><button class="icon-btn" id="pc">${icon('x')}</button></div>
          <div class="card-b">
            <div class="row mb" style="flex-wrap:nowrap">${UI.thumb(i, 'lg')}<div><div class="strong" style="font-size:16px">${UI.esc(i.name)}</div><div class="muted small">${UI.esc(i.desc)}</div><div class="mt">${UI.badge(UI.stockStatus(i))} ${UI.badge(i.type)}</div></div></div>
            <div class="kv"><div>Item Code</div><div>${UI.esc(i.code)}</div><div>Category</div><div>${UI.esc(i.category)}</div><div>Unit</div><div>${UI.esc(i.unit)}</div><div>Unit Cost</div><div>${UI.money(i.cost)}</div><div>Available Stock</div><div class="${i.stock < i.minStock ? 'text-red' : ''}">${UI.num(i.stock)} ${UI.esc(i.unit)}</div><div>Reorder Level</div><div>${i.minStock}</div><div>Stock Value</div><div>${UI.money(i.stock * i.cost)}</div><div>Released (all time)</div><div>${UI.num(used)} ${UI.esc(i.unit)}</div><div>Supplier</div><div>${UI.esc(i.supplier || '-')}</div></div>
            <div class="row mt"><button class="btn btn-outline btn-sm" id="pe">${icon('edit')} Edit Item</button><button class="btn btn-ghost btn-sm" id="pa">${icon('package')} Adjust Stock</button><button class="btn ${i.status === 'Active' ? 'btn-danger-o' : 'btn-success-o'} btn-sm" id="pt">${i.status === 'Active' ? 'Deactivate' : 'Activate'}</button></div>
            <div class="section-t">${icon('history')} Recent Activity</div>
            ${acts.length ? acts.map((a) => `<div class="small" style="padding:6px 0;border-bottom:1px solid var(--border)"><span class="muted">${UI.dateTime(a.date)}</span><br>${UI.esc(a.details)} <span class="muted">– ${UI.esc(ERS.userName(a.userId))}</span></div>`).join('') : '<div class="muted small">No recorded activity for this item.</div>'}
          </div>`;
        el.querySelector('#pc').addEventListener('click', () => { st.sel = null; table(); panel(); });
        el.querySelector('#pe').addEventListener('click', () => edit(i));
        el.querySelector('#pa').addEventListener('click', () => adjust(i));
        el.querySelector('#pt').addEventListener('click', () => toggle(i));
      }
      function toggle(i) { i.status = i.status === 'Active' ? 'Inactive' : 'Active'; ERS.log('Item', i.status === 'Active' ? 'ACTIVATE' : 'DEACTIVATE', i.code, i.name + ' set to ' + i.status + '.'); ERS.save(); UI.toast(i.name + ' is now ' + i.status + '.'); all(); }
      function edit(i) {
        const isNew = !i;
        i = i || { code: '', name: '', desc: '', category: '', type: 'Consumable', unit: '', cost: '', stock: 0, minStock: 0, supplier: '', status: 'Active' };
        UI.modal({
          title: isNew ? 'Add New Item' : 'Edit Item', okText: isNew ? 'Add Item' : 'Save Changes',
          body: `<div class="form-grid">
            <div class="field"><label>Item Name <span class="req">*</span></label><input name="name" required value="${UI.esc(i.name)}"></div>
            <div class="field"><label>Item Code <span class="req">*</span></label><input name="code" required value="${UI.esc(i.code)}" placeholder="e.g., ITEM-OS-0020"></div>
            <div class="field full"><label>Description</label><input name="desc" value="${UI.esc(i.desc)}"></div>
            <div class="field"><label>Category <span class="req">*</span></label><select name="category" required>${UI.options(ERS.CATEGORIES, i.category, 'Select category')}</select></div>
            <div class="field"><label>Item Type <span class="req">*</span></label><select name="type">${UI.options(['Consumable', 'Asset'], i.type)}</select></div>
            <div class="field"><label>Unit <span class="req">*</span></label><input name="unit" required list="unitList" value="${UI.esc(i.unit)}"><datalist id="unitList">${ERS.UNITS.map((u) => `<option value="${u}">`).join('')}</datalist></div>
            <div class="field"><label>Unit Cost (₱) <span class="req">*</span></label><input name="cost" type="number" min="0" step="0.01" required value="${i.cost}"></div>
            <div class="field"><label>${isNew ? 'Opening Stock' : 'Available Stock'}</label><input name="stock" type="number" min="0" value="${i.stock}" ${isNew ? '' : 'readonly title="Use Adjust Stock to change"'}></div>
            <div class="field"><label>Reorder Level (Min. Stock)</label><input name="minStock" type="number" min="0" value="${i.minStock}"></div>
            <div class="field"><label>Supplier</label><input name="supplier" value="${UI.esc(i.supplier)}"></div>
            <div class="field"><label>Status</label><select name="status">${UI.options(['Active', 'Inactive'], i.status)}</select></div></div>`,
          onOk(el) {
            if (!UI.validate(el)) return false;
            const d = UI.formData(el);
            if (ERS.db.items.some((x) => x !== i && x.code.toLowerCase() === d.code.toLowerCase())) { UI.fieldError(el.querySelector('[name=code]'), 'Item code already exists.'); return false; }
            d.cost = Number(d.cost); d.stock = Number(d.stock) || 0; d.minStock = Number(d.minStock) || 0;
            Object.assign(i, d); if (isNew) { i.id = ERS.uid('i'); ERS.db.items.push(i); st.sel = i.id; }
            ERS.log('Item', isNew ? 'CREATE' : 'UPDATE', i.code, (isNew ? 'Item created: ' : 'Item updated: ') + i.name);
            ERS.save(); UI.toast('Item saved.'); all();
          },
        });
      }
      function adjust(i) {
        UI.modal({
          title: 'Adjust Stock', subtitle: UI.esc(i.name) + ' · current stock ' + i.stock + ' ' + UI.esc(i.unit), size: 'sm', okText: 'Save Adjustment',
          body: `<div class="stack" style="gap:14px"><div class="field"><label>Adjustment Type</label><select name="kind">${UI.options([{ value: 'in', label: 'Stock In (received delivery)' }, { value: 'out', label: 'Stock Out (damaged / lost)' }, { value: 'set', label: 'Set exact count (physical count)' }])}</select></div>
            <div class="field"><label>Quantity <span class="req">*</span></label><input name="qty" type="number" min="0" required></div>
            <div class="field"><label>Reason <span class="req">*</span></label><input name="reason" required placeholder="e.g., Delivery DR-1234"></div></div>`,
          onOk(el) {
            if (!UI.validate(el)) return false;
            const d = UI.formData(el); const q = Math.floor(Number(d.qty) || 0);
            const before = i.stock;
            i.stock = d.kind === 'in' ? i.stock + q : d.kind === 'out' ? Math.max(0, i.stock - q) : q;
            ERS.log('Inventory', 'ADJUST', i.code, 'Stock ' + before + ' → ' + i.stock + ' (' + d.reason + ')');
            ERS.save(); UI.toast('Stock updated to ' + i.stock + ' ' + i.unit + '.'); all();
          },
        });
      }
      function importItems() {
        UI.modal({
          title: 'Import Items', subtitle: 'Add or update many items at once from a CSV file (save your Excel sheet as “CSV UTF-8”).', okText: 'Import',
          body: `<ol class="small" style="padding-left:18px;margin-top:0"><li>Download the template and fill one item per row.</li><li>Items whose <b>Item Code</b> already exists will be updated; new codes are added.</li><li>Category must be one of: ${ERS.CATEGORIES.join(', ')}.</li></ol>
            <button class="btn btn-ghost btn-sm" id="tpl">${icon('download')} Download Template</button>
            <label class="file-drop mt" style="display:block;cursor:pointer">${icon('upload')}<div class="strong mt">Click to choose a CSV file</div><div class="small" id="fname">No file selected</div><input type="file" id="file" accept=".csv,text/csv" class="hidden"></label>
            <div id="preview" class="mt"></div>`,
          onMount(el) {
            el.querySelector('#tpl').addEventListener('click', () => UI.downloadCSV('ERS-Item-Import-Template.csv', [IMPORT_COLS, ['ITEM-OS-0099', 'Whiteboard Marker Blue', 'Refillable', 'Office Supplies', 'Consumable', 'pcs', '45', '100', '20', 'Office Warehouse Inc.']]));
            el.querySelector('#file').addEventListener('change', (e) => {
              const f = e.target.files[0]; if (!f) return;
              el.querySelector('#fname').textContent = f.name;
              const rd = new FileReader();
              rd.onload = () => {
                const rows = UI.parseCSV(String(rd.result));
                const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
                const idx = (n) => head.indexOf(n.toLowerCase());
                const errs = [], ok = [];
                rows.forEach((r, n) => {
                  const g = (c) => (idx(c) >= 0 ? (r[idx(c)] || '').trim() : '');
                  const it = { code: g('Item Code'), name: g('Item Name'), desc: g('Description'), category: g('Category'), type: g('Item Type') || 'Consumable', unit: g('Unit'), cost: Number(g('Unit Cost').replace(/[₱,]/g, '')), stock: Number(g('Available Stock')) || 0, minStock: Number(g('Min. Stock')) || 0, supplier: g('Supplier'), status: 'Active' };
                  const prob = !it.code ? 'missing Item Code' : !it.name ? 'missing Item Name' : !ERS.CATEGORIES.includes(it.category) ? 'unknown category “' + it.category + '”' : !it.unit ? 'missing Unit' : isNaN(it.cost) ? 'invalid Unit Cost' : '';
                  if (prob) errs.push('Row ' + (n + 2) + ': ' + prob); else ok.push(it);
                });
                el._rows = ok;
                el.querySelector('#preview').innerHTML = `<div class="alert ${errs.length ? 'amber' : 'green'}">${icon(errs.length ? 'alert' : 'checkCircle')}<div><strong>${ok.length} valid row(s) ready to import</strong><span class="t">${ok.filter((x) => ERS.db.items.some((i) => i.code === x.code)).length} will update existing items.${errs.length ? '<br>' + errs.slice(0, 6).map(UI.esc).join('<br>') + (errs.length > 6 ? '<br>…and ' + (errs.length - 6) + ' more' : '') : ''}</span></div></div>`;
              };
              rd.readAsText(f);
            });
          },
          onOk(el) {
            const rows = el._rows || [];
            if (!rows.length) { UI.toast('Choose a CSV file with at least one valid row.', 'error'); return false; }
            let add = 0, upd = 0;
            rows.forEach((r) => { const ex = ERS.db.items.find((i) => i.code === r.code); if (ex) { Object.assign(ex, r); upd++; } else { ERS.db.items.push({ ...r, id: ERS.uid('i') }); add++; } });
            ERS.log('Item', 'IMPORT', '-', 'Imported items: ' + add + ' added, ' + upd + ' updated.');
            ERS.save(); UI.toast(add + ' added, ' + upd + ' updated.'); all();
          },
        });
      }
      function all() { stats(); tabs(); table(); panel(); }
      $('#add').addEventListener('click', () => edit(null));
      $('#imp').addEventListener('click', importItems);
      $('#fq').addEventListener('input', UI.debounce((e) => { st.q = e.target.value; st.page = 1; table(); }));
      $('#fcat').addEventListener('change', (e) => { st.cat = e.target.value; st.page = 1; table(); });
      if (st.sel) { const i = ERS.item(st.sel); if (i && i.status !== 'Active') st.tab = 'Inactive'; }
      all();
    },
  };
})();
