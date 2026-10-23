import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import http from 'node:http';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), quiet: true });
const database = `portal_kolab_test_${crypto.randomBytes(6).toString('hex')}`;
let control, db, server, base, token, studentToken, lecturerToken, provider;
let migrationData = {}, failProvider = false;
const password = 'Persistence-test-123!';
async function request(path, body, bearer = token, expected = 200) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Connection: 'close', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  if (expected === 200 && body && !Array.isArray(result) && !result.items) assert.equal(result.status, 'success', JSON.stringify(result));
  return result;
}
const bridge = (action, payload = {}, bearer = token, expected = 200) => request('/bridge', { ...payload, action }, bearer, expected);

test('startup positions: migration, allowlist, leadership, edits, security and transfers', async t => {
  const { migrateStartupPosition } = await import('../lib/startupPosition.js');
  const XLSX = (await import('xlsx')).default;
  const startup = 'position-startup', other = 'position-other';
  await bridge('manageStartup', { type: 'add', id: startup, data: { name: 'KROOMBOX' } });
  await bridge('manageStartup', { type: 'add', id: other, data: { name: 'NGOLAB' } });
  const register = (id, position, startupId = startup, extra = {}, expected = 200, bearer = token) => request('/auth/register', { id, role: 'STUDENT', name: id, password, studentType: 'STARTUP', startupId, startupPosition: position, studentJobDesk: 'Backend & Infrastructure', ...extra }, bearer, expected);
  const stored = async id => (await db.execute('SELECT * FROM students WHERE nim=?', [id]))[0][0];
  const edit = (id, data, expected = 200, bearer = token) => bridge('manageMember', { type: 'updateIdentity', targetId: id, role: 'STUDENT', data }, bearer, expected);
  const commit = rows => request('/admin/members/import/commit', { role: 'STUDENT', rows });
  const preview = async (rows, positionHeader = 'startup_position') => {
    const form = new FormData();
    const csv = ['nim,name,type,startup_id,' + positionHeader, ...rows.map(row => row.join(','))].join('\n');
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'positions.csv');
    form.append('role', 'STUDENT'); form.append('duplicateMode', 'update');
    const response = await fetch(base + '/admin/members/import/preview', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    assert.equal(response.status, 200);
    return response.json();
  };

  await t.test('migration adds missing column/index, defaults existing members, preserves job desk and repeats safely', async () => {
    // Only alter the isolated disposable test database.
    assert.match(process.env.DB_NAME, /^portal_kolab_test_[a-f0-9]{12}$/);
    await db.query('ALTER TABLE students DROP INDEX idx_students_startup_position, DROP COLUMN startup_position');
    await db.execute("INSERT INTO students (nim,name,password,type,startup_id,job_desk) VALUES ('legacy-position','Legacy','hash','STARTUP',?,'CEO / Backend')", [startup]);
    await migrateStartupPosition(db);
    assert.equal((await stored('legacy-position')).startup_position, 'MEMBER');
    assert.equal((await stored('legacy-position')).job_desk, 'CEO / Backend');
    await edit('legacy-position', { startupPosition: 'CTO' });
    const before = await stored('legacy-position');
    await migrateStartupPosition(db); await migrateStartupPosition(db);
    assert.deepEqual(await stored('legacy-position'), before);
    await edit('legacy-position', { startupPosition: 'MEMBER' });
  });

  for (const position of ['CEO', 'COO', 'CTO', 'CFO', 'CMO', 'MEMBER']) {
    await t.test(`accept ${position} and serialize it`, async () => {
      await register('pos-' + position, position);
      assert.equal((await stored('pos-' + position)).startup_position, position);
      const member = (await bridge('getStudents')).find(m => m.studentId === 'pos-' + position);
      assert.equal(member.startupPosition, position);
      assert.equal(member.studentJobDesk, 'Backend & Infrastructure');
    });
    if (position !== 'MEMBER') await t.test(`reject second ${position} without replacing occupant`, async () => {
      const result = await register('dup-' + position, position, startup, {}, 400);
      assert.match(result.message, new RegExp(`Posisi ${position} pada startup KROOMBOX sudah diisi oleh pos-${position}`));
      assert.equal(await stored('dup-' + position), undefined);
    });
  }
  await t.test('multiple MEMBER and CEO at a different startup are allowed', async () => {
    await register('pos-member-2', 'MEMBER');
    await register('pos-other-ceo', 'CEO', other);
    assert.equal((await stored('pos-other-ceo')).startup_position, 'CEO');
  });
  await t.test('invalid positions return 400 for both create and edit', async () => {
    for (const position of ['Boss', 'Manager', 'Leader', 'Founder', 'Backend', 'Developer', 'ceo', 'Anggota', {}, 3]) {
      await register('pos-invalid', position, startup, {}, 400);
      await edit('pos-MEMBER', { startupPosition: position }, 400);
    }
    assert.equal((await stored('pos-MEMBER')).startup_position, 'MEMBER');
  });
  await t.test('NON_STARTUP and student without startup always have NULL position', async () => {
    await register('pos-non', 'CTO', startup, { studentType: 'NON_STARTUP' });
    await register('pos-no-team', 'CEO', null);
    assert.equal((await stored('pos-non')).startup_position, null);
    assert.equal((await stored('pos-non')).startup_id, null);
    assert.equal((await stored('pos-no-team')).startup_position, null);
  });
  await t.test('edit excludes itself, MEMBER to CTO and CTO to MEMBER preserve job desk', async () => {
    await edit('pos-CTO', { name: 'CTO renamed', startupPosition: 'CTO' });
    await edit('pos-CTO', { startupPosition: 'MEMBER' });
    await edit('pos-MEMBER', { startupPosition: 'CTO' });
    assert.equal((await stored('pos-MEMBER')).startup_position, 'CTO');
    assert.equal((await stored('pos-MEMBER')).job_desk, 'Backend & Infrastructure');
    await edit('pos-MEMBER', { startupPosition: 'MEMBER' });
  });
  await t.test('moving startup resets position and revalidates explicit C-level selection', async () => {
    await edit('pos-CEO', { startupId: other, startupPosition: 'CEO' }, 400);
    assert.equal((await stored('pos-CEO')).startup_id, startup);
    await edit('pos-CEO', { startupId: other });
    assert.equal((await stored('pos-CEO')).startup_position, 'MEMBER');
    await edit('pos-CEO', { startupId: startup, startupPosition: 'CEO' });
  });
  await t.test('removing membership clears position atomically', async () => {
    await edit('pos-CFO', { startupId: null });
    assert.equal((await stored('pos-CFO')).startup_position, null);
    await edit('pos-CMO', { studentType: 'NON_STARTUP' });
    assert.equal((await stored('pos-CMO')).startup_id, null);
    assert.equal((await stored('pos-CMO')).startup_position, null);
  });
  await t.test('concurrent C-level registration commits exactly one', async () => {
    const responses = await Promise.all(['race-one', 'race-two'].map(id => fetch(base + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, name: id, role: 'STUDENT', password, studentType: 'STARTUP', startupId: startup, startupPosition: 'CFO' })
    })));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
    const [[count]] = await db.execute("SELECT COUNT(*) AS n FROM students WHERE startup_id=? AND startup_position='CFO'", [startup]);
    assert.equal(count.n, 1);
  });
  await t.test('only ADMIN changes position; self profile rejects camelCase and snake_case', async () => {
    const login = await request('/auth/login', { id: 'pos-MEMBER', role: 'STUDENT', password }, null);
    for (const field of ['startupPosition', 'startup_position']) await bridge('updateProfile', { [field]: 'CEO' }, login.token, 403);
    await edit('pos-MEMBER', { startupPosition: 'CEO' }, 403, login.token);
    await register('pos-self-create', 'CEO', other, {}, 403, login.token);
    await register('pos-public', 'CEO', other, {}, 403, null);
    await bridge('updateProfile', { name: 'Self name', startupId: other, studentType: 'NON_STARTUP' }, login.token);
    assert.equal((await stored('pos-MEMBER')).startup_id, startup);
    assert.equal((await stored('pos-MEMBER')).startup_position, 'MEMBER');
    await edit('pos-MEMBER', { startupPosition: 'CTO' });
    const status = await request('/student/me/status', undefined, login.token);
    assert.equal(status.startup.name, 'KROOMBOX'); assert.equal(status.startup.position, 'CTO');
    assert.equal((await request('/auth/session', undefined, login.token)).profile.startupPosition, 'CTO');
    await edit('pos-MEMBER', { startupPosition: 'MEMBER' });
  });
  await t.test('audit logs have minimal before/after metadata and roll back on audit failure', async () => {
    const [logs] = await db.execute("SELECT details FROM system_logs WHERE action='updateStartupPosition'");
    const change = logs.map(row => JSON.parse(row.details)).find(row => row.studentId === 'pos-MEMBER' && row.newPosition === 'CTO');
    assert.deepEqual(change, { studentId: 'pos-MEMBER', startupId: startup, oldPosition: 'MEMBER', newPosition: 'CTO' });
    const before = await stored('pos-MEMBER');
    await db.query("CREATE TRIGGER fail_position_audit BEFORE INSERT ON system_logs FOR EACH ROW BEGIN IF NEW.action='updateStartupPosition' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Test position audit failure'; END IF; END");
    try { await edit('pos-MEMBER', { startupPosition: 'CTO', name: 'Must roll back' }, 500); }
    finally { await db.query('DROP TRIGGER fail_position_audit'); }
    assert.deepEqual(await stored('pos-MEMBER'), before);
  });
  for (const alias of ['startup_position', 'posisi_startup', 'posisi', 'startup position']) await t.test(`import recognizes ${alias} and normalizes Anggota`, async () => {
    const result = await preview([['alias', 'Alias', 'STARTUP', startup, 'anggota']], alias);
    assert.equal(result.rows[0].startup_position, 'MEMBER'); assert.equal(result.rows[0].status, 'VALID');
  });
  await t.test('import defaults blanks, accepts CEO, rejects invalid and duplicate C-level within file', async () => {
    const result = await preview([
      ['imp-member', 'Imported Member', 'STARTUP', startup, 'member'],
      ['imp-blank', 'Blank', 'STARTUP', startup, ''],
      ['imp-ceo', 'Imported CEO', 'STARTUP', other, 'CEO'],
      ['imp-cmo', 'First CMO', 'STARTUP', startup, 'cmo'],
      ['imp-cmo-2', 'Second CMO', 'STARTUP', startup, 'CMO'],
      ['imp-invalid', 'Invalid', 'STARTUP', startup, 'Boss']
    ]);
    assert.deepEqual(result.rows.map(r => r.status), ['VALID', 'VALID', 'INVALID', 'VALID', 'INVALID', 'INVALID']);
    assert.match(result.rows[2].errors.join(), /sudah diisi oleh/);
    assert.match(result.rows[4].errors.join(), /First CMO/);
    assert.equal(result.rows[1].startup_position, 'MEMBER');
    const summary = await commit(result.rows);
    assert.equal(summary.imported, 3); assert.equal(summary.failed, 3);
    await edit('pos-other-ceo', { startupPosition: 'MEMBER' });
    const valid = await preview([['imp-ceo', 'Imported CEO', 'STARTUP', other, 'Ceo']]);
    assert.equal((await commit(valid.rows)).imported, 1);
    assert.equal((await stored('imp-ceo')).startup_position, 'CEO');
  });
  await t.test('import commit revalidates forged or stale preview and excludes current student on update', async () => {
    const result = await commit([
      { nim: 'forged-ceo', name: 'Forged', type: 'STARTUP', startup_id: other, startup_position: 'CEO', status: 'VALID' },
      { nim: 'forged-invalid', name: 'Forged', type: 'STARTUP', startup_id: startup, startup_position: 'Boss', status: 'VALID' },
      { nim: 'imp-ceo', name: 'Updated CEO', type: 'STARTUP', startup_id: other, startup_position: 'CEO', status: 'DUPLICATE', action: 'update' }
    ]);
    assert.equal(result.failed, 2); assert.equal(result.updated, 1);
    assert.equal(await stored('forged-ceo'), undefined);
    const cleared = await commit([{ nim: 'imp-ceo', name: 'No startup', type: 'NON_STARTUP', startup_position: 'CEO', action: 'update' }]);
    assert.equal(cleared.updated, 1); assert.equal((await stored('imp-ceo')).startup_position, null);
  });
  await t.test('import preview accepts existing non-startup with omitted startup and marks missing NIM invalid', async () => {
    const form = new FormData();
    form.append('file', new Blob(['nim,name\npos-non,Non Startup\n,Missing NIM'], { type: 'text/csv' }), 'minimal.csv');
    form.append('role', 'STUDENT'); form.append('duplicateMode', 'update');
    const response = await fetch(base + '/admin/members/import/preview', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.rows[0].status, 'DUPLICATE'); assert.equal(result.rows[0].startup_position, null);
    assert.equal(result.rows[1].status, 'INVALID'); assert.match(result.rows[1].errors.join(), /NIM kosong/);
  });
  await t.test('bulk allows MEMBER in same startup and rejects C-level or mixed startups', async () => {
    const members = ['pos-MEMBER', 'pos-member-2'].map(id => ({ id, role: 'STUDENT' }));
    await bridge('bulkManageMembers', { bulkAction: 'edit', members, data: { startupPosition: 'CEO' } }, token, 400);
    await bridge('bulkManageMembers', { bulkAction: 'edit', members, data: { startupPosition: 'MEMBER' } });
    await bridge('bulkManageMembers', { bulkAction: 'edit', members: [...members, { id: 'pos-other-ceo', role: 'STUDENT' }], data: { startupPosition: 'MEMBER' } }, token, 400);
  });
  await t.test('template and Excel/PDF export include positions while preserving Job Desk and lecturer schema', async () => {
    async function download(path) {
      const response = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200); return Buffer.from(await response.arrayBuffer());
    }
    const sheet = buffer => { const book = XLSX.read(buffer); return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]); };
    assert.ok('startup_position' in sheet(await download('/admin/members/template/STUDENT'))[0]);
    const exported = sheet(await download('/admin/members/export/STUDENT?format=xlsx&search=pos-MEMBER'));
    assert.equal(exported[0]['Posisi Startup'], 'Anggota');
    assert.equal(exported[0]['Job Desk'], 'Backend & Infrastructure');
    assert.ok('Status Magang' in exported[0]); assert.ok('Active Workload' in exported[0]);
    assert.match((await download('/admin/members/export/STUDENT?format=pdf')).subarray(0, 8).toString(), /%PDF/);
    assert.ok(!('startup_position' in sheet(await download('/admin/members/template/LECTURER'))[0]));
  });
  await t.test('startup deletion clears membership and position without losing job desk', async () => {
    await bridge('manageStartup', { type: 'delete', id: startup });
    const row = await stored('pos-MEMBER');
    assert.equal(row.type, 'NON_STARTUP'); assert.equal(row.startup_id, null); assert.equal(row.startup_position, null);
    assert.equal(row.job_desk, 'Backend & Infrastructure');
  });
  await bridge('manageStartup', { type: 'delete', id: other });
  await db.execute("DELETE FROM students WHERE nim LIKE 'pos-%' OR nim LIKE 'imp-%' OR nim LIKE 'race-%' OR nim='legacy-position'");
});
before(async () => {
  control = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, multipleStatements: true });
  await control.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  await control.query(`USE \`${database}\``);
  const schema = (await fs.readFile(new URL('../../schema.sql', import.meta.url), 'utf8')).replace(/CREATE DATABASE IF NOT EXISTS portal_kolab;\s*USE portal_kolab;/, '');
  await control.query(schema);
  process.env.DB_NAME = database;
  process.env.NODE_ENV = 'test';
  // This suite verifies legacy DB binaries; never upload fixtures to real CDN.
  process.env.KROOMBOX_CDN_BASE_URL = 'http://127.0.0.1:1';
  process.env.KROOMBOX_CDN_API_KEY = '';
  process.env.KROOMBOX_CDN_JWT = '';
  process.env.KROOMBOX_CDN_SYNC_ENABLED = 'false';
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  provider = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const action = new URL(req.url, 'http://localhost').searchParams.get('action');
    if (failProvider) { res.end(JSON.stringify({ status: 'error', message: 'Provider unavailable' })); return; }
    res.end(JSON.stringify(req.method === 'GET' ? (migrationData[action] ?? (action === 'getAssets' ? {} : [])) : { status: 'success', url: 'https://meet.example/test' }));
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => provider.once('listening', resolve));
  process.env.GAS_URL = `http://127.0.0.1:${provider.address().port}`;
  const app = (await import('../server.js')).default;
  db = (await import('../lib/db.js')).default;
  await (await import('../scripts/migrate.js')).migrate();
  await db.execute("INSERT INTO article_tags (id,name,slug) VALUES ('tag,with comma','Fixture one','fixture-one'),('two','Fixture two','fixture-two'),('keep','Fixture keep','fixture-keep')");
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  await db.execute('INSERT INTO admins (username,password) VALUES (?,?)', ['test-admin', crypto.createHash('sha256').update(password).digest('hex')]);
  token = (await request('/auth/login', { username: 'test-admin', password, isAdmin: true }, null)).token;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (provider) await new Promise(resolve => provider.close(resolve));
  if (db) await db.end();
  if (control) {
    // Only the random database created by this test may be removed.
    assert.match(database, /^portal_kolab_test_[a-f0-9]{12}$/);
    await control.query(`DROP DATABASE \`${database}\``);
    await control.end();
  }
});

