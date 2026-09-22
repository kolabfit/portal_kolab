import { validateStartupPosition, resolveStartupMembership, logStartupPosition } from '../lib/startupPosition.js';
import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import crypto from 'node:crypto';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = String(file.originalname).toLowerCase().split('.').pop();
    if (!['xlsx', 'xls', 'csv'].includes(extension)) return callback(new Error('File harus berformat .xlsx, .xls, atau .csv.'));
    callback(null, true);
  }
});

const studentFields = ['nim', 'name', 'email', 'password', 'type', 'startup_id', 'startup_position', 'job_desk', 'is_approved', 'is_active', 'custom_quota', 'custom_max_upload', 'statuses', 'youtube', 'spotify'];
const lecturerFields = ['nip', 'name', 'email', 'password', 'job_desks', 'code', 'is_approved', 'is_active', 'custom_quota', 'custom_max_upload', 'youtube', 'spotify'];
const aliases = {
  nim: ['nim', 'student_nim', 'student id', 'nomor induk mahasiswa'],
  nip: ['nip', 'lecturer_nip', 'lecturer id', 'nomor induk pegawai'],
  name: ['name', 'nama', 'nama mahasiswa', 'nama dosen', 'nama lengkap', 'full name'],
  email: ['email', 'e mail', 'alamat email'],
  password: ['password', 'kata sandi'],
  type: ['type', 'student type', 'tipe', 'tipe mahasiswa', 'student_type'],
  startup_id: ['startup id', 'startup_id', 'startupid', 'id startup', 'startup', 'startup name', 'startup_name', 'nama startup', 'nama tim', 'startup team'],
  startup_position: ['startup position', 'posisi startup', 'posisi'],
  job_desk: ['job desk', 'job_desk', 'jobdesk', 'job desk mahasiswa'],
  job_desks: ['job desks', 'job_desks', 'jobdesks', 'job desk dosen'],
  code: ['code', 'kode', 'kode dosen', 'lecturer code'],
  is_approved: ['is approved', 'is_approved', 'approved', 'status approved'],
  is_active: ['is active', 'is_active', 'active', 'status active', 'status'],
  custom_quota: ['custom quota', 'custom_quota', 'quota', 'storage quota'],
  custom_max_upload: ['custom max upload', 'custom_max_upload', 'max upload', 'max_upload'],
  statuses: ['statuses', 'status mahasiswa', 'student statuses'],
  youtube: ['youtube', 'youtube url', 'youtube link'],
  spotify: ['spotify', 'spotify url', 'spotify link']
};

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function mapHeaders(headers, role) {
  const fields = role === 'STUDENT' ? studentFields : lecturerFields;
  const result = {};
  const ignored = [];
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = fields.find(candidate => (aliases[candidate] || []).includes(normalized));
    if (field && result[field] === undefined) result[field] = index;
    else if (normalized) ignored.push(String(header));
  });
  return { result, ignored };
}

function parseRows(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellFormula: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
}

function valueAt(row, index) {
  return index === undefined ? undefined : row[index];
}

function boolValue(value, fallback = true) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'aktif', 'active'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'nonaktif', 'inactive'].includes(normalized)) return false;
  return null;
}

function listValue(value) {
  if (Array.isArray(value)) return value;
  const text = String(value ?? '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [text];
  } catch {
    return text.split(',').map(item => item.trim()).filter(Boolean);
  }
}

function validEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function hashPassword(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

async function buildRows(file, role) {
  const raw = parseRows(file.buffer);
  const headers = raw.shift() || [];
  const { result: mapping, ignored } = mapHeaders(headers, role);
  const identifier = role === 'STUDENT' ? 'nim' : 'nip';
  const rows = raw.map((row, index) => {
    const normalized = {};
    Object.entries(mapping).forEach(([field, column]) => { normalized[field] = valueAt(row, column); });
    return { rowNumber: index + 2, ...normalized, identifier: String(normalized[identifier] ?? '').trim(), name: String(normalized.name ?? '').trim() };
  }).filter(row => Object.values(row).some(value => String(value ?? '').trim() !== ''));
  return { headers, mapping, ignored, rows };
}

async function validateRows(parsed, role, duplicateMode = 'skip') {
  const identifier = role === 'STUDENT' ? 'nim' : 'nip';
  const table = role === 'STUDENT' ? 'students' : 'lecturers';
  const [existing] = await db.execute(`SELECT ${identifier},name${role === 'STUDENT' ? ',type,startup_id,startup_position' : ''} FROM ${table}`);
  const existingIds = new Set(existing.map(row => String(row[identifier])));
  const existingById = new Map(existing.map(row => [String(row[identifier]), row]));
  const leadership = new Map(existing.filter(row => row.type === 'STARTUP' && row.startup_id && row.startup_position && row.startup_position !== 'MEMBER').map(row => [row.startup_id + ':' + row.startup_position, row]));
  const fileIds = new Set();
  const [startups] = role === 'STUDENT' ? await db.execute('SELECT id, name FROM startup_teams') : [[]];
  const startupByValue = new Map();
  startups.forEach(startup => {
    startupByValue.set(String(startup.id).trim().toLowerCase(), String(startup.id));
    startupByValue.set(String(startup.name).trim().toLowerCase(), String(startup.id));
  });
  const results = parsed.rows.map(row => {
    const errors = [];
    const id = String(row[identifier] ?? '').trim();
    row[identifier] = id;
    if (!id) errors.push(`${identifier.toUpperCase()} kosong`);
    if (id.length > 20) errors.push(`${identifier.toUpperCase()} melebihi 20 karakter`);
    if (!row.name) errors.push('Nama kosong');
    if (!validEmail(row.email)) errors.push('Email tidak valid');
    if (row.custom_quota !== undefined && row.custom_quota !== '' && (!Number.isFinite(Number(row.custom_quota)) || Number(row.custom_quota) < 0)) errors.push('Quota tidak valid');
    if (row.custom_max_upload !== undefined && row.custom_max_upload !== '' && (!Number.isFinite(Number(row.custom_max_upload)) || Number(row.custom_max_upload) < 0)) errors.push('Max upload tidak valid');
    if (row.is_active !== undefined && boolValue(row.is_active, true) === null) errors.push('is_active tidak valid');
    if (row.is_approved !== undefined && boolValue(row.is_approved, true) === null) errors.push('is_approved tidak valid');
    if (role === 'STUDENT') {
      const current = existingById.get(String(id)) || {};
      const type = String(row.type || current.type || 'NON_STARTUP').trim().toUpperCase();
      row.type = type;
      if (row.startup_id === undefined) row.startup_id = current.startup_id;
      if (type && !['STARTUP', 'NON_STARTUP'].includes(type)) errors.push('Student type tidak valid');
      if (row.startup_id != null && String(row.startup_id).trim()) {
        const startupKey = String(row.startup_id).trim().toLowerCase();
        const resolvedStartupId = startupByValue.get(startupKey);
        if (resolvedStartupId) row.startup_id = resolvedStartupId;
        else errors.push('Startup ID atau nama startup tidak ditemukan');
      }
      if (type === 'STARTUP' && !String(row.startup_id ?? '').trim()) errors.push('Startup wajib diisi untuk tipe STARTUP');
      if (type === 'NON_STARTUP') row.startup_id = null;
      try {
        const position = validateStartupPosition(row.startup_position, { normalize: true });
        row.startup_position = type === 'STARTUP' && row.startup_id ? position || 'MEMBER' : null;
        if (row.startup_position && row.startup_position !== 'MEMBER') {
          const occupant = leadership.get(row.startup_id + ':' + row.startup_position);
          if (occupant && String(occupant.nim) !== String(id)) {
            const startup = startups.find(s => s.id === row.startup_id);
            errors.push(`Posisi ${row.startup_position} pada startup ${startup?.name || row.startup_id} sudah diisi oleh ${occupant.name}.`);
          }
        }
      } catch (error) { errors.push(error.message); }
    }
    const duplicateInFile = id && fileIds.has(id);
    if (id) fileIds.add(id);
    const duplicateInDatabase = id && existingIds.has(id);
    if (role === 'STUDENT' && !errors.length && !duplicateInFile && (!duplicateInDatabase || duplicateMode === 'update')) {
      for (const [key, member] of leadership) if (String(member.nim) === String(id)) leadership.delete(key);
      if (row.startup_position && row.startup_position !== 'MEMBER') leadership.set(row.startup_id + ':' + row.startup_position, { nim: id, name: row.name });
    }
    const status = errors.length ? 'INVALID' : duplicateInFile || duplicateInDatabase ? 'DUPLICATE' : 'VALID';
    return { ...row, status, errors, duplicateInFile, duplicateInDatabase, action: status === 'DUPLICATE' ? duplicateMode : 'insert' };
  });
  return { rows: results, ignored: parsed.ignored, mapping: parsed.mapping, totalRows: results.length };
}

function exportFilters(query) {
  const search = String(query.search || '').trim();
  return search ? `%${search}%` : null;
}

function safeSpreadsheetValue(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : value ?? '';
}

function makeWorkbook(rows, sheetName) {
  const worksheet = XLSX.utils.json_to_sheet(rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeSpreadsheetValue(value)]))));
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  worksheet['!autofilter'] = { ref: worksheet['!ref'] };
  return XLSX.utils.book_new() && { worksheet, workbook: (() => { const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, sheetName); return workbook; })() };
}

