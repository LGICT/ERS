/* ERS data store: seed data, persistence (browser localStorage) and business rules. */
(function () {
  const DB_KEY = 'ers.db.v1';
  const ERS = (window.ERS = {});

  /* ---------- helpers ---------- */
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  ERS.uid = uid;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMins = (d, n) => new Date(new Date(d).getTime() + n * 60000);

  ERS.CATEGORIES = ['Office Supplies', 'ICT Supplies', 'Cleaning Supplies', 'PPE', 'Tools', 'ICT Assets', 'Others'];
  ERS.UNITS = ['pc', 'pcs', 'ream', 'box', 'pack', 'pad', 'bottle', 'roll', 'set', 'unit', 'pair', 'gallon'];
  ERS.ROLES = ['Administrator', 'Approver', 'Supply Chain', 'Requestor'];
  ERS.STATUSES = ['Draft', 'Pending Approval', 'Supply Chain Review', 'For Release', 'Released', 'Returned', 'Rejected', 'Cancelled'];
  ERS.OPEN_STATUSES = ['Pending Approval', 'Supply Chain Review', 'For Release'];
  ERS.CAT_STYLE = {
    'Office Supplies': { emoji: '📄', color: '#1a56db', bg: '#e8effd' },
    'ICT Supplies': { emoji: '🖱️', color: '#7c3aed', bg: '#f1eafe' },
    'Cleaning Supplies': { emoji: '🧴', color: '#d97706', bg: '#fef3e2' },
    'PPE': { emoji: '🦺', color: '#059669', bg: '#e6f6ef' },
    'Tools': { emoji: '🔧', color: '#dc2626', bg: '#fdecec' },
    'ICT Assets': { emoji: '💻', color: '#0891b2', bg: '#e3f5f9' },
    'Others': { emoji: '📦', color: '#64748b', bg: '#eef1f5' },
  };

  /* ---------- seed data ---------- */
  function buildSeed() {
    const r = mulberry(20260812);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const today = new Date();
    const year = today.getFullYear();

    const departments = [
      { id: 'd-ict', name: 'ICT Department', code: 'ICT', head: 'Ralphson Guya', status: 'Active' },
      { id: 'd-fin', name: 'Finance Department', code: 'FIN', head: 'Juan Dela Vega', status: 'Active' },
      { id: 'd-hr', name: 'Human Resources Department', code: 'HR', head: 'Maria Santos', status: 'Active' },
      { id: 'd-ops', name: 'Operations Department', code: 'OPS', head: 'Lito Morales', status: 'Active' },
      { id: 'd-proc', name: 'Procurement Department', code: 'PROC', head: 'Ana Reyes', status: 'Active' },
      { id: 'd-scm', name: 'Supply Chain Department', code: 'SCM', head: 'Noe Dela Cruz', status: 'Active' },
      { id: 'd-legal', name: 'Legal Department', code: 'LEGAL', head: 'Atty. Ramon Lee', status: 'Inactive' },
      { id: 'd-ia', name: 'Internal Audit Department', code: 'IA', head: 'Steven Reyes', status: 'Active' },
    ];
    const costCenters = [
      { id: 'cc-1', name: 'ICT - Administration', code: 'ICT-ADM', deptId: 'd-ict', status: 'Active' },
      { id: 'cc-2', name: 'ICT - Infrastructure', code: 'ICT-INFRA', deptId: 'd-ict', status: 'Active' },
      { id: 'cc-3', name: 'ICT - Projects', code: 'ICT-PROJ', deptId: 'd-ict', status: 'Active' },
      { id: 'cc-4', name: 'Finance - Accounting', code: 'FIN-ACCT', deptId: 'd-fin', status: 'Active' },
      { id: 'cc-5', name: 'Finance - Treasury', code: 'FIN-TREAS', deptId: 'd-fin', status: 'Active' },
      { id: 'cc-6', name: 'HR - Recruitment', code: 'HR-REC', deptId: 'd-hr', status: 'Active' },
      { id: 'cc-7', name: 'HR - Training', code: 'HR-TRN', deptId: 'd-hr', status: 'Active' },
      { id: 'cc-8', name: 'Operations - Mining', code: 'OPS-MIN', deptId: 'd-ops', status: 'Active' },
      { id: 'cc-9', name: 'Operations - Quarry', code: 'OPS-QRY', deptId: 'd-ops', status: 'Active' },
      { id: 'cc-10', name: 'Procurement - General', code: 'PROC-GEN', deptId: 'd-proc', status: 'Active' },
      { id: 'cc-11', name: 'Supply Chain - Warehouse', code: 'SCM-WH', deptId: 'd-scm', status: 'Active' },
      { id: 'cc-12', name: 'Legal - General', code: 'LEGAL-GEN', deptId: 'd-legal', status: 'Inactive' },
      { id: 'cc-13', name: 'Internal Audit - General', code: 'IA-GEN', deptId: 'd-ia', status: 'Active' },
    ];
    const users = [
      { id: 'u1', name: 'Ralphson Guya', email: 'ralphson.guya@leonio.com', empNo: 'EMP-00045', deptId: 'd-ict', role: 'Administrator', status: 'Active' },
      { id: 'u2', name: 'Noe Dela Cruz', email: 'noe.delacruz@leonio.com', empNo: 'EMP-00123', deptId: 'd-scm', role: 'Supply Chain', status: 'Active' },
      { id: 'u3', name: 'Maria Santos', email: 'maria.santos@leonio.com', empNo: 'EMP-00234', deptId: 'd-hr', role: 'Approver', status: 'Active' },
      { id: 'u4', name: 'Juan Dela Vega', email: 'juan.delavega@leonio.com', empNo: 'EMP-00321', deptId: 'd-fin', role: 'Approver', status: 'Active' },
      { id: 'u5', name: 'Steven Reyes', email: 'steven.reyes@leonio.com', empNo: 'EMP-00088', deptId: 'd-ia', role: 'Requestor', status: 'Inactive' },
      { id: 'u6', name: 'Bon Cayanan', email: 'bon.cayanan@leonio.com', empNo: 'EMP-00178', deptId: 'd-ict', role: 'Approver', status: 'Active' },
      { id: 'u7', name: 'Ana Reyes', email: 'ana.reyes@leonio.com', empNo: 'EMP-00456', deptId: 'd-proc', role: 'Requestor', status: 'Locked' },
      { id: 'u8', name: 'Lito Morales', email: 'lito.morales@leonio.com', empNo: 'EMP-00567', deptId: 'd-ops', role: 'Approver', status: 'Active' },
      { id: 'u9', name: 'John Dela Cruz', email: 'john.delacruz@leonio.com', empNo: 'EMP-00611', deptId: 'd-fin', role: 'Requestor', status: 'Active' },
      { id: 'u10', name: 'Jane Reyes', email: 'jane.reyes@leonio.com', empNo: 'EMP-00702', deptId: 'd-hr', role: 'Requestor', status: 'Active' },
      { id: 'u11', name: 'Carlo Mendoza', email: 'carlo.mendoza@leonio.com', empNo: 'EMP-00733', deptId: 'd-ops', role: 'Requestor', status: 'Active' },
      { id: 'u12', name: 'Liza Ramos', email: 'liza.ramos@leonio.com', empNo: 'EMP-00745', deptId: 'd-scm', role: 'Supply Chain', status: 'Active' },
    ];
    users.forEach((u) => (u.lastLogin = addMins(today, -Math.floor(r() * 60 * 24 * 10)).toISOString()));

    let n = 0;
    const it = (cat, code, name, desc, unit, cost, stock, min, type, supplier) => ({
      id: 'i' + ++n, code, name, desc, category: cat, unit, cost, stock, minStock: min,
      type: type || 'Consumable', supplier: supplier || 'Office Warehouse Inc.', status: 'Active',
    });
    const items = [
      it('Office Supplies', 'ITEM-OS-0001', 'Bond Paper A4', '70gsm, 500 sheets/ream', 'ream', 250, 125, 20),
      it('Office Supplies', 'ITEM-OS-0002', 'Ballpen Blue', 'Smooth writing, 0.5mm', 'pcs', 15, 500, 100),
      it('Office Supplies', 'ITEM-OS-0003', 'Marker Black', 'Permanent marker', 'pcs', 35, 150, 50),
      it('Office Supplies', 'ITEM-OS-0004', 'Sticky Notes 3x3', 'Yellow, 100 sheets/pad', 'pad', 25, 200, 50),
      it('Office Supplies', 'ITEM-OS-0005', 'Staple Wire #35', 'Standard staples', 'box', 45, 80, 20),
      it('Office Supplies', 'ITEM-OS-0006', 'Folder Long', 'Manila, long size', 'pcs', 8, 400, 100),
      it('Office Supplies', 'ITEM-OS-0007', 'Bond Paper Long', '70gsm, 500 sheets/ream', 'ream', 280, 60, 20),
      it('Office Supplies', 'ITEM-OS-0008', 'Ballpen Black', 'Smooth writing, 0.5mm', 'pcs', 15, 350, 100),
      it('Office Supplies', 'ITEM-OS-0009', 'Correction Tape', '5mm x 6m', 'pcs', 55, 90, 30),
      it('Office Supplies', 'ITEM-OS-0010', 'Stapler Heavy Duty', 'Up to 50 sheets', 'pc', 320, 25, 10),
      it('Office Supplies', 'ITEM-OS-0011', 'Envelope Long Brown', 'Pack of 50', 'pack', 120, 45, 15),
      it('ICT Supplies', 'ITEM-ICT-0001', 'Toner HP 85A', 'For HP LaserJet P1102', 'pc', 2500, 12, 5, 'Consumable', 'PC Express Inc.'),
      it('ICT Supplies', 'ITEM-ICT-0002', 'Logitech Wireless Mouse M185', 'Reliable wireless mouse with 12-month battery life', 'pcs', 650, 45, 10, 'Consumable', 'PC Express Inc.'),
      it('ICT Supplies', 'ITEM-ICT-0003', 'Dell Keyboard KB216', 'USB wired keyboard', 'pcs', 550, 32, 10, 'Consumable', 'PC Express Inc.'),
      it('ICT Supplies', 'ITEM-ICT-0004', 'HDMI Cable 2m', 'High speed', 'pcs', 250, 68, 15, 'Consumable', 'PC Express Inc.'),
      it('ICT Supplies', 'ITEM-ICT-0005', 'USB Flash Drive 32GB', 'USB 3.0', 'pcs', 450, 18, 10, 'Consumable', 'PC Express Inc.'),
      it('ICT Supplies', 'ITEM-ICT-0006', 'Epson 003 Ink (Black)', '65ml bottle', 'bottle', 380, 24, 10, 'Consumable', 'PC Express Inc.'),
      it('Cleaning Supplies', 'ITEM-CS-0001', 'Hand Sanitizer 500ml', '70% Alcohol', 'bottle', 120, 40, 50, 'Consumable', 'CleanPro Trading'),
      it('Cleaning Supplies', 'ITEM-CS-0002', 'Disinfectant Spray', '510g aerosol', 'bottle', 280, 36, 15, 'Consumable', 'CleanPro Trading'),
      it('Cleaning Supplies', 'ITEM-CS-0003', 'Trash Bags XL', 'Pack of 10', 'pack', 95, 70, 20, 'Consumable', 'CleanPro Trading'),
      it('Cleaning Supplies', 'ITEM-CS-0004', 'Tissue Roll', '2-ply', 'roll', 18, 300, 100, 'Consumable', 'CleanPro Trading'),
      it('PPE', 'ITEM-PPE-0001', 'Face Mask (50pcs/box)', '3-ply, disposable', 'box', 150, 60, 20, 'Consumable', 'SafeGear PH'),
      it('PPE', 'ITEM-PPE-0002', 'Safety Gloves', 'Nitrile coated', 'pair', 85, 120, 40, 'Consumable', 'SafeGear PH'),
      it('PPE', 'ITEM-PPE-0003', 'Hard Hat', 'ANSI certified', 'pc', 450, 30, 10, 'Consumable', 'SafeGear PH'),
      it('PPE', 'ITEM-PPE-0004', 'Reflective Safety Vest', 'Class 2', 'pc', 220, 8, 15, 'Consumable', 'SafeGear PH'),
      it('Tools', 'ITEM-TL-0001', 'Screwdriver Set', '12-piece', 'set', 480, 14, 5, 'Consumable', 'ToolHub Corp.'),
      it('Tools', 'ITEM-TL-0002', 'Measuring Tape 7.5m', 'Steel blade', 'pc', 160, 22, 8, 'Consumable', 'ToolHub Corp.'),
      it('Tools', 'ITEM-TL-0003', 'Cordless Drill 18V', 'With 2 batteries', 'unit', 3800, 6, 3, 'Asset', 'ToolHub Corp.'),
      it('ICT Assets', 'ICT-LAP-001', 'Dell Latitude 5420', 'i5, 16GB RAM, 512GB SSD', 'unit', 58000, 15, 3, 'Asset', 'Dell Philippines'),
      it('ICT Assets', 'ICT-MON-002', 'Dell 24" Monitor P2422H', 'Full HD IPS', 'unit', 9500, 20, 5, 'Asset', 'Dell Philippines'),
      it('ICT Assets', 'ICT-PRN-001', 'HP LaserJet Pro M404dn', 'Laser printer', 'unit', 18500, 8, 2, 'Asset', 'PC Express Inc.'),
      it('ICT Assets', 'NET-SWT-001', 'Cisco SG250X Switch', '24-port gigabit', 'unit', 35000, 5, 2, 'Asset', 'NetSys Solutions'),
      it('Others', 'ITEM-OT-0001', 'Water Dispenser', 'Hot and cold', 'unit', 6500, 4, 2, 'Asset', 'Appliance Center'),
      it('Others', 'ITEM-OT-0002', 'Ergonomic Office Chair', 'Mesh back', 'unit', 4500, 2, 3, 'Asset', 'Office Warehouse Inc.'),
    ];

    const workflows = [
      { id: 'wf1', code: 'WF-STD-001', name: 'Standard Requisition Workflow', appliesTo: 'Office Supplies, ICT Supplies, Others', status: 'Active', desc: 'Default approval flow for most requisition requests within the approved threshold.',
        steps: [
          { name: 'Supervisor Approval', role: 'Immediate Supervisor / Department Approver', type: 'Required', condition: '-' },
          { name: 'Supply Chain Review', role: 'Supply Chain', type: 'Required', condition: '-' },
          { name: 'For Release', role: 'Supply Chain / Storekeeper', type: 'Automatic', condition: '-' },
        ] },
      { id: 'wf2', code: 'WF-AST-002', name: 'Asset Requisition Workflow', appliesTo: 'ICT Assets, Equipment', status: 'Active', desc: 'Approval flow for capital assets and equipment.',
        steps: [
          { name: 'Supervisor Approval', role: 'Immediate Supervisor', type: 'Required', condition: '-' },
          { name: 'Department Head Approval', role: 'Department Head', type: 'Required', condition: '-' },
          { name: 'Supply Chain Review', role: 'Supply Chain', type: 'Required', condition: '-' },
          { name: 'For Release', role: 'Supply Chain / Storekeeper', type: 'Automatic', condition: '-' },
        ] },
      { id: 'wf3', code: 'WF-HV-003', name: 'High Value Requisition Workflow', appliesTo: 'Above ₱50,000', status: 'Active', desc: 'Additional finance approval for high value requests.',
        steps: [
          { name: 'Supervisor Approval', role: 'Immediate Supervisor', type: 'Required', condition: '-' },
          { name: 'Department Head Approval', role: 'Department Head', type: 'Required', condition: 'Amount ≤ ₱50,000' },
          { name: 'Finance Approval', role: 'Finance Manager', type: 'Required', condition: 'Amount ≤ ₱50,000' },
          { name: 'Final Approval', role: 'Budget Owner / GM', type: 'Required', condition: 'Amount > ₱50,000' },
          { name: 'For Release', role: 'Supply Chain / Storekeeper', type: 'Automatic', condition: '-' },
        ] },
      { id: 'wf4', code: 'WF-EMG-004', name: 'Emergency Purchase Workflow', appliesTo: 'Emergency / Urgent Requests', status: 'Active', desc: 'Fast-track approval for urgent requests.',
        steps: [
          { name: 'Department Head Approval', role: 'Department Head', type: 'Required', condition: '-' },
          { name: 'For Release', role: 'Supply Chain / Storekeeper', type: 'Automatic', condition: '-' },
        ] },
      { id: 'wf5', code: 'WF-CAPEX-005', name: 'Capital Expenditure Workflow', appliesTo: 'CAPEX Items', status: 'Draft', desc: 'Approval flow for capital expenditures.', steps: [
          { name: 'Department Head Approval', role: 'Department Head', type: 'Required', condition: '-' },
          { name: 'Finance Approval', role: 'Finance Manager', type: 'Required', condition: '-' },
          { name: 'Final Approval', role: 'Budget Owner / GM', type: 'Required', condition: '-' },
        ] },
      { id: 'wf6', code: 'WF-SRV-006', name: 'Service Request Workflow', appliesTo: 'Services / Consultancy', status: 'Inactive', desc: 'Approval flow for services.', steps: [
          { name: 'Supervisor Approval', role: 'Immediate Supervisor', type: 'Required', condition: '-' },
        ] },
    ];

    /* ---- historical requests ---- */
    const purposes = {
      'Office Supplies': ['Monthly office supplies replenishment.', 'Office supplies for team operations.', 'Supplies for quarterly reports printing.', 'Request for additional ballpens and paper.'],
      'ICT Supplies': ['Printer toner replacement.', 'Peripherals for new hires.', 'Replacement of defective peripherals.'],
      'Cleaning Supplies': ['Cleaning supplies for office sanitation.', 'Monthly housekeeping supplies.'],
      'PPE': ['PPE for site personnel.', 'Safety gear for site inspection.'],
      'Tools': ['Tools for maintenance team.', 'Replacement tools for field work.'],
      'ICT Assets': ['Laptop for new employee.', 'Workstation upgrade.'],
      'Others': ['Pantry equipment replacement.', 'Furniture for new office area.'],
    };
    const requesters = users.filter((u) => u.status === 'Active');
    const approverFor = (deptId) => (users.find((u) => u.role === 'Approver' && u.deptId === deptId && u.status === 'Active') || users[0]);
    const consumables = items.filter((i) => i.type === 'Consumable');
    const assets = items.filter((i) => i.type === 'Asset');

    const start = new Date(Math.min(new Date(year, 0, 5).getTime(), addDays(today, -120).getTime()));
    const span = Math.max(1, Math.floor((addDays(today, -1) - start) / 86400000));
    const count = 72;
    const dates = [];
    for (let k = 0; k < count; k++) {
      const d = addDays(start, Math.floor(r() * span));
      d.setHours(8 + Math.floor(r() * 9), Math.floor(r() * 60), 0, 0);
      dates.push(d);
    }
    dates.sort((a, b) => a - b);

    const requests = [];
    let seq = 0;
    dates.forEach((d, idx) => {
      const isLast = idx >= count - 9;
      let u = pick(requesters);
      if (idx === count - 1 || idx === count - 7) u = users[0];
      const lines = [];
      const nLines = 1 + Math.floor(r() * 4);
      const useAsset = r() < 0.1;
      const pool = useAsset ? assets : consumables;
      const used = new Set();
      for (let j = 0; j < nLines; j++) {
        const item = pick(pool);
        if (used.has(item.id)) continue;
        used.add(item.id);
        const qty = item.cost >= 5000 ? 1 + Math.floor(r() * 2) : item.cost >= 300 ? 1 + Math.floor(r() * 4) : 2 + Math.floor(r() * 18);
        lines.push({ itemId: item.id, code: item.code, name: item.name, category: item.category, unit: item.unit, cost: item.cost, qty, brand: '', remarks: '' });
      }
      const ageDays = (today - d) / 86400000;
      let status;
      const x = r();
      if (!isLast) {
        if (ageDays > 20) status = x < 0.78 ? 'Released' : x < 0.86 ? 'Rejected' : x < 0.93 ? 'Cancelled' : 'For Release';
        else status = x < 0.5 ? 'Released' : x < 0.65 ? 'For Release' : x < 0.8 ? 'Supply Chain Review' : x < 0.9 ? 'Rejected' : 'Cancelled';
      } else {
        status = ['Released', 'Supply Chain Review', 'For Release', 'Returned', 'Supply Chain Review', 'Pending Approval', 'Pending Approval', 'Pending Approval', 'Pending Approval'][idx - (count - 9)];
      }
      if (idx === count - 1) status = 'Pending Approval';
      const cc = costCenters.find((c) => c.deptId === u.deptId);
      seq++;
      const req = {
        id: 'r' + seq, no: 'REQ-' + d.getFullYear() + '-' + String(seq).padStart(5, '0'),
        requesterId: u.id, deptId: u.deptId, costCenterId: cc ? cc.id : '', date: d.toISOString(),
        purpose: pick(purposes[lines[0].category]), priority: r() < 0.15 ? 'Urgent' : 'Normal',
        items: lines, status, history: [],
      };
      const H = (date, userId, action, remarks) => req.history.push({ date: date.toISOString(), userId, action, remarks: remarks || '' });
      const sup = approverFor(u.deptId);
      const scm = r() < 0.6 ? users[1] : users[11];
      H(d, u.id, 'Submitted');
      const t1 = addMins(d, 60 * (2 + Math.floor(r() * 30)));
      const t2 = addMins(t1, 60 * (2 + Math.floor(r() * 30)));
      const t3 = addMins(t2, 60 * (2 + Math.floor(r() * 40)));
      if (status === 'Rejected') H(t1, sup.id, 'Rejected', pick(['Budget constraints this period.', 'Duplicate of an earlier request.', 'Please use existing stock.']));
      else if (status === 'Cancelled') H(t1, u.id, 'Cancelled', 'No longer needed.');
      else if (status === 'Returned') H(t1, sup.id, 'Returned for Changes', 'Please reduce the quantity and add justification.');
      else if (status !== 'Pending Approval') {
        H(t1, sup.id, 'Approved', '');
        if (status !== 'Supply Chain Review') {
          H(t2, scm.id, 'Reviewed', 'Stock available.');
          if (status === 'Released') H(t3, scm.id, 'Released', 'Items released to requester.');
        }
      }
      requests.push(req);
    });
    // One saved draft for the main user.
    seq++;
    requests.push({
      id: 'r' + seq, no: '', draftNo: 'DRAFT-' + seq, requesterId: 'u1', deptId: 'd-ict', costCenterId: 'cc-1', date: addMins(today, -90).toISOString(),
      purpose: 'Spare peripherals for the help desk.', priority: 'Normal', status: 'Draft', history: [],
      items: [
        { itemId: 'i13', code: 'ITEM-ICT-0002', name: 'Logitech Wireless Mouse M185', category: 'ICT Supplies', unit: 'pcs', cost: 650, qty: 3, brand: 'Logitech', remarks: '' },
        { itemId: 'i15', code: 'ITEM-ICT-0004', name: 'HDMI Cable 2m', category: 'ICT Supplies', unit: 'pcs', cost: 250, qty: 4, brand: '', remarks: '' },
      ],
    });

    /* ---- budget allocations (amount based, PHP) sized to look realistic vs usage ---- */
    const allocations = {};
    const usage = {};
    requests.forEach((q) => {
      if (!['Released', ...ERS.OPEN_STATUSES].includes(q.status)) return;
      if (new Date(q.date).getFullYear() !== year) return;
      q.items.forEach((l) => {
        const k = q.deptId + '|' + l.category;
        usage[k] = (usage[k] || 0) + l.cost * l.qty;
      });
    });
    const base = { 'Office Supplies': 60000, 'ICT Supplies': 80000, 'Cleaning Supplies': 20000, 'PPE': 25000, 'Tools': 30000, 'ICT Assets': 250000, 'Others': 20000 };
    departments.forEach((d) => {
      ERS.CATEGORIES.forEach((c) => {
        const k = d.id + '|' + c;
        const used = usage[k] || 0;
        const target = used > 0 ? used / (0.45 + r() * 0.4) : base[c] * (0.5 + r());
        allocations[k] = Math.max(5000, Math.ceil(target / 5000) * 5000);
      });
    });

    const fiscalPeriods = [];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    months.forEach((m, i) => {
      const s = new Date(year, i, 1), e = new Date(year, i + 1, 0);
      fiscalPeriods.push({ id: 'fp' + (i + 1), name: m + ' ' + year, quarter: 'Q' + (Math.floor(i / 3) + 1), start: s.toISOString(), end: e.toISOString(), status: e < addDays(today, -40) ? 'Closed' : 'Open' });
    });

    const db = {
      version: 1,
      currentUserId: 'u1',
      company: {
        name: 'Leonio Group of Companies', address: '22/F Leonio Tower, 8757 Paseo de Roxas, Makati City, Philippines 1226',
        phone: '(02) 8123-4567', email: 'info@leoniogroup.com', supportPhone: '(02) 8123-4567', supportEmail: 'supplychain@leonio.com',
        timezone: '(GMT+8:00) Asia/Manila', currency: 'PHP - Philippine Peso (₱)',
      },
      prefs: {
        allowCancel: true, allowEditAfterSubmit: false, requireAttachment: false, showBudgetOnForm: true, autoNumber: true,
        requireRejectReason: true, autosave: true, reqPrefix: 'REQ', nextNumber: seq, resetYearly: true,
        defaultDeptId: 'd-ict', defaultCostCenterId: 'cc-1', defaultPriority: 'Normal', itemsPerPage: 10, landingPage: 'dashboard', theme: 'light',
        maxAttachmentMb: 10, fileTypes: '.pdf, .doc, .docx, .xls, .xlsx, .jpg, .png',
      },
      notifPrefs: { email: true, submitted: true, approved: true, rejected: true, released: true, lowBudget: true, requestUpdates: true, approvalNotifs: true, inventory: true, budgetAlerts: true, system: true },
      budgetConfig: {
        fiscalYear: year, startDate: year + '-01-01', endDate: year + '-12-31', currency: 'PHP', controlBasis: 'Amount Based', rounding: 2,
        carryForward: true, levelDept: true, levelCostCenter: true, levelProject: false, levelCategory: true, ownership: 'Department Head', multiLevel: true,
        controlAccount: '5100-00-000 Budget Control', commitmentAccount: '5200-00-000 Purchase Commitment', expenseAccount: '5300-00-000 Actual Expenses',
        warnPct: 80, criticalPct: 95, overBudgetAction: 'Warn',
      },
      departments, costCenters, users, items, workflows, requests,
      allocations: { [year]: allocations },
      fiscalPeriods,
      notifications: [],
      audit: [],
    };

    /* ---- audit trail derived from history ---- */
    requests.forEach((q) => {
      if (q.status === 'Draft') return;
      q.history.forEach((h) => {
        const map = { Submitted: ['Request', 'SUBMIT'], Approved: ['Approval', 'APPROVE'], Reviewed: ['Approval', 'REVIEW'], Released: ['Inventory', 'RELEASE'], Rejected: ['Approval', 'REJECT'], Cancelled: ['Request', 'CANCEL'], 'Returned for Changes': ['Approval', 'RETURN'] };
        const [module, action] = map[h.action] || ['Request', 'UPDATE'];
        db.audit.push({ id: uid('a'), date: h.date, userId: h.userId, module, action, ref: q.no, details: h.action + ' – ' + q.purpose, ip: '192.168.1.' + (20 + Math.floor(r() * 200)), device: 'Windows 11 / Chrome' });
      });
    });
    users.forEach((u) => db.audit.push({ id: uid('a'), date: u.lastLogin, userId: u.id, module: 'Login', action: 'LOGIN', ref: '-', details: 'User logged in to the system.', ip: '192.168.1.' + (20 + Math.floor(r() * 200)), device: 'Windows 11 / Chrome' }));
    db.audit.sort((a, b) => (a.date < b.date ? 1 : -1));

    /* ---- notifications for demo users ---- */
    const recent = requests.filter((q) => q.status !== 'Draft').slice(-12).reverse();
    recent.forEach((q, i) => {
      const last = q.history[q.history.length - 1];
      const n = notificationFor(db, q, last.action);
      n.forEach((x) => db.notifications.push({ ...x, id: uid('n'), date: last.date, read: i > 4 }));
    });
    const lowItem = items.find((i) => i.stock < i.minStock);
    if (lowItem) {
      ['u1', 'u2', 'u12'].forEach((id) => db.notifications.push({ id: uid('n'), userId: id, type: 'inventory', title: 'Low Stock Alert', message: lowItem.name + ' is below the minimum stock level (' + lowItem.stock + ' ' + lowItem.unit + ' left).', link: '#/catalog', date: addMins(today, -300).toISOString(), read: false }));
    }
    db.notifications.push({ id: uid('n'), userId: 'u1', type: 'system', title: 'Welcome to ERS', message: 'The Enterprise Requisition System is ready. Use the profile menu to switch between demo users.', link: '#/dashboard', date: addMins(today, -30).toISOString(), read: false });
    return db;
  }

  /* Build notification records for a request action (without id/date). */
  function notificationFor(db, q, action) {
    const out = [];
    const approvers = db.users.filter((u) => u.status === 'Active' && (u.role === 'Administrator' || (u.role === 'Approver' && u.deptId === q.deptId)));
    const scm = db.users.filter((u) => u.status === 'Active' && (u.role === 'Supply Chain' || u.role === 'Administrator'));
    const req = (title, message, type) => out.push({ userId: q.requesterId, type: type || 'request', title, message, link: '#/my-requests?open=' + q.id });
    const many = (list, title, message) => list.forEach((u) => u.id !== q.requesterId && out.push({ userId: u.id, type: 'approval', title, message, link: '#/approvals?open=' + q.id }));
    if (action === 'Submitted') {
      req('Request Submitted Successfully', 'Your request ' + q.no + ' has been submitted for approval.');
      many(approvers, 'Request Awaiting Approval', 'Request ' + q.no + ' is awaiting your approval.');
    } else if (action === 'Approved') {
      req('Request Approved', 'Your request ' + q.no + ' was approved and forwarded to Supply Chain.');
      many(scm, 'For Supply Chain Review', 'Request ' + q.no + ' is ready for Supply Chain review.');
    } else if (action === 'Reviewed') {
      req('Request Ready for Release', 'Your request ' + q.no + ' passed Supply Chain review and is for release.');
    } else if (action === 'Released') {
      req('Items Released', 'Items for request ' + q.no + ' have been released.', 'inventory');
    } else if (action === 'Rejected') {
      req('Request Rejected', 'Your request ' + q.no + ' was rejected.');
    } else if (action === 'Returned for Changes') {
      req('Changes Requested', 'Your request ' + q.no + ' was returned for changes.');
    } else if (action === 'Cancelled') {
      req('Request Cancelled', 'Your request ' + q.no + ' was cancelled.');
    }
    return out;
  }

  /* ---------- persistence ---------- */
  ERS.load = function () {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) { ERS.db = JSON.parse(raw); return; }
    } catch (e) { console.warn('Could not read saved data', e); }
    ERS.db = buildSeed();
    ERS.save();
  };
  ERS.save = function () {
    try { localStorage.setItem(DB_KEY, JSON.stringify(ERS.db)); }
    catch (e) { console.warn('Could not save data', e); }
  };
  ERS.reset = function () { ERS.db = buildSeed(); ERS.save(); };
  ERS.importData = function (obj) {
    if (!obj || !Array.isArray(obj.requests) || !Array.isArray(obj.users)) throw new Error('This file is not a valid ERS backup.');
    ERS.db = obj; ERS.save();
  };

  /* ---------- lookups ---------- */
  ERS.me = () => ERS.db.users.find((u) => u.id === ERS.db.currentUserId) || ERS.db.users[0];
  ERS.user = (id) => ERS.db.users.find((u) => u.id === id);
  ERS.dept = (id) => ERS.db.departments.find((d) => d.id === id);
  ERS.cc = (id) => ERS.db.costCenters.find((c) => c.id === id);
  ERS.item = (id) => ERS.db.items.find((i) => i.id === id);
  ERS.req = (id) => ERS.db.requests.find((q) => q.id === id);
  ERS.deptName = (id) => (ERS.dept(id) || {}).name || '-';
  ERS.userName = (id) => (id === 'system' ? 'System' : (ERS.user(id) || {}).name || '-');
  ERS.reqTotal = (q) => q.items.reduce((s, l) => s + l.cost * l.qty, 0);
  ERS.reqQty = (q) => q.items.reduce((s, l) => s + Number(l.qty), 0);
  ERS.year = () => Number(ERS.db.budgetConfig.fiscalYear) || new Date().getFullYear();

  /* ---------- audit & notifications ---------- */
  ERS.log = function (module, action, ref, details, userId) {
    ERS.db.audit.unshift({ id: uid('a'), date: new Date().toISOString(), userId: userId || ERS.db.currentUserId, module, action, ref: ref || '-', details, ip: '192.168.1.25', device: navigator.userAgent.includes('Edg') ? 'Windows / Edge' : 'Windows / Chrome' });
  };
  ERS.notify = function (list) {
    const now = new Date().toISOString();
    list.forEach((n) => ERS.db.notifications.unshift({ ...n, id: uid('n'), date: now, read: false }));
  };
  ERS.myNotifications = () => ERS.db.notifications.filter((n) => n.userId === ERS.db.currentUserId).sort((a, b) => (a.date < b.date ? 1 : -1));
  ERS.unreadCount = () => ERS.myNotifications().filter((n) => !n.read).length;

  /* ---------- budget ---------- */
  ERS.allocation = function (deptId, category, year) {
    const y = year || ERS.year();
    const a = (ERS.db.allocations[y] || {});
    return Number(a[deptId + '|' + category] || 0);
  };
  ERS.setAllocation = function (deptId, category, amount, year) {
    const y = year || ERS.year();
    ERS.db.allocations[y] = ERS.db.allocations[y] || {};
    ERS.db.allocations[y][deptId + '|' + category] = Number(amount) || 0;
  };
  /** Budget numbers for a department (optionally one category). excludeReqId leaves one request out of the "committed" figure. */
  ERS.budget = function (deptId, category, year, excludeReqId) {
    const y = year || ERS.year();
    const cats = category ? [category] : ERS.CATEGORIES;
    let allocated = 0, consumed = 0, committed = 0;
    cats.forEach((c) => (allocated += ERS.allocation(deptId, c, y)));
    ERS.db.requests.forEach((q) => {
      if (q.deptId !== deptId || q.id === excludeReqId) return;
      if (new Date(q.date).getFullYear() !== y) return;
      const isConsumed = q.status === 'Released';
      const isCommitted = ERS.OPEN_STATUSES.includes(q.status);
      if (!isConsumed && !isCommitted) return;
      q.items.forEach((l) => {
        if (!cats.includes(l.category)) return;
        const v = l.cost * l.qty;
        if (isConsumed) consumed += v; else committed += v;
      });
    });
    const remaining = allocated - consumed - committed;
    const usedPct = allocated ? ((consumed + committed) / allocated) * 100 : 0;
    const cfg = ERS.db.budgetConfig;
    const health = remaining < 0 ? 'Over Budget' : usedPct >= cfg.criticalPct ? 'Critical' : usedPct >= cfg.warnPct ? 'Near Limit' : 'Within Budget';
    return { allocated, consumed, committed, remaining, usedPct, health };
  };
  /** Checks a set of lines against the department budget. Returns per-category impact rows. */
  ERS.budgetImpact = function (deptId, lines, excludeReqId) {
    const byCat = {};
    lines.forEach((l) => (byCat[l.category] = (byCat[l.category] || 0) + l.cost * l.qty));
    return Object.keys(byCat).map((c) => {
      const b = ERS.budget(deptId, c, null, excludeReqId);
      const after = b.remaining - byCat[c];
      return { category: c, request: byCat[c], ...b, after, over: after < 0 };
    });
  };

  /* ---------- permissions ---------- */
  ERS.canApproveStage = function (user, q) {
    if (!user || user.status !== 'Active') return false;
    if (q.status === 'Pending Approval') return user.role === 'Administrator' || (user.role === 'Approver' && user.deptId === q.deptId);
    if (q.status === 'Supply Chain Review' || q.status === 'For Release') return user.role === 'Supply Chain' || user.role === 'Administrator';
    return false;
  };
  ERS.isAdmin = () => ERS.me().role === 'Administrator';

  /* ---------- request lifecycle ---------- */
  function nextReqNo() {
    const p = ERS.db.prefs;
    const y = new Date().getFullYear();
    let n = Number(p.nextNumber) || 1;
    let no;
    do { no = (p.reqPrefix || 'REQ') + '-' + y + '-' + String(n).padStart(5, '0'); n++; } while (ERS.db.requests.some((q) => q.no === no));
    p.nextNumber = n;
    return no;
  }
  ERS.previewReqNo = function () {
    const p = ERS.db.prefs;
    return (p.reqPrefix || 'REQ') + '-' + new Date().getFullYear() + '-' + String(Number(p.nextNumber) || 1).padStart(5, '0');
  };

  /** Save a draft or submit. data = {id?, purpose, priority, costCenterId, items}. Returns the request. */
  ERS.saveRequest = function (data, submit) {
    const me = ERS.me();
    let q = data.id ? ERS.req(data.id) : null;
    const now = new Date().toISOString();
    if (!q) {
      q = { id: uid('r'), no: '', draftNo: 'DRAFT-' + Date.now().toString().slice(-5), requesterId: me.id, deptId: me.deptId, costCenterId: data.costCenterId || '', date: now, purpose: '', priority: 'Normal', items: [], status: 'Draft', history: [] };
      ERS.db.requests.push(q);
    }
    q.purpose = data.purpose; q.priority = data.priority || 'Normal'; q.costCenterId = data.costCenterId || q.costCenterId;
    q.items = data.items.map((l) => ({ ...l, qty: Number(l.qty), cost: Number(l.cost) }));
    if (submit) {
      const wasReturned = q.status === 'Returned';
      if (!q.no) q.no = nextReqNo();
      q.date = now;
      q.status = 'Pending Approval';
      q.history.push({ date: now, userId: me.id, action: wasReturned ? 'Resubmitted' : 'Submitted', remarks: '' });
      ERS.log('Request', 'SUBMIT', q.no, (wasReturned ? 'Request resubmitted' : 'Request submitted for approval') + ' – ' + ERS.money(ERS.reqTotal(q)));
      ERS.notify(notificationFor(ERS.db, q, 'Submitted'));
      checkBudgetAlerts(q);
    } else {
      if (q.status !== 'Returned') q.status = 'Draft';
      ERS.log('Request', 'SAVE DRAFT', q.no || q.draftNo, 'Draft saved with ' + q.items.length + ' item(s).');
    }
    ERS.save();
    return q;
  };

  function checkBudgetAlerts(q) {
    const cats = [...new Set(q.items.map((l) => l.category))];
    if (!ERS.db.notifPrefs.lowBudget) return;
    cats.forEach((c) => {
      const b = ERS.budget(q.deptId, c);
      if (b.usedPct >= ERS.db.budgetConfig.warnPct) {
        const who = ERS.db.users.filter((u) => u.status === 'Active' && (u.role === 'Administrator' || (u.role === 'Approver' && u.deptId === q.deptId)));
        ERS.notify(who.map((u) => ({ userId: u.id, type: 'budget', title: 'Budget Threshold Alert', message: 'The ' + ERS.deptName(q.deptId) + ' ' + c + ' budget has reached ' + Math.round(b.usedPct) + '% of the allocated amount.', link: '#/budget' })));
      }
    });
  }

  ERS.act = function (id, action, remarks) {
    const q = ERS.req(id);
    const me = ERS.me();
    const now = new Date().toISOString();
    const H = (a) => q.history.push({ date: now, userId: me.id, action: a, remarks: remarks || '' });
    if (action === 'approve') {
      if (!ERS.canApproveStage(me, q)) throw new Error('You are not allowed to act on this request at its current stage.');
      if (q.status === 'Pending Approval') { q.status = 'Supply Chain Review'; H('Approved'); ERS.log('Approval', 'APPROVE', q.no, 'Supervisor approval granted.'); ERS.notify(notificationFor(ERS.db, q, 'Approved')); }
      else if (q.status === 'Supply Chain Review') { q.status = 'For Release'; H('Reviewed'); ERS.log('Approval', 'REVIEW', q.no, 'Supply Chain review completed.'); ERS.notify(notificationFor(ERS.db, q, 'Reviewed')); }
      else if (q.status === 'For Release') {
        q.status = 'Released'; H('Released');
        const low = [];
        q.items.forEach((l) => {
          const item = ERS.item(l.itemId);
          if (item) { item.stock = Math.max(0, item.stock - l.qty); if (item.stock < item.minStock) low.push(item); }
        });
        ERS.log('Inventory', 'RELEASE', q.no, 'Items released; inventory deducted for ' + q.items.length + ' item(s).');
        ERS.notify(notificationFor(ERS.db, q, 'Released'));
        if (low.length && ERS.db.notifPrefs.inventory) {
          const scm = ERS.db.users.filter((u) => u.status === 'Active' && (u.role === 'Supply Chain' || u.role === 'Administrator'));
          low.forEach((it) => ERS.notify(scm.map((u) => ({ userId: u.id, type: 'inventory', title: 'Low Stock Alert', message: it.name + ' is below the minimum stock level (' + it.stock + ' ' + it.unit + ' left).', link: '#/catalog' }))));
        }
      }
    } else if (action === 'reject') {
      if (!ERS.canApproveStage(me, q)) throw new Error('You are not allowed to act on this request.');
      q.status = 'Rejected'; H('Rejected'); ERS.log('Approval', 'REJECT', q.no, 'Request rejected. ' + (remarks || ''));
      ERS.notify(notificationFor(ERS.db, q, 'Rejected'));
    } else if (action === 'return') {
      if (!ERS.canApproveStage(me, q)) throw new Error('You are not allowed to act on this request.');
      q.status = 'Returned'; H('Returned for Changes'); ERS.log('Approval', 'RETURN', q.no, 'Returned to requester for changes. ' + (remarks || ''));
      ERS.notify(notificationFor(ERS.db, q, 'Returned for Changes'));
    } else if (action === 'cancel') {
      q.status = 'Cancelled'; H('Cancelled'); ERS.log('Request', 'CANCEL', q.no || q.draftNo, 'Request cancelled. ' + (remarks || ''));
      if (q.no) ERS.notify(notificationFor(ERS.db, q, 'Cancelled'));
    } else if (action === 'delete-draft') {
      ERS.db.requests = ERS.db.requests.filter((x) => x.id !== id);
      ERS.log('Request', 'DELETE', q.draftNo, 'Draft deleted.');
    }
    ERS.save();
    return q;
  };

  ERS.switchUser = function (id) {
    ERS.db.currentUserId = id;
    const u = ERS.me();
    u.lastLogin = new Date().toISOString();
    ERS.log('Login', 'LOGIN', '-', 'User logged in to the system.', id);
    ERS.save();
  };

  ERS.money = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  ERS.load();
})();