test('bulk internships reject lecturer targets and preserve student records', async () => {
  const nim = 'bulk-student', nip = 'bulk-lecturer';
  await db.execute('INSERT INTO students (nim,name,password) VALUES (?,?,?)', [nim, 'Bulk student', password]);
  await db.execute('INSERT INTO lecturers (nip,name,password) VALUES (?,?,?)', [nip, 'Bulk lecturer', password]);
  const startupId = (await bridge('manageStartup', { type: 'add', data: { name: 'Bulk startup' } })).id;
  const valid = { role: 'STUDENT', studentNim: nim, startupId, startDate: '2026-01-01', endDate: '2026-02-01', status: 'PLANNED' };
  await bridge('manageInternshipsBulk', { operation: 'create', internships: [valid] });
  const stored = async () => (await db.execute('SELECT * FROM internships WHERE student_nim=?', [nim]))[0];
  const before = await stored();
  for (const operation of ['create', 'status', 'delete']) {
    for (const invalid of [{ ...valid, role: 'LECTURER' }, { ...valid, studentNim: nip }, null]) {
      await bridge('manageInternshipsBulk', { operation, internships: [{ ...valid, status: 'COMPLETED' }, invalid] }, token, 400);
      assert.deepEqual(await stored(), before);
    }
    await bridge('manageInternshipsBulk', { operation, role: 'LECTURER', internships: [valid] }, token, 400);
  }
  for (const bulkAction of ['', 'assignInternship', 'internshipStatus', 'completeInternship', 'removeInternship']) {
    await bridge('bulkManageMembers', { bulkAction, members: [{ role: 'LECTURER', id: nip }] }, token, 400);
  }
  await bridge('manageInternshipsBulk', { operation: 'status', internships: [{ ...valid, status: 'COMPLETED' }] });
  assert.equal((await stored())[0].status, 'COMPLETED');
  await bridge('manageInternshipsBulk', { operation: 'delete', internships: [valid] });
  assert.equal((await stored()).length, 0);
  await bridge('manageMember', { type: 'delete', role: 'STUDENT', targetId: nim });
  await bridge('manageMember', { type: 'delete', role: 'LECTURER', targetId: nip });
  await bridge('manageStartup', { type: 'delete', id: startupId });
});

