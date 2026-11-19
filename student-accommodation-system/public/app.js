/* Student Accommodation Management System - front end (vanilla JS) */
const API = '/api';

// ---------- helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => new Intl.NumberFormat('en-UG').format(n ?? 0) + ' UGX';
const dateOnly = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

async function api(path, options = {}) {
  const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
  return body;
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

const badge = (v) => (v ? `<span class="badge ${esc(v)}">${esc(v)}</span>` : '');

// ---------- entity configuration ----------
const STATUS = {
  rooms: ['Available', 'Booked', 'Maintenance'],
  bookings: ['Pending', 'Confirmed', 'Cancelled'],
  payments: ['Paid', 'Partial', 'Unpaid'],
};

const ENTITIES = {
  students: {
    label: 'Students', singular: 'Student', idField: 'studentId',
    columns: [
      { key: 'studentId', label: 'ID' }, { key: 'fullName', label: 'Full name' }, { key: 'gender', label: 'Gender' },
      { key: 'institution', label: 'Institution' }, { key: 'course', label: 'Course' }, { key: 'phone', label: 'Phone' },
    ],
    fields: [
      { key: 'fullName', label: 'Full name', type: 'text', required: true },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Other'], required: true },
      { key: 'institution', label: 'Institution', type: 'text', required: true },
      { key: 'course', label: 'Course', type: 'text', required: true },
      { key: 'phone', label: 'Phone (10 digits)', type: 'text', required: true, pattern: '0[0-9]{9}' },
    ],
    filters: [{ key: 'gender', label: 'All genders', options: ['Female', 'Male', 'Other'] }],
  },
  hostels: {
    label: 'Hostels', singular: 'Hostel', idField: 'hostelId',
    columns: [
      { key: 'hostelId', label: 'ID' }, { key: 'hostelName', label: 'Hostel name' }, { key: 'location', label: 'Location' },
      { key: 'contact', label: 'Contact' }, { key: 'ownerName', label: 'Owner' },
    ],
    fields: [
      { key: 'hostelName', label: 'Hostel name', type: 'text', required: true },
      { key: 'location', label: 'Location', type: 'text', required: true },
      { key: 'contact', label: 'Contact (10 digits)', type: 'text', required: true, pattern: '0[0-9]{9}' },
      { key: 'ownerName', label: 'Owner name', type: 'text', required: true },
    ],
    filters: [],
  },
  rooms: {
    label: 'Rooms', singular: 'Room', idField: 'roomId',
    columns: [
      { key: 'roomId', label: 'ID' }, { key: 'hostelId', label: 'Hostel' }, { key: 'roomNumber', label: 'Room no.' },
      { key: 'roomType', label: 'Type' }, { key: 'monthlyRent', label: 'Monthly rent', type: 'money' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'hostelId', label: 'Hostel', type: 'ref', ref: 'hostels', refLabel: (h) => `${h.hostelId} — ${h.hostelName}`, required: true },
      { key: 'roomNumber', label: 'Room number', type: 'text', required: true },
      { key: 'roomType', label: 'Room type', type: 'select', options: ['Single', 'Shared', 'Double'], required: true },
      { key: 'monthlyRent', label: 'Monthly rent (UGX)', type: 'number', required: true, min: 0, step: 5000 },
      { key: 'status', label: 'Status', type: 'select', options: STATUS.rooms, required: true, default: 'Available' },
    ],
    filters: [
      { key: 'status', label: 'All statuses', options: STATUS.rooms },
      { key: 'roomType', label: 'All types', options: ['Single', 'Shared', 'Double'] },
    ],
    extraToolbar: 'rentFilter',
  },
  bookings: {
    label: 'Bookings', singular: 'Booking', idField: 'bookingId',
    columns: [
      { key: 'bookingId', label: 'ID' }, { key: 'studentId', label: 'Student' }, { key: 'roomId', label: 'Room' },
      { key: 'bookingDate', label: 'Booking date', type: 'date' }, { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'studentId', label: 'Student', type: 'ref', ref: 'students', refLabel: (s) => `${s.studentId} — ${s.fullName}`, required: true },
      { key: 'roomId', label: 'Room', type: 'ref', ref: 'rooms', refLabel: (r) => `${r.roomId} — ${r.roomNumber} (${r.status}, ${money(r.monthlyRent)})`, required: true },
      { key: 'bookingDate', label: 'Booking date', type: 'date', required: true },
      { key: 'status', label: 'Status', type: 'select', options: STATUS.bookings, required: true, default: 'Pending' },
    ],
    filters: [{ key: 'status', label: 'All statuses', options: STATUS.bookings }],
  },
  payments: {
    label: 'Payments', singular: 'Payment', idField: 'paymentId',
    columns: [
      { key: 'paymentId', label: 'ID' }, { key: 'bookingId', label: 'Booking' }, { key: 'studentId', label: 'Student' },
      { key: 'amount', label: 'Amount', type: 'money' }, { key: 'paymentDate', label: 'Payment date', type: 'date' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    fields: [
      { key: 'bookingId', label: 'Booking', type: 'ref', ref: 'bookings', refLabel: (b) => `${b.bookingId} — ${b.studentId} / ${b.roomId} (${b.status})`, required: true },
      { key: 'studentId', label: 'Student ID (auto-filled from booking if empty)', type: 'text', required: false },
      { key: 'amount', label: 'Amount (UGX)', type: 'number', required: true, min: 0, step: 5000 },
      { key: 'paymentDate', label: 'Payment date', type: 'date', required: true },
      { key: 'status', label: 'Status', type: 'select', options: STATUS.payments, required: true, default: 'Unpaid' },
    ],
    filters: [{ key: 'status', label: 'All statuses', options: STATUS.payments }],
  },
};

const state = { tab: 'dashboard', view: {} }; // view[entity] = { page, q, filters }

// ---------- navigation ----------
function buildNav() {
  const tabs = [['dashboard', 'Dashboard'], ...Object.entries(ENTITIES).map(([k, e]) => [k, e.label])];
  $('#nav').innerHTML = tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === state.tab ? 'active' : ''}">${l}</button>`).join('');
}
$('#nav').addEventListener('click', (e) => {
  const tab = e.target.closest('button')?.dataset.tab;
  if (tab) location.hash = tab;
});
window.addEventListener('hashchange', route);

function route() {
  const tab = location.hash.slice(1);
  state.tab = tab === 'dashboard' || ENTITIES[tab] ? tab : 'dashboard';
  buildNav();
  (state.tab === 'dashboard' ? renderDashboard : () => renderEntity(state.tab))();
}

// ---------- dashboard ----------
function barList(title, map, total) {
  const rows = Object.entries(map).map(([k, v]) =>
    `<div class="bar-row"><span>${badge(k)}</span><div class="bar"><span style="width:${total ? (v / total) * 100 : 0}%"></span></div><b>${v}</b></div>`).join('');
  return `<div class="card"><h2>${esc(title)}</h2>${rows || '<p>No data</p>'}</div>`;
}

async function renderDashboard() {
  const main = $('#main');
  main.innerHTML = '<p>Loading dashboard…</p>';
  try {
    const [s, report] = await Promise.all([api('/stats'), api('/reports/bookings')]);
    const t = s.totals;
    main.innerHTML = `
      <div class="grid stats">
        <div class="stat"><div class="num">${t.students}</div><div class="lbl">Students</div></div>
        <div class="stat"><div class="num">${t.hostels}</div><div class="lbl">Hostels</div></div>
        <div class="stat"><div class="num">${t.rooms}</div><div class="lbl">Rooms</div></div>
        <div class="stat green"><div class="num">${t.availableRooms}</div><div class="lbl">Available rooms</div></div>
        <div class="stat amber"><div class="num">${t.bookings}</div><div class="lbl">Bookings</div></div>
        <div class="stat green"><div class="num">${money(s.revenue)}</div><div class="lbl">Total payments received</div></div>
      </div>
      <div class="grid two-col">
        ${barList('Rooms by status', s.roomStatus, t.rooms)}
        ${barList('Bookings by status', s.bookingStatus, t.bookings)}
        ${barList('Payments by status', s.paymentStatus, t.payments)}
      </div>
      <div class="card">
        <h2>Booking report (joined from students, rooms, hostels and payments with $lookup)</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Booking</th><th>Date</th><th>Student</th><th>Hostel</th><th>Location</th><th>Room</th><th>Rent</th><th>Paid</th><th>Balance</th><th>Booking</th><th>Payment</th></tr></thead>
          <tbody>${report.map((r) => `<tr>
            <td>${esc(r.bookingId)}</td><td>${dateOnly(r.bookingDate)}</td><td>${esc(r.studentName)}</td>
            <td>${esc(r.hostelName)}</td><td>${esc(r.location)}</td><td>${esc(r.roomNumber)}</td>
            <td>${money(r.monthlyRent)}</td><td>${money(r.amountPaid)}</td><td>${money(r.balance)}</td>
            <td>${badge(r.status)}</td><td>${badge(r.paymentStatus)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  } catch (err) {
    main.innerHTML = `<div class="card"><div class="form-error">${esc(err.message)}</div></div>`;
  }
}

// ---------- entity list (READ) ----------
function cell(col, row) {
  const v = row[col.key];
  if (col.type === 'money') return money(v);
  if (col.type === 'date') return dateOnly(v);
  if (col.type === 'badge') return badge(v);
  return esc(v);
}

async function renderEntity(key) {
  const ent = ENTITIES[key];
  const view = (state.view[key] ||= { page: 1, q: '', filters: {}, maxRent: '' });
  const main = $('#main');

  main.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">${ent.label}</h2><span class="spacer"></span>
        <input id="search" type="search" placeholder="Search ${ent.label.toLowerCase()}…" value="${esc(view.q)}">
        ${ent.filters.map((f) => `<select data-filter="${f.key}"><option value="">${f.label}</option>${f.options.map((o) => `<option ${view.filters[f.key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`).join('')}
        ${ent.extraToolbar === 'rentFilter' ? `<input id="maxRent" type="number" min="0" step="10000" placeholder="Max rent (UGX)" value="${esc(view.maxRent)}">` : ''}
        <button class="btn" id="addBtn">+ Add ${ent.singular}</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>${ent.columns.map((c) => `<th>${c.label}</th>`).join('')}<th>Actions</th></tr></thead>
        <tbody id="rows"><tr><td class="empty" colspan="${ent.columns.length + 1}">Loading…</td></tr></tbody>
      </table></div>
      <div class="pager" id="pager"></div>
    </div>`;

  let timer;
  $('#search').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { view.q = e.target.value; view.page = 1; loadRows(key); }, 300);
  });
  main.querySelectorAll('[data-filter]').forEach((sel) => sel.addEventListener('change', (e) => {
    view.filters[e.target.dataset.filter] = e.target.value; view.page = 1; loadRows(key);
  }));
  const maxRent = $('#maxRent');
  if (maxRent) maxRent.addEventListener('change', (e) => { view.maxRent = e.target.value; view.page = 1; loadRows(key); });
  $('#addBtn').addEventListener('click', () => openForm(key, null));
  $('#rows').addEventListener('click', onRowAction(key));
  loadRows(key);
}

async function loadRows(key) {
  const ent = ENTITIES[key];
  const view = state.view[key];
  const params = new URLSearchParams({ page: view.page, limit: 10 });
  if (view.q) params.set('q', view.q);
  Object.entries(view.filters).forEach(([k, v]) => v && params.set(k, v));
  if (view.maxRent) params.set('max_monthlyRent', view.maxRent);

  try {
    const res = await api(`/${key}?${params}`);
    $('#rows').innerHTML = res.data.length
      ? res.data.map((row) => `<tr>${ent.columns.map((c) => `<td>${cell(c, row)}</td>`).join('')}
          <td class="actions">
            <button class="btn small ghost" data-act="edit" data-id="${esc(row[ent.idField])}">Edit</button>
            <button class="btn small danger" data-act="delete" data-id="${esc(row[ent.idField])}">Delete</button>
          </td></tr>`).join('')
      : `<tr><td class="empty" colspan="${ent.columns.length + 1}">No records found</td></tr>`;

    $('#pager').innerHTML = `
      <span>${res.total} record(s) &middot; page ${res.page} of ${res.pages}</span>
      <div><button class="btn small ghost" data-page="${res.page - 1}" ${res.page <= 1 ? 'disabled' : ''}>&laquo; Prev</button>
      <button class="btn small ghost" data-page="${res.page + 1}" ${res.page >= res.pages ? 'disabled' : ''}>Next &raquo;</button></div>`;
    $('#pager').onclick = (e) => {
      const p = e.target.closest('[data-page]')?.dataset.page;
      if (p) { view.page = Number(p); loadRows(key); }
    };
  } catch (err) {
    $('#rows').innerHTML = `<tr><td class="empty" colspan="${ent.columns.length + 1}">${esc(err.message)}</td></tr>`;
  }
}

function onRowAction(key) {
  const ent = ENTITIES[key];
  return async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'edit') {
      try { openForm(key, await api(`/${key}/${encodeURIComponent(id)}`)); } catch (err) { toast(err.message, 'error'); }
    } else if (confirm(`Delete ${ent.singular} ${id}? This cannot be undone.`)) {
      try {
        await api(`/${key}/${encodeURIComponent(id)}`, { method: 'DELETE' });   // DELETE
        toast(`${ent.singular} ${id} deleted`);
        loadRows(key);
      } catch (err) { toast(err.message, 'error'); }
    }
  };
}

// ---------- create / update form ----------
async function openForm(key, record) {
  const ent = ENTITIES[key];
  const modal = $('#modal');
  const isEdit = !!record;

  // load options for dropdowns that reference another collection
  const refData = {};
  await Promise.all(ent.fields.filter((f) => f.type === 'ref').map(async (f) => {
    refData[f.key] = (await api(`/${f.ref}?limit=200`)).data;
  }));

  const input = (f) => {
    const val = record ? record[f.key] : f.default ?? '';
    const common = `name="${f.key}" id="f_${f.key}" ${f.required ? 'required' : ''}`;
    if (f.type === 'select') {
      return `<select ${common}>${f.options.map((o) => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    }
    if (f.type === 'ref') {
      return `<select ${common}><option value="">— choose —</option>${refData[f.key].map((r) =>
        `<option value="${esc(r[ENTITIES[f.ref].idField])}" ${r[ENTITIES[f.ref].idField] === val ? 'selected' : ''}>${esc(f.refLabel(r))}</option>`).join('')}</select>`;
    }
    if (f.type === 'date') return `<input type="date" ${common} value="${f.key && val ? dateOnly(val) : dateOnly(new Date())}">`;
    if (f.type === 'number') return `<input type="number" ${common} value="${esc(val)}" min="${f.min ?? ''}" step="${f.step ?? 1}">`;
    return `<input type="text" ${common} value="${esc(val)}" ${f.pattern ? `pattern="${f.pattern}" title="${esc(f.label)}"` : ''}>`;
  };

  modal.innerHTML = `
    <form id="entityForm" novalidate>
      <h3>${isEdit ? 'Edit' : 'Add'} ${ent.singular}${isEdit ? ` <small>(${esc(record[ent.idField])})</small>` : ''}</h3>
      <div id="formError"></div>
      ${isEdit ? '' : `<div class="field"><label>${ent.idField}</label><input type="text" value="Auto-generated" readonly></div>`}
      ${ent.fields.map((f) => `<div class="field"><label for="f_${f.key}">${f.label}${f.required ? ' <span class="req">*</span>' : ''}</label>${input(f)}</div>`).join('')}
      <div class="form-actions">
        <button type="button" class="btn ghost" id="cancelBtn">Cancel</button>
        <button type="submit" class="btn">${isEdit ? 'Save changes' : 'Create'}</button>
      </div>
    </form>`;
  modal.showModal();
  $('#cancelBtn').onclick = () => modal.close();

  $('#entityForm').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const body = {};
    for (const f of ent.fields) {
      const raw = form.elements[f.key].value;
      if (raw === '' && !f.required) continue;
      body[f.key] = f.type === 'number' ? Number(raw) : raw;
    }
    try {
      if (isEdit) await api(`/${key}/${encodeURIComponent(record[ent.idField])}`, { method: 'PUT', body: JSON.stringify(body) });  // UPDATE
      else await api(`/${key}`, { method: 'POST', body: JSON.stringify(body) });                                                  // CREATE
      modal.close();
      toast(`${ent.singular} ${isEdit ? 'updated' : 'created'} successfully`);
      loadRows(key);
    } catch (err) {
      $('#formError').innerHTML = `<div class="form-error">${esc(err.message)}</div>`;
    }
  };
}

route();
