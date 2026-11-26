import { parseMeetingLink } from './meetingLinks.js';

// Records who opened an online schedule's meeting through the portal's "Gabung" button. Google Meet and
// Zoom expose no participant data for a plain link, so this only counts joins made from the portal.
export async function migrateScheduleJoins(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS schedule_joins (
    schedule_id VARCHAR(100) NOT NULL, user_role VARCHAR(20) NOT NULL, user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL DEFAULT '', joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (schedule_id, user_role, user_id), KEY idx_schedule_joins_time (schedule_id, joined_at))`);
}

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const userId = user => user.role === 'ADMIN' ? user.username : user.id;

export async function listScheduleJoins(db, scheduleId) {
  const [rows] = await db.execute('SELECT user_name, user_role, joined_at FROM schedule_joins WHERE schedule_id=? ORDER BY joined_at', [scheduleId ?? '']);
  return rows.map(row => ({ name: row.user_name, role: row.user_role, joinedAt: new Date(row.joined_at).toISOString() }));
}

export async function joinSchedule(db, user, scheduleId) {
  const [[schedule]] = await db.execute('SELECT meet_link, location_offline FROM schedules WHERE id=?', [scheduleId ?? '']);
  if (!schedule) throw fail('Jadwal tidak ditemukan.', 404);
  // Older schedules kept the meeting URL in the location field.
  if (!parseMeetingLink(schedule.meet_link) && !parseMeetingLink(schedule.location_offline)) throw fail('Jadwal ini tidak punya link meeting online.');
  // Re-joining only refreshes the time, so each member counts once.
  await db.execute(`INSERT INTO schedule_joins (schedule_id, user_role, user_id, user_name) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE joined_at=CURRENT_TIMESTAMP, user_name=VALUES(user_name)`,
  [scheduleId, user.role, userId(user), user.account?.name || userId(user)]);
  return { status: 'success', joins: await listScheduleJoins(db, scheduleId) };
}