test('registration, login, profile, password and fresh session for each role', async () => {
  for (const role of ['STUDENT', 'LECTURER']) {
    const id = role === 'STUDENT' ? 'test-student' : 'test-lecturer';
    await request('/auth/register', { id, role, name: role, password }, null);
    await request('/auth/register', { id, role, name: role, password }, null, 409);
    const login = await request('/auth/login', { id, role, password }, null);
    if (role === 'STUDENT') studentToken = login.token; else lecturerToken = login.token;
    await bridge('updateProfile', { id, role, name: 'Nama baru', email: 'test@example.invalid', avatar: 'avatar', photoIdCard: 'card', youtube: 'youtube', spotify: 'spotify', studentStatuses: ['Aktif'], lecturerJobDesks: ['Pembina'], password: password + 'new' }, login.token);
    const restored = await request('/auth/session', undefined, login.token);
    assert.equal(restored.profile.email, 'test@example.invalid');
    assert.equal(restored.profile.photoIdCard, 'card');
    assert.equal(restored.profile.youtube, 'youtube');
    assert.deepEqual(role === 'STUDENT' ? restored.profile.studentStatuses : restored.profile.lecturerJobDesks, role === 'STUDENT' ? ['Aktif'] : ['Pembina']);
    await request('/auth/login', { id, role, password: password + 'new' }, null);
    await request('/auth/login', { id, role, password }, null, 401);
  }
  await bridge('updateProfile', { name: 'Admin baru', email: 'admin@example.invalid', avatar: 'admin-avatar', youtube: 'admin-youtube', spotify: 'admin-spotify' });
  const { profile } = await request('/auth/session');
  assert.equal(profile.name, 'Admin baru');
  assert.equal(profile.youtube, 'admin-youtube');
});

