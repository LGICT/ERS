/* Shared UI helpers: formatting, badges, modals, toasts, charts, tables, CSV. */
(function () {
  const UI = (window.UI = {});

  UI.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  UI.money = (n) => ERS.money(n);
  UI.num = (n) => Number(n || 0).toLocaleString('en-PH');
  UI.short = (n) => { n = Number(n) || 0; if (Math.abs(n) >= 1e6) return '₱' + (n / 1e6).toFixed(2) + 'M'; if (Math.abs(n) >= 1e3) return '₱' + (n / 1e3).toFixed(1) + 'K'; return '₱' + n.toFixed(0); };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  UI.MON = MON;
  UI.date = (iso) => { if (!iso) return '-'; const d = new Date(iso); return MON[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0') + ', ' + d.getFullYear(); };
  UI.time = (iso) => { if (!iso) return ''; const d = new Date(iso); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return String(h).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap; };
  UI.dateTime = (iso) => UI.date(iso) + ' ' + UI.time(iso);
  UI.isoDay = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  UI.initials = (name) => String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const AV_COLORS = ['#1a56db', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777', '#4f46e5'];
  UI.avatar = (u, size) => {
    if (!u) return '<span class="avatar" style="background:#94a3b8">' + icon('settings') + '</span>';
    const c = AV_COLORS[(u.name.charCodeAt(0) + u.name.length) % AV_COLORS.length];
    return '<span class="avatar ' + (size || '') + '" style="background:' + c + '">' + UI.initials(u.name) + '</span>';
  };

  UI.STATUS_CLASS = {
    'Draft': 'gray', 'Pending Approval': 'amber', 'Supply Chain Review': 'violet', 'For Release': 'teal', 'Released': 'blue', 'Approved': 'green',
    'Returned': 'amber', 'Rejected': 'red', 'Cancelled': 'gray', 'Active': 'green', 'Inactive': 'red', 'Locked': 'gray', 'Draft ': 'amber',
    'Low Stock': 'red', 'Out of Stock': 'red', 'Within Budget': 'green', 'Near Limit': 'amber', 'Critical': 'orange', 'Over Budget': 'red',
    'Normal': 'blue', 'Urgent': 'red', 'Open': 'green', 'Closed': 'gray', 'Required': 'blue', 'Automatic': 'green', 'Optional': 'gray',
    'Consumable': 'green', 'Asset': 'blue', 'Administrator': 'blue', 'Approver': 'amber', 'Supply Chain': 'teal', 'Requestor': 'violet',
  };
  UI.badge = (text, cls) => '<span class="badge ' + (cls || UI.STATUS_CLASS[text] || 'gray') + '">' + UI.esc(text) + '</span>';
  UI.priority = (p) => '<span class="badge bdot ' + (p === 'Urgent' ? 'red' : 'blue') + '">' + UI.esc(p) + '</span>';

  UI.thumb = (item, size) => {
    const st = ERS.CAT_STYLE[(item && item.category) || 'Others'] || ERS.CAT_STYLE.Others;
    return '<span class="thumb ' + (size || '') + '" style="background:' + st.bg + '">' + st.emoji + '</span>';
  };
  UI.catBadge = (c) => { const st = ERS.CAT_STYLE[c] || ERS.CAT_STYLE.Others; return '<span class="badge" style="color:' + st.color + ';background:' + st.bg + ';border-color:' + st.color + '33">' + UI.esc(c) + '</span>'; };
  UI.stockStatus = (i) => (i.status !== 'Active' ? 'Inactive' : i.stock <= 0 ? 'Out of Stock' : i.stock < i.minStock ? 'Low Stock' : 'Active');

  UI.statCard = (o) => `
    <div class="card stat">
      <div class="stat-ico ${o.color || 'blue'}">${icon(o.icon)}</div>
      <div class="stat-body">
        <div class="stat-label">${o.label}</div>
        <div class="stat-value" title="${String(o.value).replace(/<[^>]+>/g, '')}">${o.value}</div>
        <div class="stat-sub">${o.sub || ''}</div>
        ${o.link ? `<a class="link small" href="${o.link}">View all ${icon('chevronRight')}</a>` : ''}
      </div>
    </div>`;

  UI.empty = (title, sub, ico) => `<div class="empty">${icon(ico || 'box')}<div class="empty-title">${title}</div><div class="empty-sub">${sub || ''}</div></div>`;

  UI.options = (list, selected, placeholder) => (placeholder != null ? `<option value="">${UI.esc(placeholder)}</option>` : '') +
    list.map((o) => { const v = typeof o === 'object' ? o.value : o; const l = typeof o === 'object' ? o.label : o; return `<option value="${UI.esc(v)}" ${String(v) === String(selected) ? 'selected' : ''}>${UI.esc(l)}</option>`; }).join('');

  UI.toggle = (name, on, attrs) => `<label class="switch"><input type="checkbox" ${attrs || ''} data-key="${name}" ${on ? 'checked' : ''}><span></span></label>`;

  /* ---------- toast ---------- */
  UI.toast = function (msg, type) {
    const root = document.getElementById('toastRoot');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'success');
    el.innerHTML = icon(type === 'error' ? 'xCircle' : type === 'warn' ? 'alert' : 'checkCircle') + '<span>' + UI.esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3200);
  };

  /* ---------- modal ---------- */
  UI.modal = function (o) {
    const root = document.getElementById('modalRoot');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${o.size || ''}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h3>${o.title}</h3>${o.subtitle ? `<p class="muted">${o.subtitle}</p>` : ''}</div>
          <button class="icon-btn" data-close title="Close">${icon('x')}</button>
        </div>
        <div class="modal-body">${o.body || ''}</div>
        ${o.footer !== false ? `<div class="modal-foot">${o.footer || `<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" data-ok>${o.okText || 'Save'}</button>`}</div>` : ''}
      </div>`;
    root.appendChild(wrap);
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    const el = wrap.querySelector('.modal');
    const ok = wrap.querySelector('[data-ok]');
    if (ok && o.onOk) ok.addEventListener('click', () => { if (o.onOk(el) !== false) close(); });
    if (o.onMount) o.onMount(el, close);
    const first = el.querySelector('input:not([type=checkbox]):not([readonly]),select,textarea');
    if (first) setTimeout(() => first.focus(), 30);
    return { el, close };
  };

  UI.confirm = function (o) {
    return new Promise((resolve) => {
      let done = false;
      const m = UI.modal({
        title: o.title || 'Please confirm', size: 'sm',
        body: `<p>${o.message}</p>${o.input ? `<div class="field"><label>${o.input}${o.required ? ' <span class="req">*</span>' : ''}</label><textarea id="cfmInput" rows="3" maxlength="250" placeholder="${o.placeholder || ''}"></textarea></div>` : ''}`,
        footer: `<button class="btn btn-outline" data-close>Cancel</button><button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-ok>${o.okText || 'Confirm'}</button>`,
        onOk: (el) => {
          const v = o.input ? el.querySelector('#cfmInput').value.trim() : true;
          if (o.input && o.required && !v) { UI.fieldError(el.querySelector('#cfmInput'), 'This field is required.'); return false; }
          done = true; resolve(v);
        },
      });
      const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) resolve(null); } });
      obs.observe(document.getElementById('modalRoot'), { childList: true });
    });
  };

  UI.fieldError = function (input, msg) {
    input.classList.add('invalid');
    let e = input.parentElement.querySelector('.err');
    if (!e) { e = document.createElement('div'); e.className = 'err'; input.parentElement.appendChild(e); }
    e.textContent = msg;
    input.addEventListener('input', () => { input.classList.remove('invalid'); e.remove(); }, { once: true });
    input.focus();
  };

  /** Reads all [name] fields in a container into an object. */
  UI.formData = function (el) {
    const o = {};
    el.querySelectorAll('[name]').forEach((f) => { o[f.name] = f.type === 'checkbox' ? f.checked : f.value.trim(); });
    return o;
  };
  /** Validates [required] fields; returns true when ok. */
  UI.validate = function (el) {
    let ok = true;
    el.querySelectorAll('[required]').forEach((f) => { if (ok && !String(f.value).trim()) { UI.fieldError(f, 'This field is required.'); ok = false; } });
    return ok;
  };

  /* ---------- dropdown menus (3-dot) ---------- */
  UI.menu = function (anchor, items) {
    document.querySelectorAll('.pop-menu').forEach((m) => m.remove());
    const m = document.createElement('div');
    m.className = 'pop-menu';
    m.innerHTML = items.map((it, i) => `<button data-i="${i}" class="${it.danger ? 'danger' : ''}">${icon(it.icon || 'chevronRight')}${UI.esc(it.label)}</button>`).join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const top = Math.min(r.bottom + 4, window.innerHeight - m.offsetHeight - 8);
    m.style.top = top + window.scrollY + 'px';
    m.style.left = Math.max(8, r.right - m.offsetWidth) + window.scrollX + 'px';
    m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; m.remove(); items[b.dataset.i].onClick(); });
    setTimeout(() => document.addEventListener('mousedown', function h(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', h); } }), 0);
  };

  /* ---------- pagination ---------- */
  UI.paginate = (list, page, per) => { const pages = Math.max(1, Math.ceil(list.length / per)); const p = Math.min(Math.max(1, page), pages); return { rows: list.slice((p - 1) * per, p * per), page: p, pages, from: list.length ? (p - 1) * per + 1 : 0, to: Math.min(p * per, list.length), total: list.length }; };
  UI.pager = function (pg, noun) {
    const btn = (p, label, dis, act) => `<button class="pg ${act ? 'active' : ''}" data-page="${p}" ${dis ? 'disabled' : ''}>${label}</button>`;
    let nums = [];
    for (let i = 1; i <= pg.pages; i++) if (i === 1 || i === pg.pages || Math.abs(i - pg.page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    return `<div class="pager"><span class="muted">Showing ${pg.from} to ${pg.to} of ${pg.total} ${noun || 'records'}</span>
      <div class="pg-btns">${btn(pg.page - 1, icon('chevronLeft'), pg.page <= 1)}${nums.map((n) => (n === '…' ? '<span class="pg-gap">…</span>' : btn(n, n, false, n === pg.page))).join('')}${btn(pg.page + 1, icon('chevronRight'), pg.page >= pg.pages)}</div></div>`;
  };
  UI.bindPager = (root, cb) => root.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => cb(Number(b.dataset.page))));

  /* ---------- CSV ---------- */
  UI.downloadCSV = function (filename, rows) {
    const csv = rows.map((r) => r.map((v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    UI.downloadFile(filename, '﻿' + csv, 'text/csv;charset=utf-8');
  };
  UI.downloadFile = function (filename, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  UI.parseCSV = function (text) {
    const rows = []; let row = [], cur = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ''));
  };

  /* ---------- charts (SVG) ---------- */
  UI.COLORS = { blue: '#1a56db', green: '#16a34a', amber: '#f59e0b', red: '#ef4444', violet: '#7c3aed', teal: '#0d9488', gray: '#cbd5e1', sky: '#3b82f6', orange: '#f97316', cyan: '#06b6d4', pink: '#db2777' };

  UI.donut = function (segs, o) {
    o = o || {};
    const size = o.size || 160, th = o.thickness || 22, r = (size - th) / 2, c = 2 * Math.PI * r;
    const total = segs.reduce((s, x) => s + x.value, 0);
    let off = 0;
    const arcs = total ? segs.filter((s) => s.value > 0).map((s) => {
      const len = (s.value / total) * c;
      const gap = segs.filter((x) => x.value > 0).length > 1 ? Math.min(2, len / 3) : 0;
      const a = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${th}" stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"><title>${UI.esc(s.label)}: ${s.value}</title></circle>`;
      off += len; return a;
    }).join('') : `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="${th}"/>`;
    return `<svg class="donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${arcs}
      ${o.center ? `<text x="50%" y="${o.centerSub ? '47%' : '53%'}" text-anchor="middle" class="donut-c">${o.center}</text>` : ''}
      ${o.centerSub ? `<text x="50%" y="62%" text-anchor="middle" class="donut-s">${o.centerSub}</text>` : ''}</svg>`;
  };
  UI.legend = (segs, fmt) => {
    const total = segs.reduce((s, x) => s + x.value, 0) || 1;
    return `<ul class="legend">${segs.map((s) => `<li><span class="dot" style="background:${s.color}"></span><span class="lg-l">${UI.esc(s.label)}</span><span class="lg-v">${fmt ? fmt(s.value) : s.value} <span class="muted">(${Math.round((s.value / total) * 100)}%)</span></span></li>`).join('')}</ul>`;
  };

  /** series: [{label,color,values:[]}] labels: [] */
  UI.lineChart = function (series, labels, o) {
    o = o || {};
    const W = o.width || 640, H = o.height || 240, pl = 40, pr = 16, pt = 24, pb = 30;
    const all = series.flatMap((s) => s.values);
    let max = Math.max(1, ...all);
    if (o.max) max = o.max; else { const mag = Math.pow(10, Math.floor(Math.log10(max))); max = Math.ceil(max / mag) * mag; if (max / mag <= 2) max = Math.ceil((Math.max(...all) * 1.15) / (mag / 2)) * (mag / 2) || 1; }
    const iw = W - pl - pr, ih = H - pt - pb;
    const x = (i) => pl + (labels.length > 1 ? (i * iw) / (labels.length - 1) : iw / 2);
    const y = (v) => pt + ih - (v / max) * ih;
    let grid = '';
    for (let g = 0; g <= 4; g++) { const v = (max / 4) * g; grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${o.yFmt ? o.yFmt(v) : Math.round(v)}</text>`; }
    const xl = labels.map((l, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="axis">${l}</text>`).join('');
    const lines = series.map((s, si) => {
      const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
      const area = si === 0 && o.area !== false ? `<polygon points="${x(0)},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}" fill="${s.color}" opacity=".08"/>` : '';
      const dots = s.values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${labels[i]}: ${o.vFmt ? o.vFmt(v) : v}</title></circle>${o.labels !== false && series.length === 1 ? `<text x="${x(i)}" y="${y(v) - 10}" text-anchor="middle" class="pt-l">${o.vFmt ? o.vFmt(v) : v}</text>` : ''}`).join('');
      return area + `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>` + dots;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}${xl}${lines}</svg>`;
  };

  UI.gauge = function (pct, color) {
    const p = Math.max(0, Math.min(100, pct));
    const R = 80, cx = 100, cy = 95;
    const pt = (a) => [cx + R * Math.cos(Math.PI - a), cy - R * Math.sin(Math.PI - a)];
    const [x2, y2] = pt((p / 100) * Math.PI);
    return `<svg viewBox="0 0 200 110" class="gauge"><path d="M20 95 A80 80 0 0 1 180 95" fill="none" stroke="#e5e7eb" stroke-width="16" stroke-linecap="round"/>
      ${p > 0 ? `<path d="M20 95 A80 80 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"/>` : ''}</svg>`;
  };

  UI.bar = (pct, color) => `<div class="bar"><span style="width:${Math.max(0, Math.min(100, pct))}%;background:${color || UI.COLORS.blue}"></span></div>`;

  UI.healthColor = (h) => ({ 'Within Budget': UI.COLORS.green, 'Near Limit': UI.COLORS.amber, 'Critical': UI.COLORS.orange, 'Over Budget': UI.COLORS.red }[h] || UI.COLORS.blue);

  /* Workflow stepper for a request. */
  UI.stepper = function (q, compact) {
    const steps = [
      { key: 'Pending Approval', label: 'For Approval', sub: 'Supervisor approval', icon: 'fileText' },
      { key: 'Supply Chain Review', label: 'Supply Chain Review', sub: 'Stock & sourcing check', icon: 'clipboardCheck' },
      { key: 'For Release', label: 'For Release', sub: 'Ready for pick-up', icon: 'truck' },
      { key: 'Released', label: 'Completed', sub: 'Items released', icon: 'checkCircle' },
    ];
    const order = steps.map((s) => s.key);
    let idx = order.indexOf(q.status);
    const stopped = ['Rejected', 'Cancelled', 'Returned'].includes(q.status);
    if (stopped) {
      const acts = q.history.map((h) => h.action);
      idx = acts.includes('Reviewed') ? 2 : acts.includes('Approved') ? 1 : 0;
    }
    if (q.status === 'Draft') idx = -1;
    const when = (action) => { const h = [...q.history].reverse().find((x) => x.action === action); return h ? UI.date(h.date) : ''; };
    const doneDates = [when('Approved'), when('Reviewed'), when('Released'), when('Released')];
    return `<div class="stepper ${compact ? 'compact' : ''}">${steps.map((s, i) => {
      let st = 'todo', sub = 'Pending';
      if (q.status === 'Released' || i < idx) { st = 'done'; sub = doneDates[i] || 'Done'; }
      else if (i === idx) {
        if (stopped) { st = 'stop'; sub = q.status === 'Returned' ? 'Returned for changes' : q.status; }
        else { st = 'current'; sub = i === 0 ? 'Waiting for supervisor approval' : i === 1 ? 'Waiting for Supply Chain' : 'Waiting for release'; }
      }
      return `<div class="step ${st}"><span class="step-ico">${icon(st === 'done' ? 'check' : st === 'stop' ? 'x' : s.icon)}</span><div><div class="step-l">${s.label}</div><div class="step-s">${sub}</div></div></div>`;
    }).join('<span class="step-line"></span>')}</div>`;
  };

  UI.historyModal = function (q) {
    const rows = q.history.length ? q.history.slice().reverse().map((h) => `
      <div class="tl-item"><span class="tl-dot ${/Reject|Cancel/.test(h.action) ? 'red' : /Return/.test(h.action) ? 'amber' : 'blue'}"></span>
        <div><div><strong>${UI.esc(h.action)}</strong> by ${UI.esc(ERS.userName(h.userId))}</div>
        <div class="muted small">${UI.dateTime(h.date)}</div>${h.remarks ? `<div class="tl-remark">“${UI.esc(h.remarks)}”</div>` : ''}</div></div>`).join('') : UI.empty('No history yet', 'This request has not been submitted.', 'history');
    UI.modal({ title: 'Request History', subtitle: UI.esc(q.no || q.draftNo), body: `<div class="timeline">${rows}</div>`, footer: '<button class="btn btn-primary" data-close>Close</button>' });
  };

  /** Read-only items table for a request. */
  UI.itemsTable = function (q, compact) {
    return `<div class="table-wrap"><table class="table ${compact ? 'compact' : ''}"><thead><tr><th>#</th><th>Item</th>${compact ? '' : '<th>Category</th>'}<th class="r">Qty</th><th>Unit</th><th class="r">Unit Cost</th><th class="r">Total</th></tr></thead><tbody>
      ${q.items.map((l, i) => `<tr><td>${i + 1}</td><td><div class="item-cell">${UI.thumb(l, 'sm')}<div><div class="strong">${UI.esc(l.name)}</div><div class="muted small">${UI.esc(l.code || '')}${l.brand ? ' · ' + UI.esc(l.brand) : ''}</div>${l.remarks ? `<div class="muted small">${UI.esc(l.remarks)}</div>` : ''}</div></div></td>${compact ? '' : `<td>${UI.esc(l.category)}</td>`}<td class="r">${UI.num(l.qty)}</td><td>${UI.esc(l.unit)}</td><td class="r">${UI.money(l.cost)}</td><td class="r strong">${UI.money(l.cost * l.qty)}</td></tr>`).join('')}
      </tbody></table></div>`;
  };

  /** Compact item list for narrow side panels. */
  UI.itemsList = function (q) {
    return `<div class="item-list">${q.items.map((l) => `<div class="item-cell" style="padding:8px 0;border-bottom:1px solid var(--border)">${UI.thumb(l, 'sm')}<div style="flex:1;min-width:0"><div class="strong">${UI.esc(l.name)}</div><div class="muted small">${UI.esc(l.code)} · ${UI.num(l.qty)} ${UI.esc(l.unit)} × ${UI.money(l.cost)}</div></div><div class="strong nowrap">${UI.money(l.cost * l.qty)}</div></div>`).join('')}</div>`;
  };

  /** Fills [data-icon] placeholders. */
  UI.hydrateIcons = (root) => (root || document).querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); el.removeAttribute('data-icon'); });

  UI.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 200); }; };
})();