function pdfTable(res, title, columns, rows, total) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);
  doc.fontSize(18).text('PORTAL KOLAB', { align: 'center' });
  doc.fontSize(13).text(title, { align: 'center' });
  doc.fontSize(9).text(`Tanggal Export: ${new Date().toLocaleString('id-ID')} | Total Data: ${total}`, { align: 'center' });
  doc.moveDown();
  const widths = columns.map(() => 760 / columns.length);
  const rowHeight = 24;
  let y = doc.y;
  const drawRow = (values, header = false) => {
    if (y + rowHeight > 550) { doc.addPage(); y = 35; }
    values.forEach((value, index) => {
      const x = 28 + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
      doc.rect(x, y, widths[index], rowHeight).fillAndStroke(header ? '#f97316' : '#ffffff', '#d1d5db');
      doc.fillColor(header ? '#ffffff' : '#111827').fontSize(header ? 8 : 7).text(String(value ?? ''), x + 4, y + 8, { width: widths[index] - 8, height: 12, ellipsis: true });
    });
    y += rowHeight;
  };
  drawRow(columns, true);
  rows.forEach(row => drawRow(columns.map(column => row[column]), false));
  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index++) {
    doc.switchToPage(index);
    doc.fontSize(8).fillColor('#6b7280').text(`Generated by Portal Kolab | Halaman ${index + 1} / ${pages.count}`, 28, 565, { align: 'center', width: 760 });
  }
  doc.end();
}

router.use(requireSession);
router.use((req, res, next) => req.user.role === 'ADMIN' ? next() : res.status(403).json({ status: 'error', message: 'Akses admin diperlukan.' }));

router.get('/template/:role', (req, res) => {
  const role = req.params.role.toUpperCase();
  if (!['STUDENT', 'LECTURER'].includes(role)) return res.status(400).json({ status: 'error', message: 'Role template tidak valid.' });
  const headers = role === 'STUDENT' ? studentFields : lecturerFields;
  const example = role === 'STUDENT'
    ? { nim: 'CONTOH001', name: 'Nama Contoh', email: 'contoh@example.com', password: '', type: 'NON_STARTUP', startup_id: '', startup_position: '', job_desk: '', is_approved: 'TRUE', is_active: 'TRUE', custom_quota: '', custom_max_upload: '', statuses: '', youtube: '', spotify: '' }
    : { nip: 'CONTOH001', name: 'Nama Dosen Contoh', email: 'dosen@example.com', password: '', job_desks: 'Pembimbing, Koordinator', code: '', is_approved: 'TRUE', is_active: 'TRUE', custom_quota: '', custom_max_upload: '', youtube: '', spotify: '' };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([Object.fromEntries(headers.map(header => [header, example[header]]))]), role === 'STUDENT' ? 'Mahasiswa' : 'Dosen');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.attachment(`template-${role === 'STUDENT' ? 'mahasiswa' : 'dosen'}-kolab.xlsx`).send(buffer);
});

