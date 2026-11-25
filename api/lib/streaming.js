// Streaming Hub catalog (Watch = yplaylists, TV Live = tvlive).
// Admin and lecturers publish directly; students propose items that wait for admin approval.
export const streamingCategories = ['KULIAH', 'WEBINAR', 'STARTUP', 'HIBURAN', 'LAINNYA'];
export const streamingActions = ['manageYPlaylist', 'yplaylistAction', 'manageTvLive', 'tvliveAction'];

const extraColumns = {
  category: "VARCHAR(20) NOT NULL DEFAULT 'LAINNYA'",
  status: "VARCHAR(20) NOT NULL DEFAULT 'APPROVED'",
  added_by_role: 'VARCHAR(20)',
  added_by_id: 'VARCHAR(100)',
  added_by_name: 'VARCHAR(255)'
};

export async function migrateStreaming(db) {
  await db.execute('CREATE TABLE IF NOT EXISTS yplaylists (playlist_id VARCHAR(100) PRIMARY KEY, title VARCHAR(255), thumbnail TEXT, published_at DATETIME, channel_title VARCHAR(255))');
  await db.execute('CREATE TABLE IF NOT EXISTS tvlive (id VARCHAR(50) PRIMARY KEY, title VARCHAR(255), video_id VARCHAR(100), thumbnail TEXT)');
  for (const table of ['yplaylists', 'tvlive']) {
    const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);
    for (const [column, type] of Object.entries(extraColumns)) {
      if (!columns.some(existing => existing.Field === column)) await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }
}

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const owner = user => user.role === 'ADMIN' ? user.username : user.id;
const isOwner = (row, user) => row.added_by_role === user.role && row.added_by_id === owner(user);

function clean(data, kind) {
  const title = String(data.title ?? '').trim();
  if (!title || title.length > 255) throw fail('Judul wajib diisi (maksimal 255 karakter).');
  const category = String(data.category || 'LAINNYA');
  if (!streamingCategories.includes(category)) throw fail('Kategori tidak valid.');
  const thumbnail = String(data.thumbnail ?? '').trim();
  if (thumbnail && (!/^https:\/\/\S+$/.test(thumbnail) || thumbnail.length > 1000)) throw fail('Thumbnail harus berupa URL https.');
  if (kind === 'playlist') {
    const playlistId = String(data.playlistId ?? '').trim();
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(playlistId)) throw fail('Link playlist YouTube tidak valid.');
    return { title, category, thumbnail, playlistId, channelTitle: String(data.channelTitle ?? '').trim().slice(0, 255) };
  }
  const videoId = String(data.videoId ?? '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw fail('Link video YouTube tidak valid.');
  return { title, category, thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, videoId };
}

export async function streamingAction(db, user, { action, type, id, data = {} }) {
  const kind = action === 'manageYPlaylist' || action === 'yplaylistAction' ? 'playlist' : 'tv';
  const table = kind === 'playlist' ? 'yplaylists' : 'tvlive';
  const key = kind === 'playlist' ? 'playlist_id' : 'id';
  const admin = user.role === 'ADMIN';

  if (type === 'add') {
    const item = clean(data, kind);
    const status = user.role === 'STUDENT' ? 'PENDING' : 'APPROVED';
    const by = [user.role, owner(user), user.account?.name || owner(user)];
    if (kind === 'playlist') {
      const [[existing]] = await db.execute('SELECT playlist_id FROM yplaylists WHERE playlist_id=? FOR UPDATE', [item.playlistId]);
      if (existing && !admin) throw fail('Playlist ini sudah ada di katalog.', 409);
      await db.execute(
        `INSERT INTO yplaylists (playlist_id, title, thumbnail, published_at, channel_title, category, status, added_by_role, added_by_id, added_by_name)
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), thumbnail=VALUES(thumbnail), channel_title=VALUES(channel_title), category=VALUES(category)`,
        [item.playlistId, item.title, item.thumbnail, item.channelTitle, item.category, status, ...by]
      );
      return { status: 'success', id: item.playlistId, itemStatus: status };
    }
    await db.execute(
      'INSERT INTO tvlive (id, title, video_id, thumbnail, category, status, added_by_role, added_by_id, added_by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, item.title, item.videoId, item.thumbnail, item.category, status, ...by]
    );
    return { status: 'success', id, itemStatus: status };
  }

  const [[row]] = await db.execute(`SELECT * FROM ${table} WHERE ${key}=? FOR UPDATE`, [id ?? '']);
  if (!row) throw fail('Data tidak ditemukan.', 404);

  if (type === 'delete') {
    if (!admin && !isOwner(row, user)) throw fail('Anda hanya bisa menghapus item yang Anda tambahkan.', 403);
    await db.execute(`DELETE FROM ${table} WHERE ${key}=?`, [id]);
    return { status: 'success', id };
  }
  if (!admin) throw fail('Akses admin diperlukan.', 403);
  if (type === 'approve') {
    await db.execute(`UPDATE ${table} SET status='APPROVED' WHERE ${key}=?`, [id]);
    return { status: 'success', id };
  }
  if (type === 'edit') {
    const current = kind === 'playlist'
      ? { title: row.title, thumbnail: row.thumbnail, playlistId: row.playlist_id, channelTitle: row.channel_title, category: row.category }
      : { title: row.title, thumbnail: row.thumbnail, videoId: row.video_id, category: row.category };
    const item = clean({ ...current, ...data, ...(kind === 'playlist' ? { playlistId: row.playlist_id } : {}) }, kind);
    if (kind === 'playlist') {
      await db.execute('UPDATE yplaylists SET title=?, thumbnail=?, channel_title=?, category=? WHERE playlist_id=?',
        [item.title, item.thumbnail, item.channelTitle, item.category, id]);
    } else {
      await db.execute('UPDATE tvlive SET title=?, video_id=?, thumbnail=?, category=? WHERE id=?',
        [item.title, item.videoId, item.thumbnail, item.category, id]);
    }
    return { status: 'success', id };
  }
  throw fail('Operasi tidak valid.');
}

// Approved items for everyone; pending items only for admins and the student who proposed them.
export async function streamingCatalog(db, user) {
  const admin = user.role === 'ADMIN';
  const visible = row => row.status !== 'PENDING' || admin || isOwner(row, user);
  const common = row => ({
    title: row.title, thumbnail: row.thumbnail || '', category: row.category || 'LAINNYA',
    status: row.status || 'APPROVED', addedByName: row.added_by_name || '',
    canDelete: admin || isOwner(row, user)
  });
  const [playlists] = await db.execute('SELECT * FROM yplaylists ORDER BY published_at DESC');
  const [tv] = await db.execute('SELECT * FROM tvlive ORDER BY title');
  return {
    status: 'success',
    playlists: playlists.filter(visible).map(row => ({ ...common(row), playlistId: row.playlist_id, channelTitle: row.channel_title || '' })),
    tv: tv.filter(visible).map(row => ({ ...common(row), id: row.id, videoId: row.video_id }))
  };
}
