import crypto from 'node:crypto';
import { parseStreamingLink } from './streamingLinks.js';

// Streaming Hub: every member keeps any number of YouTube/Spotify links. PRIVATE items are visible only to
// their owner; SHARED items go to the common catalog. Admins and lecturers share directly, students' shared
// items wait for admin approval.
export const streamingCategories = ['EDUKASI', 'MUSIK', 'PODCAST', 'HIBURAN', 'INSPIRASI', 'BISNIS', 'EVENT', 'LIVE', 'LAINNYA'];
const maxItemsPerOwner = 200;

export async function migrateStreaming(db) {
  const [[exists]] = await db.query("SHOW TABLES LIKE 'streaming_items'");
  await db.execute(`CREATE TABLE IF NOT EXISTS streaming_items (
    id VARCHAR(100) PRIMARY KEY, provider VARCHAR(20) NOT NULL, kind VARCHAR(20) NOT NULL,
    url TEXT NOT NULL, embed_url TEXT NOT NULL, title VARCHAR(255) NOT NULL, thumbnail TEXT,
    category VARCHAR(20) NOT NULL DEFAULT 'LAINNYA', visibility VARCHAR(10) NOT NULL DEFAULT 'PRIVATE',
    status VARCHAR(10) NOT NULL DEFAULT 'APPROVED', owner_role VARCHAR(20) NOT NULL, owner_id VARCHAR(100) NOT NULL,
    owner_name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_streaming_owner (owner_role, owner_id), INDEX idx_streaming_shared (visibility, status)
  )`);
  // One-time copy of the old single-playlist fields and admin catalogs, only when the table is first created,
  // so items people delete later do not come back on the next restart.
  if (!exists) await importLegacy(db);
}