test('member administration persists identity, password, quota and deletion', async () => {
  await bridge('manageStartup', { type: 'add', id: 'startup', data: { name: 'Member Startup' } });
  for (const role of ['STUDENT', 'LECTURER']) {
    const targetId = role === 'STUDENT' ? 'test-student' : 'test-lecturer';
    await bridge('manageMember', { type: 'updateIdentity', targetId, role, data: { name: 'Edited', email: 'edited@kolab.test', isApproved: true, isActive: true, password, studentType: 'STARTUP', startupId: 'startup', studentJobDesk: 'PIC Lab', studentStatuses: ['Aslab'], youtube: 'yt-link', spotify: 'sp-link', lecturerCode: 'CODE' } });
    await request('/auth/login', { id: targetId, role, password }, null);
    await bridge('updateMemberStorage', { targetId, role, customQuota: 1000000, customMaxUpload: 500000 });
    const members = await bridge(role === 'STUDENT' ? 'getStudents' : 'getLecturers');
    const member = members.find(m => m.studentId === targetId);
    assert.equal(member.customQuota, 1000000);
    assert.equal(member.name, 'Edited');
    assert.equal(member.email, 'edited@kolab.test');
    if (role === 'STUDENT') assert.deepEqual([member.studentStatuses, member.youtube, member.spotify], [['Aslab'], 'yt-link', 'sp-link']);
  }
  await bridge('manageStartup', { type: 'delete', id: 'startup' });
  await request('/auth/register', { id: 'delete-me', role: 'STUDENT', name: 'Delete', password }, null);
  await bridge('manageMember', { type: 'delete', targetId: 'delete-me', role: 'STUDENT' });
  assert.equal((await bridge('getStudents')).some(m => m.studentId === 'delete-me'), false);
});

const fixtures = [
  ['manageStartup', 'startups', 'startup_teams', { name: 'Startup', website: 'web', ig: 'ig', tiktok: 'tiktok', linkedin: 'linkedin', logoUrl: 'logo' }, 'name'],
  ['manageInformasi', 'informasi', 'information', { title: 'Info', date: '2026-09-17T10:30:00.000Z', description: 'Info body', author: 'Admin', targetType: 'STARTUP_SPECIFIC', targetValue: 'startup' }, 'title'],
  ['manageSchedule', 'schedules', 'schedules', { title: 'Meeting', date: '2026-09-17', time: '10:30', endTime: '11:30', locationOffline: 'Lab', locationOnline: true, meetLink: 'https://meet.example', organizer: 'Administrator', description: 'Body', author: 'Admin' }, 'title'],
  ['manageEvent', 'events', 'events', { title: 'Event', date: '2026-09-17', time: '10:30', image: 'image', description: 'Body', locationOffline: 'Lab', locationOnline: 'Yes', maxParticipants: 20, status: 'OPEN', tags: ['tag,with comma', 'two'], meetLink: 'meet', author: 'Admin' }, 'title'],
  ['manageCategory', 'categories', 'article_categories', { name: 'Category' }, 'name'],
  ['manageTag', 'tags', 'article_tags', { name: 'Tag Artikel' }, 'name'],
  ['manageArticle', 'articles', 'articles', { title: 'Article', date: '2026-09-17', content: '<p>Konten</p>', author: 'Admin', tags: ['tag,with comma', 'two'], categoryId: 'category', imageUrl: 'image', videoUrl: 'video', otherUrl: 'other' }, 'title']
];
for (const [action, endpoint, table, data, property] of fixtures) {
  test(`${action}: create/read/edit/read/delete in MySQL`, async () => {
    const created = await bridge(action, { type: 'add', data });
    assert.ok(created.id);
    const read = () => request('/data/' + endpoint).then(rows => rows.find(row => row.id === created.id));
    let row = await read();
    for (const [key, value] of Object.entries(data)) {
      if (key === 'date') assert.ok(row[key].startsWith('2026-09-17'));
      else if (key === 'time' || key === 'endTime') assert.ok(row[key].startsWith(value));
      else assert.deepEqual(row[key], value, key);
    }
    const [[stored]] = await db.execute(`SELECT COUNT(*) AS count FROM ${table} WHERE id=?`, [created.id]);
    assert.equal(stored.count, 1);
    await bridge(action, { type: 'edit', id: created.id, data: { ...data, [property]: 'Revised' } });
    row = await read(); assert.equal(row[property], 'Revised');
    await bridge(action, { type: 'delete', id: created.id });
    assert.equal(await read(), undefined);
  });
}

test('assets, streaming playlists and TV persist without field loss', async () => {
  const assets = { bgFront: 'front', bgBack: 'back', logoUrl: 'logo', studentPolicy: { defaultQuota: 1000000, maxUploadSize: 500000, allowedCategories: ['document', 'image'] }, lecturerPolicy: { defaultQuota: 2000000 }, adminYoutube: 'yt', adminSpotify: 'sp' };
  await bridge('updateAssets', { data: assets });
  let result = await request('/data/assets');
  for (const [key, value] of Object.entries(assets)) assert.deepEqual(result[key], value);
  await bridge('updateAssets', { ...assets, logoUrl: 'new-logo' });
  assert.equal((await request('/data/assets')).logoUrl, 'new-logo');
  await bridge('manageYPlaylist', { type: 'add', data: { playlistId: 'pl', title: 'Playlist', publishedAt: '2026-09-17T00:00:00Z', channelTitle: 'Channel' } });
  await bridge('manageYPlaylist', { type: 'edit', id: 'pl', data: { playlistId: 'pl', title: 'Edited playlist' } });
  const tv = await bridge('manageTvLive', { type: 'add', data: { title: 'TV', videoId: 'video-id' } });
  await bridge('manageTvLive', { type: 'edit', id: tv.id, data: { title: 'TV edited', videoId: 'new-video-id' } });
  result = await request('/data/assets');
  assert.equal(result.yPlaylists[0].title, 'Edited playlist');
  assert.equal(result.tvChannels[0].videoId, 'new-video-id');
  assert.equal(result.tvChannels.length, 1);
  await bridge('manageYPlaylist', { type: 'delete', id: 'pl' });
  await bridge('manageTvLive', { type: 'delete', id: tv.id });
  assert.deepEqual((await request('/data/assets')).tvChannels, []);
});

test('announcements, notifications and audit logs persist', async () => {
  const created = await bridge('addAnnouncement', { title: 'Broadcast', content: 'Message', author: 'Admin', targetType: 'ROLE', targetValue: 'STUDENT' });
  const row = (await request('/data/announcements')).find(r => r.id === created.id);
  assert.deepEqual(row.target, { type: 'ROLE', value: 'STUDENT' });
  assert.equal(row.content, 'Message');
  assert.ok((await request('/data/notifications')).length > 0);
  const [[logs]] = await db.query('SELECT COUNT(*) AS count FROM system_logs'); assert.ok(logs.count > 0);
  await bridge('deleteAnnouncement', { id: created.id });
  assert.equal((await request('/data/announcements')).length, 0);
});

