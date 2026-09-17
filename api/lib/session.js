import jwt from 'jsonwebtoken';
import db from './db.js';

export async function requireSession(req, res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!claims.exp || !['ADMIN', 'STUDENT', 'LECTURER'].includes(claims.role)) throw new Error();
    const table = claims.role === 'ADMIN' ? 'admins' : claims.role === 'STUDENT' ? 'students' : 'lecturers';
    const field = claims.role === 'ADMIN' ? 'username' : claims.role === 'STUDENT' ? 'nim' : 'nip';
    const identity = claims.role === 'ADMIN' ? claims.username : claims.id;
    const [rows] = await db.execute(`SELECT * FROM ${table} WHERE ${field}=?`, [identity]);
    if (!rows.length) throw new Error();
    req.user = { ...claims, id: claims.role === 'ADMIN' ? 'ROOT' : identity, account: rows[0] };
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Silakan login kembali.' });
  }
}
