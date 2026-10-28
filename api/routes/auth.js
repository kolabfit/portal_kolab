import { requireSession } from '../lib/session.js';
import { resolveStartupMembership, logStartupPosition } from '../lib/startupPosition.js';
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
          startupPosition: user.type === 'STARTUP' && user.startup_id ? user.startup_position : null,
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

// Rate limiter sederhana untuk mencegah serangan brute-force login (10 percobaan per 5 menit)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  if (record.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((record.firstAttempt + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || (now - record.firstAttempt > RATE_LIMIT_WINDOW_MS)) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
  }
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

router.post('/login', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
  const limitCheck = checkRateLimit(clientIp);
  if (!limitCheck.allowed) {
    res.setHeader('Retry-After', String(limitCheck.retryAfter));
    return res.status(429).json({
      status: 'error',
      message: `Terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${limitCheck.retryAfter} detik.`
    });
  }

  let { username, password, isAdmin, role, id } = req.body;
  if (typeof password === 'string') password = password.trim();
  if (typeof id === 'string') id = id.trim();
  if (typeof username === 'string') username = username.trim();
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
        clearLoginAttempts(clientIp);
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
        clearLoginAttempts(clientIp);
        const user = rows[0];
        const token = jwt.sign({ id: user[idField], role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        const profile = memberProfile(user, role);

        return res.json({ status: 'success', profile, token });
      }
    }
    recordFailedLogin(clientIp);
    return res.status(401).json({ status: 'error', message: 'Identity verification failed.' });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Terjadi kesalahan sistem saat memproses login.'
    });
  }
});

// Lupa password: member mengajukan password baru, aktif setelah admin menyetujui di Kelola Member
// (bridge manageMember type approvePasswordReset). Respons selalu sama supaya NIM/NIP terdaftar tidak
// bisa ditebak; ikut kuota rate limit login per IP.
router.post('/forgot-password', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
  const limitCheck = checkRateLimit(clientIp);
  if (!limitCheck.allowed) {
    res.setHeader('Retry-After', String(limitCheck.retryAfter));
    return res.status(429).json({ status: 'error', message: `Terlalu banyak percobaan. Silakan coba lagi dalam ${limitCheck.retryAfter} detik.` });
  }
  const { role } = req.body;
  const id = typeof req.body.id === 'string' ? req.body.id.trim() : '';
  if (!['STUDENT', 'LECTURER'].includes(role) || !id || id.length > 20) {
    return res.status(400).json({ status: 'error', message: 'Role dan NIM/NIP wajib diisi.' });
  }
  const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
  if (password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'Password baru minimal 6 karakter.' });
  }
  recordFailedLogin(clientIp);
  try {
    const isS = role === 'STUDENT';
    await db.execute(`UPDATE ${isS ? 'students' : 'lecturers'} SET pending_password=?, reset_requested_at=NOW() WHERE ${isS ? 'nim' : 'nip'}=?`, [sha256(password), id]);
    res.json({ status: 'success', message: 'Jika akun terdaftar, permintaan ganti password sudah dikirim. Password baru aktif setelah disetujui admin.' });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ status: 'error', message: 'Terjadi kesalahan sistem.' });
  }
});

router.post('/register', (req, res, next) => req.headers.authorization ? requireSession(req, res, next) : next(), async (req, res) => {
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

  const requestedPosition = req.body.startupPosition ?? req.body.startup_position;
  if (isS && requestedPosition != null && req.user?.role !== 'ADMIN') return res.status(403).json({ status: 'error', message: 'Hanya admin yang dapat menetapkan posisi startup.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id]);
    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ status: 'error', message: 'Identity Conflict.' });
    }
    if (isS) {
      const membership = await resolveStartupMembership(connection, { studentType, startupId, startupPosition: requestedPosition });
      await connection.execute(
        'INSERT INTO students (nim,password,name,type,startup_id,startup_position,job_desk,avatar) VALUES (?,?,?,?,?,?,?,?)',
        [id, hashed, name, membership.studentType, membership.startupId, membership.startupPosition, studentJobDesk || 'Non Jobdesk', 'https://i.pravatar.cc/150']
      );
      await logStartupPosition(connection, req.user?.id || id, id, {}, membership);
    } else {
      await connection.execute('INSERT INTO lecturers (nip,password,name,code,avatar) VALUES (?,?,?,?,?)', [id, hashed, name, lecturerCode || '', 'https://i.pravatar.cc/150']);
    }
    await connection.commit();
    res.json({ status: 'success' });
  } catch (error) {
    await connection.rollback();
    res.status(error.status || 500).json({ status: 'error', message: error.message });
  } finally { connection.release(); }
});

export default router;
