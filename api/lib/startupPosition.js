export const STARTUP_POSITIONS = Object.freeze(['CEO', 'COO', 'CTO', 'CFO', 'CMO', 'MEMBER']);
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };

export function validateStartupPosition(position, { normalize = false } = {}) {
  if (position === undefined || position === null || position === '') return null;
  if (normalize && typeof position === 'string') {
    position = position.trim().toUpperCase();
    if (position === 'ANGGOTA') position = 'MEMBER';
    if (!position) return null;
  }
  if (!STARTUP_POSITIONS.includes(position)) fail('Posisi startup tidak valid. Gunakan CEO, COO, CTO, CFO, CMO, atau MEMBER.');
  return position;
}

// Caller owns the transaction. Lock the parent even for MEMBER, so leadership
// checks and inserts from registration, profile edits and imports share a lock.
export async function checkStartupLeadershipPosition(db, startupId, position, excludeStudentId = '') {
  const [[startup]] = await db.execute('SELECT id,name FROM startup_teams WHERE id=? FOR UPDATE', [startupId]);
  if (!startup) fail('Startup tidak ditemukan.');
  if (position !== 'MEMBER') {
    const [[occupied]] = await db.execute("SELECT nim,name FROM students WHERE startup_id=? AND startup_position=? AND nim<>? AND type='STARTUP' LIMIT 1 FOR UPDATE", [startupId, position, excludeStudentId]);
    if (occupied) fail(`Posisi ${position} pada startup ${startup.name} sudah diisi oleh ${occupied.name}.`);
  }
}

export async function resolveStartupMembership(db, data, current = {}, options = {}) {
  const type = data.studentType ?? current.type ?? 'NON_STARTUP';
  if (!['STARTUP', 'NON_STARTUP'].includes(type)) fail('Tipe mahasiswa tidak valid.');
  const startupId = data.startupId !== undefined ? (data.startupId || null) : (current.startup_id || null);
  const supplied = validateStartupPosition(data.startupPosition, options);
  if (type !== 'STARTUP' || !startupId) return { studentType: type, startupId: type === 'STARTUP' ? startupId : null, startupPosition: null };
  const moved = startupId !== current.startup_id || type !== current.type;
  const position = validateStartupPosition(supplied || (moved ? 'MEMBER' : current.startup_position || 'MEMBER'));
  await checkStartupLeadershipPosition(db, startupId, position, current.nim);
  return { studentType: type, startupId, startupPosition: position };
}

export async function logStartupPosition(db, actor, studentId, current, next) {
  if ((current.startup_position || null) === next.startupPosition && (current.startup_id || null) === next.startupId) return;
  await db.execute('INSERT INTO system_logs (timestamp,action,user_id,details) VALUES (NOW(),?,?,?)',
    ['updateStartupPosition', actor, JSON.stringify({ studentId, startupId: next.startupId, oldPosition: current.startup_position || null, newPosition: next.startupPosition })]);
}

export async function migrateStartupPosition(db) {
  const [columns] = await db.query('SHOW COLUMNS FROM students');
  if (!columns.some(column => column.Field === 'startup_position')) {
    await db.query('ALTER TABLE students ADD COLUMN startup_position VARCHAR(20) NULL');
  }
  const [indexes] = await db.query('SHOW INDEX FROM students');
  if (!indexes.some(index => index.Key_name === 'idx_students_startup_position')) {
    await db.query('CREATE INDEX idx_students_startup_position ON students (startup_id,startup_position)');
  }
  await db.execute("UPDATE students s JOIN startup_teams t ON t.id=s.startup_id SET s.startup_position='MEMBER' WHERE s.type='STARTUP' AND (s.startup_position IS NULL OR s.startup_position='')");
  await db.execute("UPDATE students s LEFT JOIN startup_teams t ON t.id=s.startup_id SET s.startup_position=NULL WHERE s.type IS NULL OR s.type<>'STARTUP' OR t.id IS NULL");
}
