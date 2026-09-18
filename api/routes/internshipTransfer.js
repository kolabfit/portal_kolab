import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import crypto from 'node:crypto';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';
import { manageInternship } from '../lib/internships.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const fields = ['studentNim', 'startupId', 'startDate', 'endDate', 'fieldSupervisor', 'academicSupervisorNip', 'academicSupervisor2Nip', 'status'];
const aliases = {
  studentNim: ['student nim', 'student_nim', 'nim', 'nim mahasiswa', 'nim_mahasiswa'],
  startupId: ['startup id', 'startup_id', 'startup', 'id startup', 'id_startup'],
  startDate: ['start date', 'start_date', 'tanggal mulai', 'tanggal_mulai', 'mulai'],
  endDate: ['end date', 'end_date', 'tanggal selesai', 'tanggal_selesai', 'selesai'],
  fieldSupervisor: ['field supervisor', 'field_supervisor', 'pembimbing lapangan'],
  academicSupervisorNip: ['academic supervisor nip', 'academic_supervisor_nip', 'nip pembimbing akademik', 'pembimbing akademik'],
  academicSupervisor2Nip: ['academic supervisor 2 nip', 'academic_supervisor2_nip', 'nip pembimbing akademik 2', 'pembimbing akademik 2'],
  status: ['status', 'status magang']
};
const normalize = value => String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const parse = buffer => {
  const sheet = XLSX.read(buffer, { type: 'buffer', raw: false }).Sheets[XLSX.read(buffer, { type: 'buffer', raw: false }).SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
};
const mapRows = buffer => {
  const raw = parse(buffer);
  const headers = raw.shift() || [];
  const mapping = {};
  const ignored = [];
  headers.forEach((header, index) => {
    const field = fields.find(candidate => aliases[candidate].includes(normalize(header)));
    if (field && mapping[field] === undefined) mapping[field] = index;
    else if (normalize(header)) ignored.push(String(header));
  });
  const rows = raw.map((row, index) => {
    const item = { rowNumber: index + 2 };
    Object.entries(mapping).forEach(([field, column]) => { item[field] = String(row[column] ?? '').trim(); });
    return item;
  }).filter(row => Object.values(row).some(value => String(value ?? '').trim()));
  return { rows, ignored, mapping };
};

async function validate(rows) {
  const [students] = await db.execute('SELECT nim FROM students');
  const [startups] = await db.execute('SELECT id FROM startup_teams');
  const [lecturers] = await db.execute('SELECT nip FROM lecturers');
  const studentIds = new Set(students.map(row => String(row.nim)));
  const startupIds = new Set(startups.map(row => String(row.id)));
  const lecturerIds = new Set(lecturers.map(row => String(row.nip)));
  const seen = new Set();
  return rows.map(row => {
    const errors = [];
    if (!row.studentNim || !studentIds.has(row.studentNim)) errors.push('Mahasiswa tidak ditemukan');
    if (seen.has(row.studentNim)) errors.push('NIM duplicate dalam file');
    seen.add(row.studentNim);
    if (!row.startupId || !startupIds.has(row.startupId)) errors.push('Startup tidak ditemukan');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(row.endDate || '')) errors.push('Format tanggal harus YYYY-MM-DD');
    if (row.startDate && row.endDate && row.endDate < row.startDate) errors.push('Tanggal selesai sebelum tanggal mulai');
    if (row.academicSupervisorNip && !lecturerIds.has(row.academicSupervisorNip)) errors.push('Pembimbing akademik tidak ditemukan');
    if (row.academicSupervisor2Nip && !lecturerIds.has(row.academicSupervisor2Nip)) errors.push('Pembimbing akademik 2 tidak ditemukan');
    if (!['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(row.status || '')) errors.push('Status magang tidak valid');
    return { ...row, validationStatus: errors.length ? 'INVALID' : 'VALID', errors };
  });
}

router.use(requireSession);
router.use((req, res, next) => req.user.role === 'ADMIN' ? next() : res.status(403).json({ status: 'error', message: 'Akses admin diperlukan.' }));

router.get('/template', (_req, res) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
    student_nim: '607012340001', startup_id: 'startup-01', start_date: '2026-09-01', end_date: '2026-12-31',
    field_supervisor: 'Nama Pembimbing', academic_supervisor_nip: '232411567', academic_supervisor2_nip: '', status: 'ONGOING'
  }]), 'Magang');
  res.attachment('template-data-magang-kolab.xlsx').send(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
});

router.post('/import/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'File import wajib dipilih.' });
    const parsed = mapRows(req.file.buffer);
    const rows = await validate(parsed.rows);
    res.json({ status: 'success', fileName: req.file.originalname, totalRows: rows.length, ignored: parsed.ignored, mapping: parsed.mapping, rows });
  } catch (error) { next(error); }
});

router.post('/import/commit', async (req, res, next) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ status: 'error', message: 'Data import kosong.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const validRows = (await validate(rows)).filter(row => row.validationStatus === 'VALID');
    if (validRows.length !== rows.length) throw Object.assign(new Error('Terdapat data import yang tidak valid.'), { status: 400 });
    for (const row of validRows) await manageInternship(connection, 'add', `internship-${crypto.randomUUID()}`, row);
    await connection.commit();
    res.json({ status: 'success', total: rows.length, imported: validRows.length, skipped: 0, failed: 0 });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

export default router;
