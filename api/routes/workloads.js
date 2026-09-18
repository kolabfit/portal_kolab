import express from 'express';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';
import { createWorkloadId, createWorkloadMemberId, listWorkloads, memberExists, memberSummary, validateWorkload, workloadDetail, MEMBER_ROLES } from '../lib/workload.js';

const router = express.Router();
router.use(requireSession);
router.use((req, res, next) => req.user.role === 'ADMIN' ? next() : res.status(403).json({ status: 'error', message: 'Akses admin diperlukan.' }));
const actorId = (req) => req.user.id || req.user.username;
const audit = async (conn, req, action, details) => conn.execute('INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), ?, ?, ?)', [action, actorId(req), JSON.stringify(details)]);

router.get('/', async (_req, res, next) => { try { res.json(await listWorkloads(db)); } catch (e) { next(e); } });
router.get('/member-summary', async (_req, res, next) => { try { res.json(await memberSummary(db)); } catch (e) { next(e); } });
router.get('/:id', async (req, res, next) => { try { res.json(await workloadDetail(db, req.params.id)); } catch (e) { next(e); } });

router.post('/', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const data = await validateWorkload(conn, req.body);
    const workloadId = createWorkloadId();
    await conn.beginTransaction();
    await conn.execute(`INSERT INTO workloads (id,name,category,description,start_date,end_date,status,pic_id,pic_role,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [workloadId, data.name, data.category, data.description || '', data.startDate || null, data.endDate || null, data.status, data.picId, data.picRole, actorId(req)]);
    await audit(conn, req, 'createWorkload', { workloadId });
    await conn.commit(); res.status(201).json({ status: 'success', id: workloadId });
  } catch (e) { await conn.rollback().catch(() => {}); next(e); } finally { conn.release(); }
});

router.put('/:id', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const data = await validateWorkload(conn, req.body);
    await conn.beginTransaction();
    const [result] = await conn.execute(`UPDATE workloads SET name=?,category=?,description=?,start_date=?,end_date=?,status=?,pic_id=?,pic_role=? WHERE id=?`,
      [data.name, data.category, data.description || '', data.startDate || null, data.endDate || null, data.status, data.picId, data.picRole, req.params.id]);
    if (!result.affectedRows) throw Object.assign(new Error('Workload tidak ditemukan.'), { status: 404 });
    await audit(conn, req, 'updateWorkload', { workloadId: req.params.id });
    await conn.commit(); res.json({ status: 'success', id: req.params.id });
  } catch (e) { await conn.rollback().catch(() => {}); next(e); } finally { conn.release(); }
});

router.delete('/:id', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute('DELETE FROM workloads WHERE id=?', [req.params.id]);
    if (!result.affectedRows) throw Object.assign(new Error('Workload tidak ditemukan.'), { status: 404 });
    await audit(conn, req, 'deleteWorkload', { workloadId: req.params.id });
    await conn.commit(); res.json({ status: 'success' });
  } catch (e) { await conn.rollback().catch(() => {}); next(e); } finally { conn.release(); }
});

router.post('/:id/members/bulk', async (req, res, next) => {
  const conn = await db.getConnection();
  let transactionStarted = false;
  try {
    const members = Array.isArray(req.body.members) ? req.body.members : [];
    if (!members.length || members.length > 500) throw Object.assign(new Error('Daftar member tidak valid.'), { status: 400 });
    await conn.beginTransaction();
    transactionStarted = true;
    const [workload] = await conn.execute('SELECT id FROM workloads WHERE id=? FOR UPDATE', [req.params.id]);
    if (!workload.length) throw Object.assign(new Error('Workload tidak ditemukan.'), { status: 404 });
    const seen = new Set();
    for (const member of members) {
      const memberId = String(member.memberId || '').trim();
      const role = String(member.memberRole || '').toUpperCase();
      if (!memberId || !MEMBER_ROLES.includes(role)) throw Object.assign(new Error(`Member atau role tidak valid: ${memberId}`), { status: 400 });
      if (seen.has(`${role}:${memberId}`)) throw Object.assign(new Error(`Member duplicate dalam request: ${memberId}`), { status: 409 });
      if (!(await memberExists(conn, memberId, role))) throw Object.assign(new Error(`Member tidak ditemukan: ${memberId}`), { status: 400 });
      if (String(member.jobDesk || '').length > 255) throw Object.assign(new Error('Job desk terlalu panjang.'), { status: 400 });
      seen.add(`${role}:${memberId}`);
      const [existing] = await conn.execute('SELECT id FROM workload_members WHERE workload_id=? AND member_id=? AND member_role=?', [req.params.id, memberId, role]);
      if (existing.length) throw Object.assign(new Error(`Member sudah terdaftar: ${memberId}`), { status: 409 });
    }
    for (const member of members) await conn.execute('INSERT INTO workload_members (id,workload_id,member_id,member_role,job_desk,joined_at) VALUES (?,?,?,?,?,?)',
      [createWorkloadMemberId(), req.params.id, String(member.memberId).trim(), String(member.memberRole).toUpperCase(), String(member.jobDesk || '').trim() || null, String(member.joinedAt || '').trim() || null]);
    await audit(conn, req, 'addWorkloadMembers', { workloadId: req.params.id, memberCount: members.length });
    await conn.commit(); res.json({ status: 'success', affected: members.length });
  } catch (e) {
    if (transactionStarted) await conn.rollback().catch(() => {});
    if (e.code === 'ER_DUP_ENTRY') e = Object.assign(new Error('Member sudah terdaftar pada workload ini.'), { status: 409 });
    next(e);
  } finally { conn.release(); }
});

router.put('/:id/members/:role/:memberId', async (req, res, next) => {
  try {
    const jobDesk = String(req.body.jobDesk || '').trim() || null;
    const [result] = await db.execute('UPDATE workload_members SET job_desk=? WHERE workload_id=? AND member_role=? AND member_id=?', [jobDesk, req.params.id, req.params.role.toUpperCase(), req.params.memberId]);
    if (!result.affectedRows) return res.status(404).json({ status: 'error', message: 'Member workload tidak ditemukan.' });
    await db.execute('INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), ?, ?, ?)', ['updateWorkloadMember', req.user.id || req.user.username, JSON.stringify({ workloadId: req.params.id, memberId: req.params.memberId, jobDesk })]);
    res.json({ status: 'success' });
  } catch (e) { next(e); }
});

router.delete('/:id/members/:role/:memberId', async (req, res, next) => {
  try {
    const [result] = await db.execute('DELETE FROM workload_members WHERE workload_id=? AND member_role=? AND member_id=?', [req.params.id, req.params.role.toUpperCase(), req.params.memberId]);
    if (!result.affectedRows) return res.status(404).json({ status: 'error', message: 'Member workload tidak ditemukan.' });
    await db.execute('INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), ?, ?, ?)', ['removeWorkloadMember', req.user.id, JSON.stringify({ workloadId: req.params.id, memberId: req.params.memberId })]);
    res.json({ status: 'success' });
  } catch (e) { next(e); }
});

export default router;
