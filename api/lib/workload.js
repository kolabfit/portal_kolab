import crypto from 'node:crypto';

export const WORKLOAD_CATEGORIES = ['PKM', 'PROJECT', 'RESEARCH', 'COMPETITION'];
export const WORKLOAD_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
export const MEMBER_ROLES = ['STUDENT', 'LECTURER'];

const id = prefix => `${prefix}-${crypto.randomUUID()}`;
const text = value => String(value ?? '').trim();

async function memberExists(conn, memberId, role) {
  const table = role === 'STUDENT' ? 'students' : 'lecturers';
  const field = role === 'STUDENT' ? 'nim' : 'nip';
  const [rows] = await conn.execute(`SELECT name FROM ${table} WHERE ${field}=? LIMIT 1`, [memberId]);
  return rows[0] || null;
}

export async function validateWorkload(conn, input) {
  const data = { ...input, name: text(input.name), category: text(input.category).toUpperCase(), status: text(input.status || 'PLANNED').toUpperCase(), picId: text(input.picId), picRole: text(input.picRole).toUpperCase() };
  if (!data.name) throw Object.assign(new Error('Nama workload wajib diisi.'), { status: 400 });
  if (!WORKLOAD_CATEGORIES.includes(data.category)) throw Object.assign(new Error('Kategori workload tidak valid.'), { status: 400 });
  if (!WORKLOAD_STATUSES.includes(data.status)) throw Object.assign(new Error('Status workload tidak valid.'), { status: 400 });
  if (data.startDate && data.endDate && data.endDate < data.startDate) throw Object.assign(new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.'), { status: 400 });
  if (!data.picId || !MEMBER_ROLES.includes(data.picRole)) throw Object.assign(new Error('PIC dan role PIC wajib valid.'), { status: 400 });
  if (!(await memberExists(conn, data.picId, data.picRole))) throw Object.assign(new Error('PIC tidak ditemukan.'), { status: 400 });
  return data;
}

export async function listWorkloads(conn) {
  const [rows] = await conn.execute(`
    SELECT w.*, COALESCE(sm.name, lm.name) AS pic_name, COUNT(wm.id) AS member_count
    FROM workloads w
    LEFT JOIN students sm ON w.pic_role='STUDENT' AND sm.nim=w.pic_id
    LEFT JOIN lecturers lm ON w.pic_role='LECTURER' AND lm.nip=w.pic_id
    LEFT JOIN workload_members wm ON wm.workload_id=w.id
    GROUP BY w.id ORDER BY w.created_at DESC`);
  return rows;
}

export async function workloadDetail(conn, workloadId) {
  const [workloads] = await conn.execute(`
    SELECT w.*, COALESCE(sm.name, lm.name) AS pic_name
    FROM workloads w
    LEFT JOIN students sm ON w.pic_role='STUDENT' AND sm.nim=w.pic_id
    LEFT JOIN lecturers lm ON w.pic_role='LECTURER' AND lm.nip=w.pic_id
    WHERE w.id=?`, [workloadId]);
  if (!workloads.length) throw Object.assign(new Error('Workload tidak ditemukan.'), { status: 404 });
  const [members] = await conn.execute(`
    SELECT wm.*, COALESCE(s.name, l.name) AS member_name, s.startup_id
    FROM workload_members wm
    LEFT JOIN students s ON wm.member_role='STUDENT' AND s.nim=wm.member_id
    LEFT JOIN lecturers l ON wm.member_role='LECTURER' AND l.nip=wm.member_id
    WHERE wm.workload_id=? ORDER BY member_name`, [workloadId]);
  return { ...workloads[0], members };
}

export async function memberSummary(conn) {
  const [rows] = await conn.execute(`
    SELECT x.member_id AS memberId, x.member_role AS memberRole,
      COALESCE(s.name, l.name) AS name, s.startup_id AS startupId,
      SUM(w.status='ACTIVE') AS activeLoad, COUNT(*) AS totalHistory,
      SUM(w.status='ACTIVE' AND w.category='PKM') AS pkmLoad,
      SUM(w.status='ACTIVE' AND w.category='PROJECT') AS projectLoad,
      SUM(w.status='ACTIVE' AND w.category='RESEARCH') AS researchLoad,
      SUM(w.status='ACTIVE' AND w.category='COMPETITION') AS competitionLoad
    FROM workload_members x JOIN workloads w ON w.id=x.workload_id
    LEFT JOIN students s ON x.member_role='STUDENT' AND s.nim=x.member_id
    LEFT JOIN lecturers l ON x.member_role='LECTURER' AND l.nip=x.member_id
    GROUP BY x.member_id, x.member_role, s.name, l.name, s.startup_id ORDER BY name`);
  return rows;
}

export const createWorkloadId = () => id('workload');
// workload_members.id is VARCHAR(36); keep the generated identifier within the schema limit.
export const createWorkloadMemberId = () => crypto.randomUUID();
export { memberExists };