test('repository binaries, nested folders, copies, rename, ownership and quota', async () => {
  const b = (action, data, expected) => bridge(action, data, studentToken, expected);
  const folder = await b('createFolder', { name: 'Parent' });
  const nested = await b('createFolder', { name: 'Nested', parentId: folder.id });
  const bytes = Buffer.from('MySQL file bytes\n');
  const file = await b('uploadToRepo', { fileName: 'test.txt', label: 'Test document', data: bytes.toString('base64'), mimeType: 'text/plain', parentId: nested.id });
  const [[blob]] = await db.execute('SELECT content FROM file_blobs WHERE repo_id=?', [file.id]);
  assert.deepEqual(blob.content, bytes);
  assert.deepEqual(Buffer.from(await (await fetch(file.url)).arrayBuffer()), bytes);
  await b('renameRepoItem', { id: file.id, newName: 'Renamed' });
  assert.equal((await b('getRepoFiles')).items.find(i => i.id === file.id).name, 'Renamed');
  await bridge('renameRepoItem', { id: file.id, newName: 'Forbidden' }, lecturerToken, 403);
  await b('copyRepoItem', { id: folder.id, newParentId: nested.id }, 400);
  const copy = await b('copyRepoItem', { id: folder.id, newName: 'Copy', newParentId: 'ROOT' });
  assert.ok(copy.id);
  const listing = await b('getRepoFiles');
  assert.equal(listing.items.length, 6);
  assert.equal(listing.globalStats.usedSpace, bytes.length * 2);
  const otherFile = listing.items.find(i => i.type === 'FILE' && i.id !== file.id);
  assert.deepEqual(Buffer.from(await (await fetch(otherFile.url)).arrayBuffer()), bytes);
  const admin = await bridge('getAdminRepoData'); assert.equal(admin.items.length, 6);
  await bridge('updateMemberStorage', { targetId: 'test-student', role: 'STUDENT', customQuota: bytes.length * 2, customMaxUpload: 10 });
  await b('uploadToRepo', { fileName: 'large.txt', data: bytes.toString('base64'), mimeType: 'text/plain' }, 400);
  await b('copyRepoItem', { id: file.id, newParentId: 'ROOT' }, 400);
  await b('uploadToRepo', { fileName: 'invalid.txt', data: '!invalid!', mimeType: 'text/plain' }, 400);
  await b('deleteRepoItem', { id: folder.id });
  await b('deleteRepoItem', { id: copy.id });
  assert.equal((await b('getRepoFiles')).items.length, 0);
  const [[count]] = await db.query('SELECT COUNT(*) AS count FROM file_blobs'); assert.equal(count.count, 0);
  await b('renameRepoItem', { id: 'missing', newName: 'Missing' }, 404);
});

test('asset uploads survive a new API server instance', async () => {
  const file = await bridge('uploadFile', { fileName: 'logo.png', mimeType: 'image/png', data: Buffer.from('image bytes').toString('base64'), folderType: 'asetweb' });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const app = (await import('../server.js')).default;
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  assert.equal(await (await fetch(base + '/files/' + file.id)).text(), 'image bytes');
  assert.equal((await bridge('getAdminRepoData')).items[0].id, file.id);
});

test('photobooth settings save and reload every category', async () => {
  const data = { config: { title: 'Booth' }, icons: [{ id: 'icon' }], frames: [{ id: 'frame' }], filters: [{ id: 'filter' }], backgrounds: [{ id: 'bg' }] };
  await request('/photobooth', { data });
  assert.deepEqual(await request('/photobooth'), data);
  await request('/photobooth', { data: { icons: [] } });
  assert.deepEqual((await request('/photobooth')).icons, []);
  await request('/photobooth', { data: { config: { title: 'Should rollback' }, frames: 'invalid' } }, token, 400);
  assert.deepEqual((await request('/photobooth')).config, data.config);
});

test('unauthenticated writes and non-admin settings fail without changing DB', async () => {
  await bridge('updateAssets', { data: { logoUrl: 'bad' } }, null, 401);
  await bridge('updateAssets', { data: { logoUrl: 'bad' } }, studentToken, 403);
  assert.equal((await request('/data/assets')).logoUrl, 'new-logo');
  await bridge('notImplemented', {}, token, 400);
});

test('partial edits preserve data; missing records and invalid quotas are rejected', async () => {
  const created = await bridge('manageArticle', { type: 'add', data: { title: 'Partial', content: 'Keep content', date: '2026-09-17', tags: ['keep'], imageUrl: 'keep-image' } });
  await bridge('manageArticle', { type: 'edit', id: created.id, data: { title: 'Changed' } });
  const row = (await request('/data/articles')).find(item => item.id === created.id);
  assert.equal(row.content, 'Keep content'); assert.equal(row.imageUrl, 'keep-image'); assert.deepEqual(row.tags, ['keep']);
  await bridge('manageArticle', { type: 'edit', id: 'missing', data: { title: 'Cannot save' } }, token, 404);
  await bridge('manageArticle', { type: 'invalid', data: {} }, token, 400);
  await bridge('updateMemberStorage', { targetId: 'test-student', role: 'STUDENT', customQuota: -1, customMaxUpload: 1 }, token, 400);
  await bridge('updateAssets', { data: { bgFront: 'partial-front' } });
  assert.equal((await request('/data/assets')).logoUrl, 'new-logo');
  await bridge('manageArticle', { type: 'delete', id: created.id });
  await db.execute("DELETE FROM article_tags WHERE id IN ('tag,with comma','two','keep')");
  const health = await request('/health'); assert.equal(health.database, 'ok');
  assert.ok(Array.isArray((await request('/data/getRepoFiles', undefined, studentToken)).items));
  assert.ok(Array.isArray((await request('/data/getAdminRepoData')).items));
  const { migrate } = await import('../scripts/migrate.js');
  await migrate(); await migrate();
  assert.equal((await request('/data/assets')).logoUrl, 'new-logo');
});

test('Google Meet integration responses persist in MySQL (local provider stub)', async () => {
  await bridge('generateMeetLink', { title: 'Meeting', startTime: '2026-09-17T10:00:00', description: 'Test' });
  await bridge('autoInviteToMeet', { meetLink: 'https://meet.example/test', email: 'test@example.invalid' });
  const [rows] = await db.query('SELECT * FROM integration_results ORDER BY action');
  assert.equal(rows.length, 2);
  assert.equal(JSON.parse(rows[0].response_data).url, 'https://meet.example/test');
  failProvider = true;
  try { await bridge('generateMeetLink', { title: 'Failure' }, token, 502); }
  finally { failProvider = false; }
  const [[count]] = await db.query('SELECT COUNT(*) AS count FROM integration_results');
  assert.equal(count.count, 2);
});

test('migration imports all collections and rolls back invalid data (local provider stub)', async () => {
  migrationData = {
    getAssets: { logoUrl: 'imported-logo', yPlaylists: [{ playlistId: 'import-playlist', title: 'Import' }], tvChannels: [{ id: 'import-tv', title: 'Import', videoId: 'import-video' }] },
    getAnnouncements: [{ id: 'import-ann', author: 'Import', title: 'Import', content: 'Text', createdAt: '2026-09-17T00:00:00Z', target: { type: 'ALL', value: '' } }]
  };
  for (const [, endpoint, , data] of fixtures) {
    const action = { startups: 'getStartups', informasi: 'getInformasi', schedules: 'getSchedules', events: 'getEvents', categories: 'getCategories', tags: 'getTags', articles: 'getArticles' }[endpoint];
    migrationData[action] = [{ ...data, id: 'import-' + endpoint }];
  }
  await request('/migration/pull', { gasUrl: process.env.GAS_URL });
  assert.equal((await request('/data/assets')).logoUrl, 'imported-logo');
  assert.equal((await request('/data/assets')).tvChannels[0].videoId, 'import-video');
  for (const [, endpoint] of fixtures) assert.equal((await request('/data/' + endpoint))[0].id, 'import-' + endpoint);
  assert.equal((await request('/data/announcements'))[0].target.type, 'ALL');
  // Re-import updates the same rows rather than duplicating them.
  await request('/migration/pull', { gasUrl: process.env.GAS_URL });
  assert.equal((await request('/data/articles')).length, 1);
  migrationData.getAssets.logoUrl = 'must-rollback';
  migrationData.getArticles = [{ id: 'invalid', title: null }];
  await request('/migration/pull', { gasUrl: process.env.GAS_URL }, token, 502);
  assert.equal((await request('/data/assets')).logoUrl, 'imported-logo');
  assert.equal((await request('/data/articles')).length, 1);
});