async function importLegacy(db) {
  const rows = [];
  const add = (id, link, title, category, visibility, role, owner, name, thumbnail = '') => {
    const parsed = parseStreamingLink(link);
    if (parsed) rows.push([id, parsed.provider, parsed.kind, parsed.url, parsed.embedUrl, String(title || 'Tanpa judul').slice(0, 255),
      thumbnail || parsed.thumbnail, category, visibility, 'APPROVED', role, owner, name]);
  };
  const [playlists] = await db.query('SELECT * FROM yplaylists').catch(() => [[]]);
  for (const row of playlists) add(`legacy-pl-${row.playlist_id}`, `https://www.youtube.com/playlist?list=${row.playlist_id}`, row.title, 'LAINNYA', 'SHARED', 'ADMIN', 'admin', 'Admin', row.thumbnail);
  const [channels] = await db.query('SELECT * FROM tvlive').catch(() => [[]]);
  for (const row of channels) add(`legacy-tv-${row.id}`, `https://www.youtube.com/watch?v=${row.video_id}`, row.title, 'LIVE', 'SHARED', 'ADMIN', 'admin', 'Admin', row.thumbnail);
  const [[assets]] = await db.query('SELECT admin_youtube, admin_spotify FROM assets LIMIT 1').catch(() => [[]]);
  add('legacy-default-yt', assets?.admin_youtube, 'Pilihan admin (YouTube)', 'LAINNYA', 'SHARED', 'ADMIN', 'admin', 'Admin');
  add('legacy-default-sp', assets?.admin_spotify, 'Pilihan admin (Spotify)', 'MUSIK', 'SHARED', 'ADMIN', 'admin', 'Admin');
  for (const [table, role, key] of [['students', 'STUDENT', 'nim'], ['lecturers', 'LECTURER', 'nip'], ['admins', 'ADMIN', 'username']]) {
    const [people] = await db.query(`SELECT ${key} AS id, name, youtube, spotify FROM ${table} WHERE youtube <> '' OR spotify <> ''`).catch(() => [[]]);
    for (const person of people) {
      add(`legacy-${role}-${person.id}-yt`.slice(0, 100), person.youtube, 'Playlist YouTube saya', 'LAINNYA', 'PRIVATE', role, person.id, person.name);
      add(`legacy-${role}-${person.id}-sp`.slice(0, 100), person.spotify, 'Playlist Spotify saya', 'MUSIK', 'PRIVATE', role, person.id, person.name);
    }
  }
  for (const row of rows) {
    await db.execute(`INSERT IGNORE INTO streaming_items (id, provider, kind, url, embed_url, title, thumbnail, category, visibility, status, owner_role, owner_id, owner_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, row);
  }
}

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const ownerId = user => user.role === 'ADMIN' ? user.username : user.id;
const isMine = (row, user) => row.owner_role === user.role && row.owner_id === ownerId(user);

function clean(data) {
  const link = parseStreamingLink(data.link);
  if (!link) throw fail('Link tidak dikenali. Tempel link dari YouTube atau Spotify.');
  const title = String(data.title ?? '').trim();
  if (!title || title.length > 255) throw fail('Judul wajib diisi (maksimal 255 karakter).');
  const category = String(data.category || 'LAINNYA');
  if (!streamingCategories.includes(category)) throw fail('Kategori tidak valid.');
  const visibility = data.visibility === 'SHARED' ? 'SHARED' : 'PRIVATE';
  return { link, title, category, visibility };
}

const statusFor = (user, visibility) => visibility === 'SHARED' && user.role === 'STUDENT' ? 'PENDING' : 'APPROVED';

export async function manageStreamingItem(db, user, { type, id, data = {} }) {
  const admin = user.role === 'ADMIN';
  if (type === 'add') {
    const item = clean(data);
    const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM streaming_items WHERE owner_role=? AND owner_id=?', [user.role, ownerId(user)]);
    if (total >= maxItemsPerOwner) throw fail(`Maksimal ${maxItemsPerOwner} item per akun.`);
    const newId = crypto.randomUUID();
    const status = statusFor(user, item.visibility);
    await db.execute(`INSERT INTO streaming_items (id, provider, kind, url, embed_url, title, thumbnail, category, visibility, status, owner_role, owner_id, owner_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, item.link.provider, item.link.kind, item.link.url, item.link.embedUrl, item.title, item.link.thumbnail, item.category,
      item.visibility, status, user.role, ownerId(user), user.account?.name || ownerId(user)]);
    return { status: 'success', id: newId, itemStatus: status };
  }

  const [[row]] = await db.execute('SELECT * FROM streaming_items WHERE id=? FOR UPDATE', [id ?? '']);
  if (!row) throw fail('Data tidak ditemukan.', 404);
  if (type === 'approve') {
    if (!admin) throw fail('Akses admin diperlukan.', 403);
    await db.execute("UPDATE streaming_items SET status='APPROVED' WHERE id=?", [id]);
    return { status: 'success', id };
  }
  if (!admin && !isMine(row, user)) throw fail('Anda hanya bisa mengubah item milik Anda sendiri.', 403);
  if (type === 'delete') {
    await db.execute('DELETE FROM streaming_items WHERE id=?', [id]);
    return { status: 'success', id };
  }
  if (type === 'edit') {
    const item = clean({ link: row.url, title: row.title, category: row.category, visibility: row.visibility, ...data });
    // A student's edit of a shared item goes back to review; an admin editing someone else's item keeps its status.
    const status = admin && !isMine(row, user) ? (item.visibility === 'SHARED' ? row.status : 'APPROVED') : statusFor(user, item.visibility);
    const thumbnail = item.link.url === row.url ? row.thumbnail : item.link.thumbnail;
    await db.execute('UPDATE streaming_items SET provider=?, kind=?, url=?, embed_url=?, title=?, thumbnail=?, category=?, visibility=?, status=? WHERE id=?',
      [item.link.provider, item.link.kind, item.link.url, item.link.embedUrl, item.title, thumbnail, item.category, item.visibility, status, id]);
    return { status: 'success', id, itemStatus: status };
  }
  throw fail('Operasi tidak valid.');
}

// Own items, approved shared items, and (for admins) shared items waiting for approval.
export async function listStreamingItems(db, user) {
  const admin = user.role === 'ADMIN';
  const [rows] = await db.execute(
    `SELECT * FROM streaming_items WHERE (owner_role=? AND owner_id=?) OR (visibility='SHARED' AND (status='APPROVED' OR ?))
     ORDER BY created_at DESC`, [user.role, ownerId(user), admin]);
  return {
    status: 'success',
    items: rows.map(row => ({
      id: row.id, provider: row.provider, kind: row.kind, url: row.url, embedUrl: row.embed_url, title: row.title,
      thumbnail: row.thumbnail || '', category: row.category, visibility: row.visibility, status: row.status,
      ownerName: row.owner_name || '', mine: isMine(row, user), canEdit: admin || isMine(row, user)
    }))
  };
}
