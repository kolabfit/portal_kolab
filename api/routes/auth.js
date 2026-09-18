import express from 'express';
import db from '../lib/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = express.Router();

function memberProfile(user, role) {
        return role === 'STUDENT' ? {
          id: user.nim,
          name: user.name,
          email: user.email,
          role: 'STUDENT',
          avatar: user.avatar,
          photoIdCard: user.photo_id,
          studentType: user.type,
          startupId: user.startup_id,
          studentJobDesk: user.job_desk,
          isApproved: !!user.is_approved,
          isActive: !!user.is_active,
          customQuota: user.custom_quota,
          customMaxUpload: user.custom_max_upload,
          studentStatuses: JSON.parse(user.statuses || '[]'),
          youtube: user.youtube || "",
          spotify: user.spotify || ""
        } : {
          id: user.nip,
          name: user.name,
          email: user.email,
          role: 'LECTURER',
          avatar: user.avatar,
          photoIdCard: user.photo_id,
          lecturerJobDesks: JSON.parse(user.job_desks || '[]'),
          lecturerCode: user.code,
          isApproved: !!user.is_approved,
          isActive: !!user.is_active,
          customQuota: user.custom_quota,
          customMaxUpload: user.custom_max_upload,
          youtube: user.youtube || "",
          spotify: user.spotify || ""
        };
}

function adminProfile(admin) {
  return { id: 'ROOT', name: admin.name || 'SYSTEM ADMIN', email: admin.email || '', role: 'ADMIN', avatar: admin.avatar || '', photoIdCard: admin.photo_id || '',
    isApproved: true, isActive: true, youtube: admin.youtube || '', spotify: admin.spotify || '' };
}

router.get('/session', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  let claims;
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!['ADMIN', 'STUDENT', 'LECTURER'].includes(claims.role) || !claims.exp) throw new Error('Invalid session');
  } catch {
    return res.status(401).json({ status: 'error', message: 'Session expired or invalid.' });
  }
  try {
    const table = claims.role === 'ADMIN' ? 'admins' : claims.role === 'STUDENT' ? 'students' : 'lecturers';
    const field = claims.role === 'ADMIN' ? 'username' : claims.role === 'STUDENT' ? 'nim' : 'nip';
    const identity = claims.role === 'ADMIN' ? claims.username : claims.id;
    if (typeof identity !== 'string' || !identity) return res.status(401).json({ status: 'error' });
    const [rows] = await db.execute('SELECT * FROM ' + table + ' WHERE ' + field + ' = ?', [identity]);
    if (!rows.length) return res.status(401).json({ status: 'error', message: 'Account no longer exists.' });
    const profile = claims.role === 'ADMIN' ? adminProfile(rows[0]) : memberProfile(rows[0], claims.role);
    return res.json({ status: 'success', profile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Unable to restore session.' });
  }
});

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

router.post('/login', async (req, res) => {
  const { username, password, isAdmin, role, id } = req.body;
  if (typeof password !== 'string' || (!isAdmin && !['STUDENT', 'LECTURER'].includes(role))) {
    return res.status(400).json({ status: 'error', message: 'Invalid login details.' });
  }
  const hashed = sha256(password);

  try {
    if (isAdmin) {
      const [rows] = await db.execute(
        'SELECT * FROM admins WHERE username = ? AND password = ?',
        [username, hashed]
      );
      if (rows.length > 0) {
        const admin = rows[0];
        const token = jwt.sign({ username: admin.username, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({
          status: 'success',
          profile: adminProfile(admin),
          role: 'ADMIN',
          name: 'SYSTEM ROOT',
          youtube: admin.youtube || "",
          spotify: admin.spotify || "",
          token
        });
      }
    } else {
      const isS = role === 'STUDENT';
      const table = isS ? 'students' : 'lecturers';
      const idField = isS ? 'nim' : 'nip';
      
      const [rows] = await db.execute(
        `SELECT * FROM ${table} WHERE ${idField} = ? AND password = ?`,
        [id, hashed]
      );

      if (rows.length > 0) {
        const user = rows[0];
        const token = jwt.sign({ id: user[idField], role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        const profile = memberProfile(user, role);

        return res.json({ status: 'success', profile, token });
      }
    }
    return res.status(401).json({ status: 'error', message: 'Identity verification failed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/register', async (req, res) => {
  const { id, password, name, role, studentType, startupId, studentJobDesk, lecturerCode } = req.body;
  if (!id || !name || !['STUDENT', 'LECTURER'].includes(role)) {
    return res.status(400).json({
      status: 'error',
      message: 'ID, name, and a valid role are required.'
    });
  }
  const actualPassword = password || (role === 'STUDENT' ? 'memberkolab' : 'dosenkolab');
  if (String(id).length > 20) {
    return res.status(400).json({
      status: 'error',
      message: 'ID cannot be longer than 20 characters.'
    });
  }
  const isS = role === 'STUDENT';
  const table = isS ? 'students' : 'lecturers';
  const idField = isS ? 'nim' : 'nip';
  const hashed = sha256(actualPassword);

  try {
    const [existing] = await db.execute(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id]);
    if (existing.length > 0) return res.status(409).json({ status: 'error', message: 'Identity Conflict.' });

    if (isS) {
      await db.execute(
        `INSERT INTO students (nim, password, name, type, startup_id, job_desk, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, hashed, name, studentType || 'NON_STARTUP', startupId || '', studentJobDesk || 'Non Jobdesk', 'https://i.pravatar.cc/150']
      );
    } else {
      await db.execute(
        `INSERT INTO lecturers (nip, password, name, code, avatar) VALUES (?, ?, ?, ?, ?)`,
        [id, hashed, name, lecturerCode || '', 'https://i.pravatar.cc/150']
      );
    }
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