test('internships: admin CRUD, validation, authorization, overlap and atomic audit', async t => {
  const { migrate } = await import('../scripts/migrate.js');
  const nim = 'intern-student', otherNim = 'intern-student-2', nip = 'intern-lecturer';
  let startupId, secondStartupId, id;
  let valid;
  const write = (type, data = valid, recordId = type === 'add' ? undefined : id, bearer = token, expected = 200) =>
    bridge('manageInternship', { type, id: recordId, data }, bearer, expected);
  const rows = () => request('/data/internships');
  const stored = async recordId => (await db.execute('SELECT * FROM internships WHERE id=?', [recordId]))[0][0];
  const logCount = async () => Number((await db.query("SELECT COUNT(*) AS count FROM system_logs WHERE action='manageInternship'"))[0][0].count);

  await t.test('migration creates table on an existing database and supplies all indexes', async () => {
    assert.match(process.env.DB_NAME, /^portal_kolab_test_[a-f0-9]{12}$/);
    await db.query('DROP TABLE internships');
    await migrate();
    const [indexes] = await db.query('SHOW INDEX FROM internships');
    for (const column of ['student_nim', 'startup_id', 'academic_supervisor_nip', 'status']) assert.ok(indexes.some(index => index.Column_name === column));
  });
  await request('/auth/register', { id: nim, role: 'STUDENT', name: 'Mahasiswa Magang', password }, null);
  await request('/auth/register', { id: otherNim, role: 'STUDENT', name: 'Mahasiswa Kedua', password }, null);
  await request('/auth/register', { id: nip, role: 'LECTURER', name: 'Dosen Pembimbing', lecturerCode: 'DP', password }, null);
  startupId = (await bridge('manageStartup', { type: 'add', data: { name: 'Startup Magang' } })).id;
  secondStartupId = (await bridge('manageStartup', { type: 'add', data: { name: 'Startup Kedua' } })).id;
  valid = { studentNim: nim, startupId, startDate: '2026-09-01', endDate: '2026-12-31', fieldSupervisor: 'Pembimbing Lapangan', academicSupervisorNip: nip, status: 'PLANNED' };

  await t.test('admin add persists all fields in MySQL', async () => {
    const created = await write('add', valid, undefined);
    id = created.id;
    assert.match(id, /^internship-/);
    const row = await stored(id);
    assert.equal(row.student_nim, nim); assert.equal(row.startup_id, startupId);
    assert.equal(row.start_date, valid.startDate); assert.equal(row.end_date, valid.endDate);
    assert.equal(row.field_supervisor, valid.fieldSupervisor);
    assert.equal(row.academic_supervisor_nip, nip); assert.equal(row.status, 'PLANNED');
  });
  await t.test('admin read joins correct names, NIM, NIP and lecturer code', async () => {
    const row = (await rows()).find(row => row.id === id);
    assert.equal(row.studentName, 'Mahasiswa Magang'); assert.equal(row.studentNim, nim);
    assert.equal(row.startupName, 'Startup Magang'); assert.equal(row.startupId, startupId);
    assert.equal(row.academicSupervisorName, 'Dosen Pembimbing'); assert.equal(row.academicSupervisorNip, nip);
    assert.equal(row.academicSupervisorCode, 'DP'); assert.equal(row.startDate, valid.startDate);
  });
  await t.test('migration can run repeatedly without losing existing internships', async () => {
    const before = await stored(id);
    await migrate(); await migrate();
    assert.deepEqual(await stored(id), before);
  });

  for (const [role, bearer] of [['STUDENT', studentToken], ['LECTURER', lecturerToken], ['unauthenticated', null], ['invalid JWT', 'invalid']]) {
    const expected = bearer && bearer !== 'invalid' ? 403 : 401;
    await t.test(`${role}: private GET returns ${expected}`, async () => {
      await request('/data/internships', undefined, bearer, expected);
    });
    for (const type of ['add', 'edit', 'delete']) await t.test(`${role}: ${type} returns ${expected} without data/audit changes`, async () => {
      const before = await stored(id), logs = await logCount();
      await write(type, valid, type === 'add' ? undefined : id, bearer, expected);
      assert.deepEqual(await stored(id), before); assert.equal(await logCount(), logs);
    });
  }

  const invalidCases = [
    ['missing student', { studentNim: '' }], ['unknown student', { studentNim: 'missing' }],
    ['lecturer supplied as student', { studentNim: nip }], ['null student', { studentNim: null }],
    ['missing startup', { startupId: '' }], ['unknown startup', { startupId: 'missing' }],
    ['unknown academic supervisor', { academicSupervisorNip: 'missing' }],
    ['student supplied as academic supervisor', { academicSupervisorNip: nim }],
    ['missing start date', { startDate: '' }], ['missing end date', { endDate: '' }],
    ['reversed dates', { endDate: '2026-08-31' }], ['impossible date', { startDate: '2026-02-30' }],
    ['non-date timestamp', { startDate: '2026-09-01T00:00:00Z' }], ['invalid status', { status: 'ACTIVE' }],
    ['null status', { status: null }], ['supervisor too long', { fieldSupervisor: 'x'.repeat(151) }]
  ];
  for (const [label, change] of invalidCases) await t.test(`reject ${label} for add and edit, leaving record and audit intact`, async () => {
    const before = await stored(id), logs = await logCount();
    await write('add', { ...valid, ...change }, undefined, token, 400);
    await write('edit', { ...valid, ...change }, id, token, 400);
    assert.deepEqual(await stored(id), before); assert.equal(await logCount(), logs);
    assert.equal((await rows()).length, 1);
  });

  await t.test('active overlaps are rejected across startups, including touching date boundaries', async () => {
    for (const status of ['PLANNED', 'ONGOING']) {
      await write('add', { ...valid, startupId: secondStartupId, status }, undefined, token, 409);
      await write('add', { ...valid, status, startDate: '2026-12-31', endDate: '2027-01-31' }, undefined, token, 409);
    }
    assert.equal((await rows()).length, 1);
  });
  await t.test('admin can edit every field and update without self-overlap', async () => {
    await write('edit', { ...valid, studentNim: otherNim, startupId: secondStartupId, startDate: '2027-01-01', endDate: '2027-03-31', fieldSupervisor: 'Pembimbing Baru', academicSupervisorNip: '', status: 'ONGOING' });
    const row = (await rows()).find(row => row.id === id);
    assert.equal(row.studentNim, otherNim); assert.equal(row.studentName, 'Mahasiswa Kedua');
    assert.equal(row.startupName, 'Startup Kedua'); assert.equal(row.startDate, '2027-01-01');
    assert.equal(row.endDate, '2027-03-31'); assert.equal(row.fieldSupervisor, 'Pembimbing Baru');
    assert.equal(row.academicSupervisorNip, null); assert.equal(row.status, 'ONGOING');
    await write('edit', valid);
  });
  await t.test('partial edit preserves omitted fields and validates resulting full record', async () => {
    await write('edit', { status: 'ONGOING' });
    const row = await stored(id);
    assert.equal(row.status, 'ONGOING'); assert.equal(row.startup_id, startupId);
    await write('edit', { endDate: '2026-08-01' }, id, token, 400);
    assert.deepEqual(await stored(id), row);
  });
  await t.test('non-overlapping period is allowed but changing it into overlap is rejected', async () => {
    const second = await write('add', { ...valid, startDate: '2027-01-01', endDate: '2027-02-01' }, undefined);
    const before = await stored(second.id);
    await write('edit', valid, second.id, token, 409);
    assert.deepEqual(await stored(second.id), before);
    await write('delete', {}, second.id);
  });
  await t.test('completed/cancelled history may overlap; reactivation validates overlap', async () => {
    for (const status of ['COMPLETED', 'CANCELLED']) {
      const historical = await write('add', { ...valid, status }, undefined);
      await write('edit', { status: 'ONGOING' }, historical.id, token, 409);
      assert.equal((await stored(historical.id)).status, status);
      await write('delete', {}, historical.id);
    }
  });
  await t.test('concurrent overlapping requests commit exactly one record and one audit', async () => {
    const logs = await logCount();
    const payload = { action: 'manageInternship', type: 'add', data: { ...valid, studentNim: otherNim } };
    const responses = await Promise.all([1, 2].map(() => fetch(base + '/bridge', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })));
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
    assert.equal(await logCount(), logs + 1);
    const created = await responses.find(response => response.status === 200).json();
    assert.equal((await rows()).filter(row => row.studentNim === otherNim).length, 1);
    await write('delete', {}, created.id);
  });
  await t.test('failed audit causes add/edit/delete to roll back the record changes', async () => {
    const before = await stored(id), logs = await logCount();
    await db.query(`CREATE TRIGGER fail_internship_audit BEFORE INSERT ON system_logs FOR EACH ROW
      BEGIN IF NEW.action = 'manageInternship' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test audit failure'; END IF; END`);
    try {
      await write('add', { ...valid, studentNim: otherNim }, undefined, token, 500);
      await write('edit', { fieldSupervisor: 'Must rollback' }, id, token, 500);
      await write('delete', {}, id, token, 500);
    } finally { await db.query('DROP TRIGGER fail_internship_audit'); }
    assert.deepEqual(await stored(id), before); assert.equal(await logCount(), logs);
    assert.equal((await rows()).length, 1);
  });
  await t.test('audit details record the correct internship id and add/edit/delete type', async () => {
    await write('delete', {});
    assert.equal(await stored(id), undefined); assert.equal((await rows()).length, 0);
    const [logs] = await db.execute("SELECT details FROM system_logs WHERE action='manageInternship' ORDER BY id");
    const actions = logs.map(log => JSON.parse(log.details)).filter(log => log.id === id).map(log => log.type);
    assert.equal(actions[0], 'add'); assert.ok(actions.includes('edit')); assert.equal(actions.at(-1), 'delete');
  });
  await t.test('missing record or invalid operation cannot report successful writes', async () => {
    await write('edit', valid, 'missing-internship', token, 404);
    await write('delete', {}, 'missing-internship', token, 404);
    await write('bogus', valid, undefined, token, 400);
  });
  await t.test('default status and optional supervisors are stored by backend', async () => {
    const created = await write('add', { studentNim: nim, startupId, startDate: '2026-09-01', endDate: '2026-09-01' }, undefined);
    const row = await stored(created.id);
    assert.equal(row.status, 'PLANNED'); assert.equal(row.field_supervisor, null); assert.equal(row.academic_supervisor_nip, null);
    await write('delete', {}, created.id);
  });
  await t.test('existing deletion of a member/startup does not hide historical internship rows', async () => {
    const created = await write('add', { ...valid, studentNim: otherNim, status: 'COMPLETED' }, undefined);
    await bridge('manageMember', { type: 'delete', role: 'STUDENT', targetId: otherNim });
    await bridge('manageStartup', { type: 'delete', id: startupId });
    await bridge('manageMember', { type: 'delete', role: 'LECTURER', targetId: nip });
    const row = (await rows()).find(row => row.id === created.id);
    assert.equal(row.studentNim, otherNim); assert.equal(row.studentName, null);
    assert.equal(row.startupId, startupId); assert.equal(row.startupName, null);
    assert.equal(row.academicSupervisorNip, nip); assert.equal(row.academicSupervisorName, null);
    await write('delete', {}, created.id);
  });
});


