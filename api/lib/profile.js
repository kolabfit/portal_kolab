import { resolveStartupMembership, logStartupPosition } from './startupPosition.js';
import crypto from 'node:crypto';

export async function saveProfile(db, role, identity, data, administrative = false, actor = 'ROOT') {
  const student = role === 'STUDENT';
  const admin = role === 'ADMIN';
  const table = admin ? 'admins' : student ? 'students' : 'lecturers';
  const key = admin ? 'username' : student ? 'nim' : 'nip';
  const fields = admin ? { name: 'name', email: 'email', avatar: 'avatar', photoIdCard: 'photo_id', youtube: 'youtube', spotify: 'spotify' } : {
    name: 'name', email: 'email', avatar: 'avatar', photoIdCard: 'photo_id',
    youtube: 'youtube', spotify: 'spotify',
    ...(student ? { studentType: 'type', startupId: 'startup_id', studentJobDesk: 'job_desk', studentStatuses: 'statuses' }
      : { lecturerCode: 'code', lecturerJobDesks: 'job_desks' }),
    ...(administrative ? { isApproved: 'is_approved', isActive: 'is_active' } : {})
  };
  const [[current]] = await db.execute(`SELECT * FROM ${table} WHERE ${key}=? FOR UPDATE`, [identity]);
  if (!current) throw Object.assign(new Error('Member tidak ditemukan.'), { status: 404 });
  if (student) {
    if (!administrative) {
      if (data.startupPosition !== undefined || data.startup_position !== undefined) throw Object.assign(new Error('Hanya admin yang dapat mengubah posisi startup.'), { status: 403 });
      // Membership is admin-managed; ignore stale values from the self-profile form.
      delete fields.studentType;
      delete fields.startupId;
    } else {
      const membership = await resolveStartupMembership(db, data, current);
      data = { ...data, ...membership };
      fields.startupPosition = 'startup_position';
      await logStartupPosition(db, actor, identity, current, membership);
    }
  }
  const updates = [], values = [];
  for (const [property, column] of Object.entries(fields)) {
    if (data[property] === undefined) continue;
    updates.push(`${column}=?`);
    values.push(['statuses', 'job_desks'].includes(column) ? JSON.stringify(data[property] || []) : data[property]);
  }
  if (data.password) {
    updates.push('password=?');
    values.push(crypto.createHash('sha256').update(data.password).digest('hex'));
  }
  if (updates.length) await db.execute(`UPDATE ${table} SET ${updates.join(',')} WHERE ${key}=?`, [...values, identity]);
}
