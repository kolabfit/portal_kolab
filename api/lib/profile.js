import crypto from 'node:crypto';

export async function saveProfile(db, role, identity, data, administrative = false) {
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
  const [existing] = await db.execute(`SELECT ${key} FROM ${table} WHERE ${key}=?`, [identity]);
  if (!existing.length) throw Object.assign(new Error('Member tidak ditemukan.'), { status: 404 });
  if (updates.length) await db.execute(`UPDATE ${table} SET ${updates.join(',')} WHERE ${key}=?`, [...values, identity]);
}