router.post('/import/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'File import wajib dipilih.' });
    const role = String(req.body.role || '').toUpperCase();
    if (!['STUDENT', 'LECTURER'].includes(role)) return res.status(400).json({ status: 'error', message: 'Jenis data tidak valid.' });
    const parsed = await buildRows(req.file, role);
    const result = await validateRows(parsed, role, String(req.body.duplicateMode || 'skip'));
    res.json({ status: 'success', role, fileName: req.file.originalname, ...result });
  } catch (error) {
    res.status(error instanceof multer.MulterError ? 400 : 422).json({ status: 'error', message: error.message });
  }
});

router.post('/import/commit', async (req, res) => {
  const role = String(req.body.role || '').toUpperCase();
  if (!['STUDENT', 'LECTURER'].includes(role) || !Array.isArray(req.body.rows)) return res.status(400).json({ status: 'error', message: 'Payload import tidak valid.' });
  const identifier = role === 'STUDENT' ? 'nim' : 'nip';
  const table = role === 'STUDENT' ? 'students' : 'lecturers';
  const allowed = role === 'STUDENT' ? studentFields : lecturerFields;
  const connection = await db.getConnection();
  const summary = { totalRows: req.body.rows.length, imported: 0, updated: 0, skipped: 0, failed: 0, failures: [] };
  try {
    const startupByValue = new Map();
    if (role === 'STUDENT') {
      const [startups] = await connection.execute('SELECT id, name FROM startup_teams');
      startups.forEach(startup => {
        startupByValue.set(String(startup.id).trim().toLowerCase(), String(startup.id));
        startupByValue.set(String(startup.name).trim().toLowerCase(), String(startup.id));
      });
    }
    await connection.beginTransaction();
    for (const row of req.body.rows) {
      const rowIdentifier = String(row[identifier] ?? '').trim();
      const rowName = String(row.name ?? '').trim();
      if (!rowIdentifier || rowIdentifier.length > 20 || !rowName || !validEmail(row.email)) {
        summary.failed += 1;
        summary.failures.push({ row_number: row.rowNumber, identifier: rowIdentifier, name: rowName, error_message: 'Data baris tidak lolos validasi server.' });
        continue;
      }
      if (role === 'STUDENT' && row.type !== undefined && row.type !== '' && !['STARTUP', 'NON_STARTUP'].includes(String(row.type).trim().toUpperCase())) {
        summary.failed += 1;
        summary.failures.push({ row_number: row.rowNumber, identifier: rowIdentifier, name: rowName, error_message: 'Student type tidak valid.' });
        continue;
      }
      if (role === 'STUDENT') {
        const type = String(row.type ?? '').trim().toUpperCase();
        const startupValue = String(row.startup_id ?? '').trim();
        if (startupValue) {
          const resolvedStartupId = startupByValue.get(startupValue.toLowerCase());
          if (!resolvedStartupId) {
            summary.failed += 1;
            summary.failures.push({ row_number: row.rowNumber, identifier: rowIdentifier, name: rowName, error_message: 'Startup ID atau nama startup tidak ditemukan.' });
            continue;
          }
          row.startup_id = resolvedStartupId;
        }
        if (type === 'STARTUP' && !startupValue) {
          summary.failed += 1;
          summary.failures.push({ row_number: row.rowNumber, identifier: rowIdentifier, name: rowName, error_message: 'Startup wajib diisi untuk tipe STARTUP.' });
          continue;
        }

      }
      if (row.status === 'INVALID' || (row.status === 'DUPLICATE' && row.action !== 'update')) {
        summary[row.status === 'INVALID' ? 'failed' : 'skipped'] += 1;
        if (row.status === 'INVALID') summary.failures.push({ row_number: row.rowNumber, identifier: row.identifier, name: row.name, error_message: (row.errors || []).join('; ') });
        continue;
      }
      const values = {};
      allowed.filter(field => row[field] !== undefined && row[field] !== '').forEach(field => { values[field] = row[field]; });
      values[identifier] = String(row[identifier] || '').trim();
      if (values.password !== undefined) values.password = hashPassword(values.password);
      if (values.type) values.type = String(values.type).toUpperCase();
      if (values.statuses !== undefined) values.statuses = JSON.stringify(listValue(values.statuses));
      if (values.job_desks !== undefined) values.job_desks = JSON.stringify(listValue(values.job_desks));
      ['is_active', 'is_approved'].forEach(field => { if (values[field] !== undefined) values[field] = boolValue(values[field]); });
      ['custom_quota', 'custom_max_upload'].forEach(field => { if (values[field] !== undefined) values[field] = Number(values[field]); });
      await connection.query('SAVEPOINT import_member_row');
      try {
        const [existing] = await connection.execute(`SELECT * FROM ${table} WHERE ${identifier}=? FOR UPDATE`, [values[identifier]]);
        if (existing.length && row.action !== 'update') { summary.skipped += 1; continue; }
        let membership;
        if (role === 'STUDENT') {
          membership = await resolveStartupMembership(connection, {
            studentType: values.type,
            startupId: row.startup_id === undefined ? undefined : row.startup_id,
            startupPosition: validateStartupPosition(row.startup_position, { normalize: true }) || 'MEMBER'
          }, existing[0] || {});
          values.type = membership.studentType;
          values.startup_id = membership.startupId;
          values.startup_position = membership.startupPosition;
          await logStartupPosition(connection, req.user.id, values[identifier], existing[0] || {}, membership);
        }
        if (existing.length && row.action === 'update') {
          const updates = Object.keys(values).filter(field => field !== identifier);
          if (updates.length) await connection.execute(`UPDATE ${table} SET ${updates.map(field => `${field}=?`).join(', ')} WHERE ${identifier}=?`, [...updates.map(field => values[field]), values[identifier]]);
          summary.updated += 1;
        } else if (!existing.length) {
          const fields = Object.keys(values);
          if (!values.password) values.password = hashPassword(role === 'STUDENT' ? 'memberkolab' : 'dosenkolab');
          const finalFields = Object.keys(values);
          await connection.execute(`INSERT INTO ${table} (${finalFields.join(',')}) VALUES (${finalFields.map(() => '?').join(',')})`, finalFields.map(field => values[field]));
          summary.imported += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (error) {
        await connection.query('ROLLBACK TO SAVEPOINT import_member_row');
        summary.failed += 1;
        summary.failures.push({ row_number: row.rowNumber, identifier: row.identifier, name: row.name, error_message: error.message });
      }
    }
    await connection.execute('INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), ?, ?, ?)', [`import${role === 'STUDENT' ? 'Students' : 'Lecturers'}`, req.user.id, JSON.stringify(summary)]);
    await connection.commit();
    res.json({ status: 'success', ...summary });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ status: 'error', message: error.message });
  } finally {
    connection.release();
  }
});

