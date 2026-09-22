import express from 'express';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';

const router = express.Router();
router.use(requireSession);
router.use((req, res, next) => req.user.role === 'LECTURER' ? next() : res.status(403).json({ status: 'error', message: 'Akses dosen diperlukan.' }));
const parseJson = value => {
  try { return value ? JSON.parse(value) : []; } catch { return []; }
};

const studentProjection = `
  SELECT s.nim, s.name, s.type, s.startup_id, s.startup_position, s.job_desk,
    s.is_active, s.is_approved, t.name AS startup_name, t.logo AS startup_logo,
    i.status AS internship_status, i.start_date, i.end_date, i.field_supervisor,
    i.startup_id AS internship_startup_id, it.name AS internship_startup_name,
    COALESCE(w.active_load, 0) AS active_workload
  FROM students s
  LEFT JOIN startup_teams t ON t.id=s.startup_id
  LEFT JOIN (
    SELECT i1.*
    FROM internships i1
    LEFT JOIN internships i2 ON i2.student_nim=i1.student_nim
      AND (i2.end_date > i1.end_date OR (i2.end_date=i1.end_date AND i2.id>i1.id))
    WHERE i2.id IS NULL
  ) i ON i.student_nim=s.nim
  LEFT JOIN startup_teams it ON it.id=i.startup_id
  LEFT JOIN (
    SELECT wm.member_id, COUNT(*) AS active_load
    FROM workload_members wm JOIN workloads w ON w.id=wm.workload_id
    WHERE wm.member_role='STUDENT' AND w.status='ACTIVE'
    GROUP BY wm.member_id
  ) w ON w.member_id=s.nim`;

const mapStudent = row => ({
  nim: row.nim,
  name: row.name,
  startup: row.startup_id ? { id: row.startup_id, name: row.startup_name, logoUrl: row.startup_logo, position: row.startup_position || 'MEMBER' } : null,
  internship: row.internship_status ? {
    status: row.internship_status,
    startupName: row.internship_startup_name,
    startDate: row.start_date,
    endDate: row.end_date,
    fieldSupervisor: row.field_supervisor
  } : null,
  activeWorkload: Number(row.active_workload || 0),
  memberStatus: row.is_active && row.is_approved ? 'ACTIVE' : 'INACTIVE',
  type: row.type,
  jobDesk: row.job_desk
});

router.get('/overview', async (req, res, next) => {
  try {
    const [[lecturer]] = await db.execute('SELECT nip,name,code,is_active,is_approved,job_desks FROM lecturers WHERE nip=?', [req.user.id]);
    const [[students]] = await db.execute('SELECT COUNT(*) AS total FROM students');
    const [[supervisions]] = await db.execute(`
      SELECT COUNT(*) AS total,
        SUM(i.status IN ('PLANNED','ONGOING')) AS active
      FROM internships i WHERE i.academic_supervisor_nip=?`, [req.user.id]);
    const [[pic]] = await db.execute("SELECT COUNT(*) AS total, SUM(status='ACTIVE') AS active FROM workloads WHERE pic_id=? AND pic_role='LECTURER'", [req.user.id]);
    res.set('Cache-Control', 'no-store').json({
      lecturer: { nip: lecturer.nip, name: lecturer.name, code: lecturer.code, isActive: Boolean(lecturer.is_active), isApproved: Boolean(lecturer.is_approved), jobDesks: parseJson(lecturer.job_desks) },
      summary: {
        totalStudents: Number(students.total || 0),
        totalSupervisions: Number(supervisions.total || 0),
        activeSupervisions: Number(supervisions.active || 0),
        workloadsAsPic: Number(pic.total || 0),
        activeWorkloads: Number(pic.active || 0)
      }
    });
  } catch (error) { next(error); }
});

router.get('/students', async (_req, res, next) => {
  try {
    const [rows] = await db.execute(`${studentProjection} ORDER BY s.name`);
    res.set('Cache-Control', 'no-store').json(rows.map(mapStudent));
  } catch (error) { next(error); }
});

router.get('/students/:nim', async (req, res, next) => {
  try {
    const [[student]] = await db.execute(`${studentProjection} WHERE s.nim=?`, [req.params.nim]);
    if (!student) return res.status(404).json({ status: 'error', message: 'Mahasiswa tidak ditemukan.' });
    const [internships] = await db.execute(`
      SELECT i.id,i.status,i.start_date,i.end_date,i.field_supervisor,i.startup_id,t.name AS startup_name,
        l.name AS academic_supervisor_name,l.code AS academic_supervisor_code
      FROM internships i LEFT JOIN startup_teams t ON t.id=i.startup_id
      LEFT JOIN lecturers l ON l.nip=i.academic_supervisor_nip
      WHERE i.student_nim=? ORDER BY i.end_date DESC,i.start_date DESC`, [req.params.nim]);
    const [workloads] = await db.execute(`
      SELECT w.id,w.name,w.category,w.description,w.status,w.start_date,w.end_date,wm.job_desk,
        COALESCE(l.name,s2.name) AS pic_name
      FROM workload_members wm JOIN workloads w ON w.id=wm.workload_id
      LEFT JOIN lecturers l ON l.nip=w.pic_id AND w.pic_role='LECTURER'
      LEFT JOIN students s2 ON s2.nim=w.pic_id AND w.pic_role='STUDENT'
      WHERE wm.member_id=? AND wm.member_role='STUDENT' ORDER BY w.start_date DESC,w.id`, [req.params.nim]);
    const summary = mapStudent(student);
    res.set('Cache-Control', 'no-store').json({
      ...summary,
      identity: { nim: student.nim, name: student.name, type: student.type, memberStatus: summary.memberStatus },
      startup: summary.startup ? { ...summary.startup, jobDesk: student.job_desk } : null,
      internship: { current: summary.internship, history: internships },
      workload: { activeLoad: summary.activeWorkload, totalHistory: workloads.length, active: workloads.filter(w => w.status === 'ACTIVE'), history: workloads.filter(w => w.status !== 'ACTIVE') }
    });
  } catch (error) { next(error); }
});