test('student self status: authorization, isolation, master joins, priorities and counts', async () => {
 const { migrate } = await import('../scripts/migrate.js'); await migrate();
 const jwt = (await import('jsonwebtoken')).default;
 const sign=(id,role='STUDENT')=>jwt.sign({id,role},process.env.JWT_SECRET,{expiresIn:'1h'});
 await db.execute("INSERT INTO startup_teams (id,name,logo,website,ig) VALUES ('self-startup','Self Startup','logo','https://example.com','self')");
 await db.execute("INSERT INTO students (nim,name,password,startup_id,type,job_desk,is_active,is_approved) VALUES ('self-a','Student A','secret','self-startup','STARTUP','Backend',1,0),('self-b','Student B','other-secret',NULL,'NON_STARTUP',NULL,1,1)");
 await db.execute("INSERT INTO lecturers (nip,name,password) VALUES ('self-supervisor','Academic Supervisor','secret')");
 const a=sign('self-a'), b=sign('self-b');
 await request('/student/me/status',undefined,null,401);
 await request('/student/me/status',undefined,sign('self-supervisor','LECTURER'),403);
 await request('/student/me/status',undefined,token,403);
 const empty=await request('/student/me/status',undefined,b);
 assert.equal(empty.profile.nim,'self-b'); assert.equal(empty.startup,null);
 assert.equal(empty.internship.current,null); assert.deepEqual(empty.internship.history,[]);
 assert.equal(empty.workload.activeLoad,0); assert.deepEqual(empty.workload.active,[]);
 for (const [id,status,end] of [['self-completed','COMPLETED','2025-12-31'],['self-cancelled','CANCELLED','2027-12-31'],['self-planned','PLANNED','2027-06-30'],['self-ongoing','ONGOING','2026-12-31']]) {
  await db.execute('INSERT INTO internships (id,student_nim,startup_id,start_date,end_date,status,academic_supervisor_nip,field_supervisor) VALUES (?,?,?,?,?,?,?,?)',[id,'self-a','self-startup','2025-01-01',end,status,'self-supervisor','Field Supervisor']);
 }
 for(const [id,status,category,role,member] of [['self-w1','ACTIVE','PROJECT','STUDENT','self-a'],['self-w2','ACTIVE','RESEARCH','STUDENT','self-a'],['self-w3','COMPLETED','PKM','STUDENT','self-a'],['self-w4','CANCELLED','COMPETITION','STUDENT','self-a'],['self-w5','PLANNED','PROJECT','STUDENT','self-a'],['self-w6','ACTIVE','PKM','STUDENT','self-b'],['self-w7','ACTIVE','PKM','LECTURER','self-a']]) {
  await db.execute('INSERT INTO workloads (id,name,category,status,pic_id,pic_role,description) VALUES (?,?,?,?,?,?,?)',[id,id,category,status,'self-supervisor','LECTURER','Description']);
  await db.execute('INSERT INTO workload_members (id,workload_id,member_id,member_role,job_desk) VALUES (?,?,?,?,?)',[id,id,member,role,'My job desk']);
 }
 const result=await request('/student/me/status?nim=self-b&studentId=self-b&memberId=self-b',undefined,a);
 assert.equal(result.profile.nim,'self-a'); assert.equal(result.profile.name,'Student A');
 assert.equal(result.membership.isApproved,false); assert.equal(result.membership.isActive,true);
 assert.equal(result.membership.jobDesk,'Backend'); assert.equal(result.membership.studentType,'STARTUP');
 assert.equal(result.startup.id,'self-startup'); assert.equal(result.startup.name,'Self Startup');
 assert.equal(result.internship.current.id,'self-ongoing');
 assert.equal(result.internship.current.academicSupervisorName,'Academic Supervisor');
 assert.equal(result.internship.current.fieldSupervisor,'Field Supervisor');
 assert.ok(result.internship.history.some(i=>i.id==='self-completed'));
 assert.equal(result.workload.activeLoad,2); assert.equal(result.workload.totalHistory,2);
 assert.deepEqual(result.workload.categoryLoad,{PKM:0,PROJECT:1,RESEARCH:1,COMPETITION:0});
 assert.equal(result.workload.history.length,2); assert.equal(result.workload.planned.length,1);
 assert.ok(result.workload.active.every(w=>w.jobDesk==='My job desk' && w.picName==='Academic Supervisor' && w.picRole==='LECTURER'));
 assert.ok(result.workload.history.some(w=>w.id==='self-w3'));
 assert.doesNotMatch(JSON.stringify(result),/password|hash|secret|quota|createdBy|audit|token/i);
 await db.execute("DELETE FROM internships WHERE id='self-ongoing'");
 assert.equal((await request('/student/me/status',undefined,a)).internship.current.id,'self-planned');
 await db.execute("DELETE FROM internships WHERE id='self-planned'");
 assert.equal((await request('/student/me/status',undefined,a)).internship.current.id,'self-completed');
 await db.execute("DELETE FROM internships WHERE id='self-completed'");
 assert.equal((await request('/student/me/status',undefined,a)).internship.current.id,'self-cancelled');
});

