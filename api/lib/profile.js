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

// Ganti NIM mahasiswa (admin). NIM adalah ID login dan dirujuk tabel lain tanpa foreign key,
// jadi semua rujukan dipindah di transaksi yang sama. system_logs sengaja tidak diubah (jejak audit).
export async function renameStudentNim(db, oldNim, newNim) {
  newNim = String(newNim || '').trim();
  if (!/^[A-Za-z0-9._-]{3,20}$/.test(newNim)) throw Object.assign(new Error('NIM baru harus 3–20 karakter (huruf, angka, titik, strip, garis bawah).'), { status: 400 });
  if (newNim === oldNim) return oldNim;
  const [[taken]] = await db.execute('SELECT nim FROM students WHERE nim=? FOR UPDATE', [newNim]);
  if (taken) throw Object.assign(new Error(`NIM ${newNim} sudah dipakai mahasiswa lain.`), { status: 409 });
  const [moved] = await db.execute('UPDATE students SET nim=? WHERE nim=?', [newNim, oldNim]);
  if (!moved.affectedRows) throw Object.assign(new Error('Member tidak ditemukan.'), { status: 404 });
  await db.execute('UPDATE internships SET student_nim=? WHERE student_nim=?', [newNim, oldNim]);
  await db.execute("UPDATE workload_members SET member_id=? WHERE member_id=? AND member_role='STUDENT'", [newNim, oldNim]);
  await db.execute("UPDATE workloads SET pic_id=? WHERE pic_id=? AND pic_role='STUDENT'", [newNim, oldNim]);
  await db.execute("UPDATE repo SET owner_id=? WHERE owner_id=? AND role='STUDENT'", [newNim, oldNim]);
  await db.execute("UPDATE trash SET owner_id=? WHERE owner_id=? AND role='STUDENT'", [newNim, oldNim]);
  await db.execute("UPDATE cdn_assets SET owner_id=? WHERE owner_id=? AND owner_role='STUDENT'", [newNim, oldNim]);
  await db.execute('UPDATE cdn_assets SET created_by=? WHERE created_by=?', [newNim, oldNim]);
  return newNim;
}
