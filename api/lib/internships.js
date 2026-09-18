import { record } from './serializers.js';

// Indexed references keep this additive migration compatible with legacy data/deletes.
export const internshipsSchema = `CREATE TABLE IF NOT EXISTS internships (
  id VARCHAR(50) PRIMARY KEY,
  student_nim VARCHAR(20) NOT NULL,
  startup_id VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  field_supervisor VARCHAR(150),
  academic_supervisor_nip VARCHAR(20),
  academic_supervisor2_nip VARCHAR(20),
  status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_internships_student (student_nim),
  INDEX idx_internships_startup (startup_id),
  INDEX idx_internships_academic (academic_supervisor_nip),
  INDEX idx_internships_academic2 (academic_supervisor2_nip),
  INDEX idx_internships_status (status)
) ENGINE=InnoDB`;

const statuses = ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const activeStatuses = ['PLANNED', 'ONGOING'];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

function reference(value, label, length, optional = false) {
  if (optional && (value === '' || value === null || value === undefined)) return null;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > length) fail(`${label} tidak valid.`);
  return value.trim();
}

function date(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01') fail(`${label} wajib berupa tanggal yang valid.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(`${label} tidak valid.`);
  return value;
}

export async function listInternships(db) {
  const [rows] = await db.execute(`SELECT i.*, s.name AS student_name, t.name AS startup_name,
    l.name AS academic_supervisor_name, l.code AS academic_supervisor_code,
    l2.name AS academic_supervisor2_name, l2.code AS academic_supervisor2_code
    FROM internships i
    LEFT JOIN students s ON s.nim = i.student_nim
    LEFT JOIN startup_teams t ON t.id = i.startup_id
    LEFT JOIN lecturers l ON l.nip = i.academic_supervisor_nip
    LEFT JOIN lecturers l2 ON l2.nip = i.academic_supervisor2_nip
    ORDER BY i.start_date DESC, i.created_at DESC, i.id`);
  return rows.map(record);
}

// Runs inside the bridge transaction; the bridge commits data and audit together.
export async function manageInternship(db, type, id, data) {
  if (!['add', 'edit', 'delete'].includes(type)) fail('Operasi magang tidak valid.');
  reference(id, 'ID magang', 50);
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Data magang tidak valid.');

  if (type === 'delete') {
    const [result] = await db.execute('DELETE FROM internships WHERE id=?', [id]);
    if (!result.affectedRows) fail('Data magang tidak ditemukan.', 404);
    return;
  }

  let existing;
  if (type === 'edit') {
    [[existing]] = await db.execute('SELECT * FROM internships WHERE id=?', [id]);
    if (!existing) fail('Data magang tidak ditemukan.', 404);
  }
  const studentNim = reference(data.studentNim !== undefined ? data.studentNim : existing?.student_nim, 'Mahasiswa', 20);
  // Student-row locks serialize overlapping inserts even when no internship exists yet.
  // Lock both old/new students in the same order when reassignment is requested.
  const studentIds = [...new Set([studentNim, existing?.student_nim].filter(Boolean))].sort();
  for (const nim of studentIds) {
    const [[student]] = await db.execute('SELECT nim FROM students WHERE nim=? FOR UPDATE', [nim]);
    if (nim === studentNim && !student) fail('Mahasiswa tidak ditemukan di User Directory.');
  }
  if (existing) {
    const [[current]] = await db.execute('SELECT * FROM internships WHERE id=? FOR UPDATE', [id]);
    if (!current) fail('Data magang tidak ditemukan.', 404);
    if (current.student_nim !== existing.student_nim) fail('Data magang baru saja diubah. Muat ulang lalu coba lagi.', 409);
    existing = current;
  }
  const values = { ...(existing ? record(existing) : { status: 'PLANNED' }), ...data };
  const startupId = reference(values.startupId, 'Startup', 50);
  const academicNip = reference(values.academicSupervisorNip, 'Pembimbing akademik', 20, true);
  const academic2Nip = reference(values.academicSupervisor2Nip, 'Pembimbing akademik 2', 20, true);
  const start = date(values.startDate, 'Tanggal mulai');
  const end = date(values.endDate, 'Tanggal selesai');
  if (end < start) fail('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  if (!statuses.includes(values.status)) fail('Status magang tidak valid.');
  const fieldSupervisor = reference(values.fieldSupervisor, 'Pembimbing lapangan', 150, true);
  const [[startup]] = await db.execute('SELECT id FROM startup_teams WHERE id=? LOCK IN SHARE MODE', [startupId]);
  if (!startup) fail('Startup tidak ditemukan.');
  if (academicNip) {
    const [[lecturer]] = await db.execute('SELECT nip FROM lecturers WHERE nip=? LOCK IN SHARE MODE', [academicNip]);
    if (!lecturer) fail('Pembimbing akademik tidak ditemukan di data dosen.');
  }
  if (academic2Nip) {
    const [[lecturer]] = await db.execute('SELECT nip FROM lecturers WHERE nip=? LOCK IN SHARE MODE', [academic2Nip]);
    if (!lecturer) fail('Pembimbing akademik 2 tidak ditemukan di data dosen.');
  }
  if (activeStatuses.includes(values.status)) {
    const [overlaps] = await db.execute(`SELECT id FROM internships
      WHERE student_nim=? AND status IN ('PLANNED','ONGOING')
      AND start_date <= ? AND end_date >= ? AND id <> ? LIMIT 1 FOR UPDATE`, [studentNim, end, start, id]);
    if (overlaps.length) fail('Mahasiswa sudah memiliki magang aktif pada periode yang bertabrakan.', 409);
  }
  const params = [studentNim, startupId, start, end, fieldSupervisor, academicNip, academic2Nip, values.status];
  if (type === 'add') {
    await db.execute(`INSERT INTO internships
      (student_nim,startup_id,start_date,end_date,field_supervisor,academic_supervisor_nip,academic_supervisor2_nip,status,id)
      VALUES (?,?,?,?,?,?,?,?,?)`, [...params, id]);
  } else {
    await db.execute(`UPDATE internships SET student_nim=?,startup_id=?,start_date=?,end_date=?,
      field_supervisor=?,academic_supervisor_nip=?,academic_supervisor2_nip=?,status=? WHERE id=?`, [...params, id]);
  }
}
