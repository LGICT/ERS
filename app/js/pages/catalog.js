(function () {
  const PAGES = (window.PAGES = window.PAGES || {});

  PAGES.catalog = {
    render(root) {
      App.setHeader('Items Catalog', 'Browse and search available items that you can request.');
      const st = { cat: 'All', q: '', unit: '', status: '', page: 1 };
      const items = () => ERS.db.items.filter((i) => i.status === 'Active' || ERS.isAdmin());

      root.innerHTML = `
        <div class="page-intro"><p>Click an item to see details, or use “Request” to add it straight to a new requisition.</p>
          <button class="btn btn-outline" id="exportBtn">${icon('download')} Export Catalog</button></div>
        <div class="pills" id="pills"></div>
        <div class="card">
          <div class="filters">
            <div class="search"><input id="fq" placeholder="Search by item name, code or description…"><button tabindex="-1">${icon('search')}</button></div>
            <select id="funit">${UI.options([...new Set(ERS.db.items.map((i) => i.unit))].sort(), '', 'All units')}</select>
            <select id="fst">${UI.options(['Active', 'Low Stock', 'Out of Stock'].concat(ERS.isAdmin() ? ['Inactive'] : []), '', 'All statuses')}</select>
            <button class="btn btn-ghost" id="fclear">${icon('refresh')} Clear Filters</button>
          </div>
          <div id="table"></div>
        </div>`;
      const $ = (s) => root.querySelector(s);

      function filtered() {
        const t = st.q.toLowerCase();
        return items().filter((i) => (st.cat === 'All' || i.category === st.cat) && (!st.unit || i.unit === st.unit) && (!st.status || UI.stockStatus(i) === st.status)
          && (!t || (i.name + ' ' + i.code + ' ' + i.desc + ' ' + i.category).toLowerCase().includes(t)));
      }
      function renderPills() {
        const all = items();
        const cats = ['All'].concat(ERS.CATEGORIES.filter((c) => all.some((i) => i.category === c)));
        $('#pills').innerHTML = cats.map((c) => `<button data-c="${c}" class="${st.cat === c ? 'active' : ''}">${c === 'All' ? 'All Items' : c} <span class="count">${c === 'All' ? all.length : all.filter((i) => i.category === c).length}</span></button>`).join('');
        $('#pills').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { st.cat = b.dataset.c; st.page = 1; renderPills(); renderTable(); }));
      }
      function renderTable() {
        const pg = UI.paginate(filtered(), st.page, Number(ERS.db.prefs.itemsPerPage) || 10);
        $('#table').innerHTML = pg.rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Category</th><th>Unit</th><th>Available Stock</th><th class="r">Unit Cost</th><th>Status</th><th class="c">Actions</th></tr></thead><tbody>
          ${pg.rows.map((i) => { const s = UI.stockStatus(i); return `<tr class="clickable" data-id="${i.id}"><td><div class="item-cell">${UI.thumb(i)}<div><div class="strong">${UI.esc(i.name)}</div><div class="muted small">${i.code}</div><div class="muted small">${UI.esc(i.desc)}</div></div></div></td>
            <td>${UI.catBadge(i.category)}</td><td>${UI.esc(i.unit)}</td>
            <td><div class="strong ${s === 'Active' ? 'text-green' : 'text-red'}">${UI.num(i.stock)} ${UI.esc(i.unit)}</div><div class="small ${s === 'Active' ? 'muted' : 'text-red'}">Min. Stock: ${i.minStock} ${UI.esc(i.unit)}</div></td>
            <td class="r strong">${UI.money(i.cost)}</td><td>${UI.badge(s)}</td>
            <td class="c"><div class="row" style="justify-content:center;flex-wrap:nowrap">${i.status === 'Active' ? `<button class="btn btn-outline btn-sm" data-add="${i.id}">${icon('plus')} Request</button>` : ''}<button class="kebab" data-more="${i.id}">${icon('more')}</button></div></td></tr>`; }).join('')}
          </tbody></table></div>${UI.pager(pg, 'items')}` : UI.empty('No items found', 'Try a different category or clear the filters.', 'search');
        UI.bindPager($('#table'), (p) => { st.page = p; renderTable(); });
        $('#table').querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.closest('button')) return; showItem(ERS.item(tr.dataset.id)); }));
        $('#table').querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => App.go('#/new-request?add=' + b.dataset.add)));
        $('#table').querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', () => {
          const it = ERS.item(b.dataset.more);
          const menu = [{ label: 'View details', icon: 'eye', onClick: () => showItem(it) }];
          if (it.status === 'Active') menu.push({ label: 'Add to new request', icon: 'plus', onClick: () => App.go('#/new-request?add=' + it.id) });
          if (ERS.isAdmin()) menu.push({ label: 'Manage in Item Management', icon: 'settings', onClick: () => App.go('#/settings/items?open=' + it.id) });
          UI.menu(b, menu);
        }));
      }

      $('#fq').addEventListener('input', UI.debounce((e) => { st.q = e.target.value; st.page = 1; renderTable(); }));
      $('#funit').addEventListener('change', (e) => { st.unit = e.target.value; st.page = 1; renderTable(); });
      $('#fst').addEventListener('change', (e) => { st.status = e.target.value; st.page = 1; renderTable(); });
      $('#fclear').addEventListener('click', () => { Object.assign(st, { q: '', unit: '', status: '', cat: 'All', page: 1 }); ['#fq', '#funit', '#fst'].forEach((s) => ($(s).value = '')); renderPills(); renderTable(); });
      $('#exportBtn').addEventListener('click', () => exportCatalog(filtered(), st.cat));
      renderPills(); renderTable();
    },
  };

  function showItem(i) {
    const used = ERS.db.requests.filter((q) => q.status !== 'Draft' && q.items.some((l) => l.itemId === i.id));
    UI.modal({
      title: UI.esc(i.name), subtitle: i.code, size: 'sm',
      body: `<div class="row mb">${UI.thumb(i, 'lg')}<div>${UI.catBadge(i.category)} ${UI.badge(i.type)}<div class="mt strong" style="font-size:20px">${UI.money(i.cost)} <span class="muted small">/ ${UI.esc(i.unit)}</span></div></div></div>
        <div class="kv"><div>Description</div><div>${UI.esc(i.desc || '-')}</div><div>Available stock</div><div>${UI.num(i.stock)} ${UI.esc(i.unit)} ${UI.badge(UI.stockStatus(i))}</div><div>Minimum stock</div><div>${i.minStock} ${UI.esc(i.unit)}</div><div>Supplier</div><div>${UI.esc(i.supplier || '-')}</div><div>Times requested</div><div>${used.length}</div></div>`,
      footer: `<button class="btn btn-outline" data-close>Close</button>${i.status === 'Active' ? `<button class="btn btn-primary" data-ok>${icon('plus')} Add to Request</button>` : ''}`,
      onOk: () => App.go('#/new-request?add=' + i.id),
    });
  }

  function exportCatalog(list, cat) {
    const cols = [['code', 'Item Code'], ['name', 'Item Name'], ['desc', 'Description'], ['category', 'Category'], ['type', 'Item Type'], ['unit', 'Unit'], ['cost', 'Unit Cost'], ['stock', 'Available Stock'], ['minStock', 'Min. Stock'], ['supplier', 'Supplier'], ['status', 'Status']];
    UI.modal({
      title: 'Export Catalog', subtitle: 'Download the items catalog as a spreadsheet (CSV, opens in Excel).', okText: 'Export', size: 'sm',
      body: `<div class="field"><label>Items to export</label>
          <label class="check"><input type="radio" name="scope" value="filtered" checked> Current view (${list.length} items${cat !== 'All' ? ', ' + UI.esc(cat) : ''})</label>
          <label class="check"><input type="radio" name="scope2" value="all"> All items (${ERS.db.items.length})</label></div>
        <div class="field mt"><label>Columns</label><div class="grid g2" style="gap:8px">${cols.map((c) => `<label class="check"><input type="checkbox" data-col="${c[0]}" checked> ${c[1]}</label>`).join('')}</div></div>`,
      onMount(el) {
        const a = el.querySelector('[name=scope]'), b = el.querySelector('[name=scope2]');
        a.addEventListener('change', () => (b.checked = !a.checked)); b.addEventListener('change', () => (a.checked = !b.checked));
      },
      onOk(el) {
        const src = el.querySelector('[name=scope2]').checked ? ERS.db.items : list;
        const chosen = cols.filter((c) => el.querySelector(`[data-col="${c[0]}"]`).checked);
        if (!chosen.length) { UI.toast('Select at least one column.', 'error'); return false; }
        UI.downloadCSV('ERS-Items-Catalog-' + UI.isoDay(new Date()) + '.csv', [chosen.map((c) => c[1])].concat(src.map((i) => chosen.map((c) => i[c[0]]))));
        ERS.log('Item', 'EXPORT', '-', 'Exported ' + src.length + ' catalog items.'); ERS.save();
        UI.toast('Catalog exported (' + src.length + ' items).');
      },
    });
  }
})();
