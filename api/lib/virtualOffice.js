export async function migrateVirtualOffice(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS virtual_office_settings (
    id TINYINT UNSIGNED PRIMARY KEY,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    room_overrides JSON NOT NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
  await db.execute('INSERT IGNORE INTO virtual_office_settings (id, room_overrides) VALUES (1, JSON_OBJECT())');
}

const positionLabels = { CEO: 'CEO', COO: 'COO', CTO: 'CTO', CFO: 'CFO', CMO: 'CMO', MEMBER: 'Anggota' };

function lecturerTitle(jobDesks) {
  try {
    const first = JSON.parse(jobDesks || '[]')[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
  } catch { /* fall back below */ }
  return 'Dosen';
}

// Default title: startup position for startup students, otherwise job desk; first job desk for lecturers.
function memberTitle(row) {
  if (row.role === 'LECTURER') return lecturerTitle(row.job_desks);
  if (row.type === 'STARTUP' && row.startup_position) {
    return [positionLabels[row.startup_position] ?? row.startup_position, row.startup_name].filter(Boolean).join(' ');
  }
  return row.job_desk?.trim() || 'Mahasiswa';
}

export const memberKey = ({ role, id }) => role + ':' + id;

// Active, approved students and lecturers keyed by memberKey().
export async function activeMembers(db) {
  const [rows] = await db.execute(`
    SELECT 'STUDENT' AS role, s.nim AS id, s.name, s.type, s.startup_position, s.job_desk, t.name AS startup_name, NULL AS job_desks
    FROM students s LEFT JOIN startup_teams t ON t.id = s.startup_id
    WHERE IFNULL(s.is_active, 1) AND IFNULL(s.is_approved, 1)
    UNION ALL
    SELECT 'LECTURER', nip, name, NULL, NULL, NULL, NULL, job_desks
    FROM lecturers WHERE IFNULL(is_active, 1) AND IFNULL(is_approved, 1)`);
  return new Map(rows.map(row => {
    const member = { role: row.role, id: row.id, name: row.name, title: memberTitle(row) };
    return [memberKey(member), member];
  }));
}