router.get('/export/:role', async (req, res) => {
  const role = req.params.role.toUpperCase();
  const format = String(req.query.format || '').toLowerCase();
  const isStudent = role === 'STUDENT';
  if (!['STUDENT', 'LECTURER'].includes(role) || !['xlsx', 'pdf'].includes(format)) return res.status(400).json({ status: 'error', message: 'Parameter export tidak valid.' });
  const search = exportFilters(req.query);
  const table = isStudent ? 'students' : 'lecturers';
  const identifier = isStudent ? 'nim' : 'nip';
  const query = isStudent
    ? `SELECT s.nim,s.name,s.email,s.type,s.startup_id,s.startup_position,s.job_desk,s.is_approved,s.is_active,s.custom_quota,s.custom_max_upload,s.statuses,s.youtube,s.spotify,s.created_at,st.name AS startup_name,
      (SELECT i.status FROM internships i WHERE i.student_nim=s.nim ORDER BY CASE i.status WHEN 'ONGOING' THEN 0 WHEN 'PLANNED' THEN 1 WHEN 'COMPLETED' THEN 2 ELSE 3 END,i.start_date DESC,i.created_at DESC,i.id DESC LIMIT 1) AS internship_status,
      (SELECT COUNT(*) FROM workload_members wm JOIN workloads w ON w.id=wm.workload_id WHERE wm.member_role='STUDENT' AND wm.member_id=s.nim AND w.status='ACTIVE') AS active_load
      FROM students s LEFT JOIN startup_teams st ON st.id=s.startup_id ${search ? 'WHERE s.nim LIKE ? OR s.name LIKE ? OR s.email LIKE ?' : ''} ORDER BY s.created_at DESC`
    : `SELECT nip,name,email,code,job_desks,is_approved,is_active,custom_quota,custom_max_upload,youtube,spotify,created_at FROM lecturers ${search ? 'WHERE nip LIKE ? OR name LIKE ? OR email LIKE ?' : ''} ORDER BY created_at DESC`;
  const [rows] = await db.execute(query, search ? [search, search, search] : []);
  const date = new Date().toISOString().slice(0, 10);
  const label = isStudent ? 'mahasiswa' : 'dosen';
  await db.execute('INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), ?, ?, ?)', [`export${isStudent ? 'Students' : 'Lecturers'}${format === 'xlsx' ? 'Excel' : 'Pdf'}`, req.user.id, JSON.stringify({ totalRows: rows.length, search: req.query.search || '' })]);
  if (format === 'xlsx') {
    const output = isStudent ? rows.map((row, index) => ({ No: index + 1, NIM: row.nim, Nama: row.name, Startup: row.startup_name || '', 'Posisi Startup': row.type === 'STARTUP' && row.startup_id ? (row.startup_position === 'MEMBER' ? 'Anggota' : row.startup_position || '-') : '-', 'Status Magang': row.internship_status || 'Tidak Magang', 'Active Workload': Number(row.active_load || 0), 'Status Member': row.is_active && row.is_approved ? 'ACTIVE' : 'INACTIVE', 'Job Desk': row.job_desk, Email: row.email, 'Tipe Mahasiswa': row.type, 'Status Approved': !!row.is_approved, 'Status Active': !!row.is_active, 'Storage Quota': row.custom_quota, 'Max Upload': row.custom_max_upload, 'Status Mahasiswa': row.statuses, YouTube: row.youtube, Spotify: row.spotify, 'Tanggal Terdaftar': row.created_at })) : rows.map((row, index) => ({ No: index + 1, NIP: row.nip, Nama: row.name, Email: row.email, 'Kode Dosen': row.code, 'Job Desk': row.job_desks, 'Status Approved': !!row.is_approved, 'Status Active': !!row.is_active, 'Storage Quota': row.custom_quota, 'Max Upload': row.custom_max_upload, YouTube: row.youtube, Spotify: row.spotify, 'Tanggal Terdaftar': row.created_at }));
    const workbook = makeWorkbook(output, isStudent ? 'Mahasiswa' : 'Dosen').workbook;
    res.attachment(`data-${label}-kolab-${date}.xlsx`).send(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  } else {
    const output = isStudent ? rows.map(row => ({ No: rows.indexOf(row) + 1, NIM: row.nim, Nama: row.name, Startup: row.startup_name || '', 'Posisi Startup': row.type === 'STARTUP' && row.startup_id ? (row.startup_position === 'MEMBER' ? 'Anggota' : row.startup_position || '-') : '-', 'Status Magang': row.internship_status || 'Tidak Magang', 'Active Workload': Number(row.active_load || 0), 'Status Member': row.is_active && row.is_approved ? 'ACTIVE' : 'INACTIVE', 'Job Desk': row.job_desk, Status: row.is_active && row.is_approved ? 'Aktif' : 'Nonaktif' })) : rows.map(row => ({ No: rows.indexOf(row) + 1, NIP: row.nip, Nama: row.name, 'Kode Dosen': row.code, 'Job Desk': row.job_desks, Status: row.is_active && row.is_approved ? 'Aktif' : 'Nonaktif' }));
    pdfTable(res, isStudent ? 'Data Mahasiswa' : 'Data Dosen', Object.keys(output[0] || (isStudent ? { No: '', NIM: '', Nama: '', Startup: '', 'Posisi Startup': '', 'Status Magang': '', 'Active Workload': '', 'Status Member': '', 'Job Desk': '', Status: '' } : { No: '', NIP: '', Nama: '', 'Kode Dosen': '', 'Job Desk': '', Status: '' })), output, rows.length);
  }
});

export default router;