router.get('/supervisions', async (req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT i.id,i.student_nim,s.name AS student_name,i.startup_id,t.name AS startup_name,
        i.start_date,i.end_date,i.field_supervisor,i.status,l.name AS academic_supervisor_name,l.code AS academic_supervisor_code
      FROM internships i JOIN students s ON s.nim=i.student_nim
      LEFT JOIN startup_teams t ON t.id=i.startup_id
      LEFT JOIN lecturers l ON l.nip=i.academic_supervisor_nip
      WHERE i.academic_supervisor_nip=? ORDER BY i.end_date DESC,i.start_date DESC`, [req.user.id]);
    res.set('Cache-Control', 'no-store').json(rows);
  } catch (error) { next(error); }
});

router.get('/workloads', async (req, res, next) => {
  try {
    const [asPic] = await db.execute(`
      SELECT w.id,w.name,w.category,w.description,w.start_date,w.end_date,w.status,
        COUNT(wm.id) AS member_count
      FROM workloads w LEFT JOIN workload_members wm ON wm.workload_id=w.id
      WHERE w.pic_id=? AND w.pic_role='LECTURER' GROUP BY w.id ORDER BY w.start_date DESC,w.id`, [req.user.id]);
    const [asMember] = await db.execute(`
      SELECT w.id,w.name,w.category,w.description,w.start_date,w.end_date,w.status,wm.job_desk,
        COALESCE(l.name,s.name) AS pic_name
      FROM workload_members wm JOIN workloads w ON w.id=wm.workload_id
      LEFT JOIN lecturers l ON l.nip=w.pic_id AND w.pic_role='LECTURER'
      LEFT JOIN students s ON s.nim=w.pic_id AND w.pic_role='STUDENT'
      WHERE wm.member_id=? AND wm.member_role='LECTURER' ORDER BY w.start_date DESC,w.id`, [req.user.id]);
    res.set('Cache-Control', 'no-store').json({ asPic, asMember });
  } catch (error) { next(error); }
});

router.get('/workloads/:id', async (req, res, next) => {
  try {
    const [[workload]] = await db.execute(`
      SELECT w.id,w.name,w.category,w.description,w.start_date,w.end_date,w.status,
        l.name AS pic_name
      FROM workloads w LEFT JOIN lecturers l ON l.nip=w.pic_id AND w.pic_role='LECTURER'
      WHERE w.id=? AND ((w.pic_id=? AND w.pic_role='LECTURER') OR EXISTS (
        SELECT 1 FROM workload_members x WHERE x.workload_id=w.id AND x.member_id=? AND x.member_role='LECTURER'
      ))`, [req.params.id, req.user.id, req.user.id]);
    if (!workload) return res.status(404).json({ status: 'error', message: 'Workload tidak ditemukan.' });
    const [members] = await db.execute(`
      SELECT wm.member_id,wm.member_role,wm.job_desk,COALESCE(s.name,l.name) AS name,
        s.startup_id,s.startup_position,t.name AS startup_name
      FROM workload_members wm
      LEFT JOIN students s ON wm.member_role='STUDENT' AND s.nim=wm.member_id
      LEFT JOIN lecturers l ON wm.member_role='LECTURER' AND l.nip=wm.member_id
      LEFT JOIN startup_teams t ON t.id=s.startup_id
      WHERE wm.workload_id=? ORDER BY name`, [req.params.id]);
    res.set('Cache-Control', 'no-store').json({ ...workload, members });
  } catch (error) { next(error); }
});

router.get('/startups', async (_req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT t.id,t.name,t.logo,t.website,s.nim,s.name AS student_name,s.startup_position
      FROM startup_teams t LEFT JOIN students s ON s.startup_id=t.id AND s.type='STARTUP'
      ORDER BY t.name,s.startup_position,s.name`);
    const startups = [];
    for (const row of rows) {
      let startup = startups.find(item => item.id === row.id);
      if (!startup) { startup = { id: row.id, name: row.name, logoUrl: row.logo, website: row.website, members: [] }; startups.push(startup); }
      if (row.nim) startup.members.push({ nim: row.nim, name: row.student_name, position: row.startup_position || 'MEMBER' });
    }
    res.set('Cache-Control', 'no-store').json(startups);
  } catch (error) { next(error); }
});

export default router;