test('lecturer portal is read-only, scoped to lecturer and excludes sensitive student fields', async () => {
  const { migrate } = await import('../scripts/migrate.js'); await migrate();
  const suffix = crypto.randomBytes(4).toString('hex');
  const nip = `lect-${suffix}`, nim = `stud-${suffix}`, startupId = `startup-${suffix}`, workloadId = `workload-${suffix}`;
  await db.execute('INSERT INTO lecturers (nip,name,password,code,is_active,is_approved) VALUES (?,?,?,?,1,1)', [nip, 'Lecturer Portal', crypto.createHash('sha256').update(password).digest('hex'), 'LPR']);
  await db.execute('INSERT INTO students (nim,name,password,type,startup_id,startup_position,is_active,is_approved) VALUES (?,?,?,?,?,?,1,1)', [nim, 'Student Portal', 'secret-value', 'STARTUP', startupId, 'CTO']);
  await db.execute('INSERT INTO startup_teams (id,name) VALUES (?,?)', [startupId, 'Portal Startup']);
  await db.execute('INSERT INTO internships (id,student_nim,startup_id,start_date,end_date,status,academic_supervisor_nip) VALUES (?,?,?,?,?,?,?)', [`intern-${suffix}`, nim, startupId, '2026-01-01', '2026-12-31', 'ONGOING', nip]);
  await db.execute('INSERT INTO workloads (id,name,category,status,pic_id,pic_role) VALUES (?,?,?,?,?,?)', [workloadId, 'Portal Workload', 'PROJECT', 'ACTIVE', nip, 'LECTURER']);
  await db.execute('INSERT INTO workload_members (id,workload_id,member_id,member_role) VALUES (?,?,?,?)', [`member-${suffix}`, workloadId, nim, 'STUDENT']);
  const lecturerToken = (await request('/auth/login', { id: nip, role: 'LECTURER', password }, null)).token;
  const students = await request('/lecturer/students', undefined, lecturerToken);
  assert.equal(students.find(row => row.nim === nim).startup.position, 'CTO');
  assert.equal(students.find(row => row.nim === nim).activeWorkload, 1);
  const detail = await request(`/lecturer/students/${nim}`, undefined, lecturerToken);
  assert.equal(detail.identity.name, 'Student Portal');
  assert.doesNotMatch(JSON.stringify(detail), /secret-value|password|quota|jwt|hash/i);
  assert.equal((await request('/lecturer/supervisions', undefined, lecturerToken)).find(row => row.student_nim === nim).status, 'ONGOING');
  const workloads = await request('/lecturer/workloads', undefined, lecturerToken);
  assert.equal(workloads.asPic.find(row => row.id === workloadId).member_count, 1);
  assert.equal(workloads.asMember.length, 0);
  await request('/lecturer/students', undefined, token, 403);
  await bridge('manageMember', { type: 'updateIdentity', targetId: nim, role: 'STUDENT', data: { name: 'Must fail' } }, lecturerToken, 403);
});

test('admin mengganti NIM: semua rujukan ikut pindah, NIM ganda ditolak', async () => {
  await request('/auth/register', { id: 'nim-lama', role: 'STUDENT', name: 'Ganti NIM', password }, null);
  await request('/auth/register', { id: 'nim-lain', role: 'STUDENT', name: 'Pemilik NIM', password }, null);
  await db.execute("INSERT INTO internships (id,student_nim,startup_id,start_date,end_date,status) VALUES ('rename-int','nim-lama','x','2026-07-07','2026-12-31','ONGOING')");
  await db.execute("INSERT INTO workload_members (id,workload_id,member_id,member_role) VALUES ('rename-wm','w','nim-lama','STUDENT')");
  const rename = (newNim, expected = 200) => bridge('manageMember', { type: 'updateIdentity', targetId: 'nim-lama', role: 'STUDENT', data: { name: 'Ganti NIM', newNim } }, token, expected);

  await rename('nim-lain', 409);
  await rename('x', 400);
  assert.equal((await rename('nim-baru')).memberId, 'nim-baru');
  assert.equal((await bridge('getStudents')).some(m => m.studentId === 'nim-lama'), false);
  assert.equal((await db.execute("SELECT student_nim FROM internships WHERE id='rename-int'"))[0][0].student_nim, 'nim-baru');
  assert.equal((await db.execute("SELECT member_id FROM workload_members WHERE id='rename-wm'"))[0][0].member_id, 'nim-baru');
  await request('/auth/login', { id: 'nim-baru', role: 'STUDENT', password }, null);
});
