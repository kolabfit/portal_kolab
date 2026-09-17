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
before(async () => {
  control = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, multipleStatements: true });
  await control.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  await control.query(`USE \`${database}\``);
  const schema = (await fs.readFile(new URL('../../schema.sql', import.meta.url), 'utf8')).replace(/CREATE DATABASE IF NOT EXISTS portal_kolab;\s*USE portal_kolab;/, '');
  await control.query(schema);
  process.env.DB_NAME = database;
  process.env.NODE_ENV = 'test';
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
  for (const role of ['STUDENT', 'LECTURER']) {
    const targetId = role === 'STUDENT' ? 'test-student' : 'test-lecturer';
    await bridge('manageMember', { type: 'updateIdentity', targetId, role, data: { name: 'Edited', password, studentType: 'STARTUP', startupId: 'startup', studentJobDesk: 'PIC Lab', lecturerCode: 'CODE' } });
    await request('/auth/login', { id: targetId, role, password }, null);
    await bridge('updateMemberStorage', { targetId, role, customQuota: 1000000, customMaxUpload: 500000 });
    const members = await bridge('getAllMembers');
    const member = members.find(m => m.studentId === targetId);
    assert.equal(member.customQuota, 1000000);
    assert.equal(member.name, 'Edited');
  }
  await request('/auth/register', { id: 'delete-me', role: 'STUDENT', name: 'Delete', password }, null);
  await bridge('manageMember', { type: 'delete', targetId: 'delete-me', role: 'STUDENT' });
  assert.equal((await bridge('getAllMembers')).some(m => m.studentId === 'delete-me'), false);
});

const fixtures = [
  ['manageStartup', 'startups', 'startup_teams', { name: 'Startup', website: 'web', ig: 'ig', tiktok: 'tiktok', linkedin: 'linkedin', logoUrl: 'logo' }, 'name'],
  ['manageInformasi', 'informasi', 'information', { title: 'Info', date: '2026-09-17T10:30:00.000Z', description: 'Info body', author: 'Admin', targetType: 'STARTUP_SPECIFIC', targetValue: 'startup' }, 'title'],
  ['manageSchedule', 'schedules', 'schedules', { title: 'Meeting', date: '2026-09-17', time: '10:30', endTime: '11:30', locationOffline: 'Lab', locationOnline: true, meetLink: 'https://meet.example', organizer: 'Administrator', description: 'Body', author: 'Admin' }, 'title'],
  ['manageEvent', 'events', 'events', { title: 'Event', date: '2026-09-17', time: '10:30', image: 'image', description: 'Body', locationOffline: 'Lab', locationOnline: 'Yes', maxParticipants: 20, status: 'OPEN', tags: ['tag,with comma', 'two'], meetLink: 'meet', author: 'Admin' }, 'title'],
  ['manageCategory', 'categories', 'article_categories', { name: 'Category' }, 'name'],
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
  const health = await request('/health'); assert.equal(health.database, 'UP');
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
    const action = { startups: 'getStartups', informasi: 'getInformasi', schedules: 'getSchedules', events: 'getEvents', categories: 'getCategories', articles: 'getArticles' }[endpoint];
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
