import crypto from 'node:crypto';
import db from './db.js';
import { repoItem } from './serializers.js';
import * as cdn from './kroomboxCdn.js';
import { syncRepositoryCdn } from './repoCdnSync.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export const repositoryActions = ['getRepoFiles', 'getAdminRepoData', 'uploadFile', 'uploadToRepo', 'createFolder', 'renameRepoItem', 'copyRepoItem', 'deleteRepoItem'];

function category(mime, name) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'sound';
  if (/pdf$/i.test(mime)) return 'pdf';
  if (/\.(zip|rar|7z|gz)$/i.test(name)) return 'archive';
  if (/\.(xlsx?|csv|ods)$/i.test(name)) return 'spreadsheet';
  if (/\.(docx?|txt|pptx?|odt)$/i.test(name)) return 'document';
  return 'other';
}

export async function listRepository(user, all = false, apiOrigin = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3001}/api`) {
  if (all && user.role !== 'ADMIN') fail('Akses admin diperlukan.', 403);
  const cdnSync = await syncRepositoryCdn();
  const [rows] = await db.execute(`SELECT r.* FROM repo r WHERE NOT EXISTS
    (SELECT 1 FROM cdn_assets a WHERE a.cdn_file_id COLLATE utf8mb4_unicode_ci = r.cdn_asset_id COLLATE utf8mb4_unicode_ci AND a.deleted_at IS NOT NULL)
    ${all ? '' : 'AND r.owner_id=? AND r.role=?'} ORDER BY r.date DESC`, all ? [] : [user.id, user.role]);
  const items = rows.map(row => {
    const item = repoItem(row);
    if (item.url?.startsWith('/api/files/')) item.url = `${apiOrigin.replace(/\/$/, '')}/files/${encodeURIComponent(item.id)}`;
    return item;
  });
  const files = items.filter(item => item.type === 'FILE');
  const categoryStats = Object.fromEntries(['image', 'pdf', 'sound', 'archive', 'document', 'video', 'spreadsheet', 'other'].map(c => [c, { count: 0, size: 0 }]));
  for (const file of files) {
    const stat = categoryStats[file.category] || categoryStats.other;
    stat.count++; stat.size += file.size;
  }
  const usedSpace = files.reduce((sum, file) => sum + file.size, 0);
  return { items, cdnSync, globalStats: { usedSpace, clusterSpace: usedSpace, totalQuota: Number(user.account?.custom_quota || 0),
    fileCount: files.length, folderCount: items.length - files.length, categoryStats,
    topFiles: [...files].sort((a, b) => b.size - a.size).slice(0, 10) } };
}

export async function repositoryAction(req) {
  const p = req.body, user = req.user, action = p.action;
  if (action === 'getRepoFiles' || action === 'getAdminRepoData') return listRepository(user, action === 'getAdminRepoData', process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const table = user.role === 'ADMIN' ? 'admins' : user.role === 'STUDENT' ? 'students' : 'lecturers';
    const key = user.role === 'ADMIN' ? 'username' : user.role === 'STUDENT' ? 'nim' : 'nip';
    const [[account]] = await conn.execute(`SELECT * FROM ${table} WHERE ${key}=? FOR UPDATE`, [user.role === 'ADMIN' ? user.username : user.id]);
    const [[assets = {}]] = await conn.execute('SELECT * FROM assets ORDER BY id LIMIT 1');
    const policy = JSON.parse((user.role === 'STUDENT' ? assets.student_policy : assets.lecturer_policy) || '{}');
    async function checkQuota(size, cat, upload = false) {
      if (user.role === 'ADMIN') return;
      const quota = Number(account.custom_quota ?? policy.defaultQuota ?? 524288000);
      const max = Number(account.custom_max_upload ?? policy.maxUploadSize ?? 20971520);
      if (upload && size > max) fail('Ukuran file melebihi batas upload.');
      if (Array.isArray(policy.allowedCategories) && !policy.allowedCategories.includes(cat)) fail('Kategori file tidak diizinkan.');
      const [[usage]] = await conn.execute("SELECT COALESCE(SUM(size),0) AS used FROM repo r WHERE owner_id=? AND role=? AND type='FILE' AND NOT EXISTS (SELECT 1 FROM cdn_assets a WHERE a.cdn_file_id COLLATE utf8mb4_unicode_ci = r.cdn_asset_id COLLATE utf8mb4_unicode_ci AND a.deleted_at IS NOT NULL)", [user.id, user.role]);
      if (Number(usage.used) + size > quota) fail('Kuota penyimpanan tidak cukup.');
    }
    async function item(id) {
      const [[row]] = await conn.execute('SELECT * FROM repo WHERE id=? FOR UPDATE', [id || '']);
      if (!row) fail('Item repository tidak ditemukan.', 404);
      if (user.role !== 'ADMIN' && (row.owner_id !== user.id || row.role !== user.role)) fail('Akses ditolak.', 403);
      return row;
    }
    async function parent(id) {
      if (!id || id === 'ROOT' || id === 'VIRTUAL_REPO_ADMIN') return 'ROOT';
      const row = await item(id);
      if (row.type !== 'FOLDER' || row.owner_id !== user.id || row.role !== user.role) fail('Folder tujuan tidak valid.');
      return row.id;
    }
    const newId = () => crypto.randomUUID();
    const name = value => {
      if (typeof value !== 'string' || !value.trim() || value.length > 255) fail('Nama file/folder tidak valid.');
      return value.trim();
    };
    let result = { status: 'success' };
    if (action === 'uploadFile' || action === 'uploadToRepo' || action === 'createFolder') {
      const folder = action === 'createFolder';
      const id = newId(), label = name(folder ? p.name : (p.label || p.fileName));
      const parentId = await parent(p.parentId);
      const mime = folder ? 'folder' : (p.mimeType || 'application/octet-stream');
      let bytes;
      let cdnFileId = null;
      let cdnDeliveryUrl = null;
      let cdnStatus = 'PROCESSING';
      let storageProvider = 'LEGACY';

      if (!folder) {
        const encoded = typeof p.data === 'string' ? p.data.replace(/^data:[^,]*,/, '') : '';
        if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) fail('Data file base64 tidak valid.');
        bytes = Buffer.from(encoded, 'base64');
      }

      const cat = folder ? 'folder' : category(mime, p.fileName || label);
      if (!folder) await checkQuota(bytes.length, cat, true);

      let url = '';
      if (!folder) {
        // Try CDN upload first
        try {
          const cdnResult = await cdn.uploadFile(bytes, p.fileName || label, mime, {
            featureType: 'REPOSITORY_FILE'
          });
          cdnFileId = cdnResult.fileId;
          cdnDeliveryUrl = cdnResult.deliveryUrl;
          cdnStatus = cdnResult.status || 'PROCESSING';
          storageProvider = 'KROOMBOX_CDN';

          // For repo: use Portal access URL (authorizes download)
          const origin = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`).replace(/\/$/, '');
          url = `${origin}/files/${id}`;
        } catch (cdnErr) {
          // Fallback to legacy if CDN fails
          console.warn('[Repo] CDN upload failed, using legacy storage:', cdnErr.message);
          storageProvider = 'LEGACY';
          const origin = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`).replace(/\/$/, '');
          url = `${origin}/files/${id}`;
        }
      }

      await conn.execute(
        'INSERT INTO repo (id,name,url,date,size,mime,category,owner_id,role,parent_id,type,cdn_asset_id,storage_provider) VALUES (?,?,?,NOW(),?,?,?,?,?,?,?,?,?)',
        [id, label, url, bytes?.length || 0, mime, cat, user.id, user.role, parentId, folder ? 'FOLDER' : 'FILE', cdnFileId, storageProvider]
      );

      if (!folder) {
        if (storageProvider === 'KROOMBOX_CDN') {
          // Store CDN asset metadata
          await conn.execute(
            `INSERT INTO cdn_assets (id, cdn_file_id, owner_id, owner_role, feature_type, feature_id,
              original_name, mime_type, file_size, cdn_delivery_url, cdn_status, is_private, storage_provider, created_by)
             VALUES (?, ?, ?, ?, 'REPOSITORY_FILE', ?, ?, ?, ?, ?, ?, true, 'KROOMBOX_CDN', ?)`,
            [crypto.randomUUID(), cdnFileId, user.id, user.role, id, p.fileName || label, mime, bytes.length, cdnDeliveryUrl, cdnStatus, user.id]
          );
        } else {
          // Legacy fallback: store in file_blobs
          await conn.execute('INSERT INTO file_blobs (repo_id, content) VALUES (?,?)', [id, bytes]);
        }
      }

      result = { ...result, id, url };
    } else {
      const source = await item(p.id);
      if (action === 'renameRepoItem') {
        const newName = name(p.newName);
        if (source.cdn_asset_id) {
          try { await cdn.renameFile(source.cdn_asset_id, newName); }
          catch { fail('Nama belum diubah karena CDN tidak dapat memperbarui file. Silakan coba kembali.', 502); }
        }
        await conn.execute('UPDATE repo SET name=? WHERE id=?', [newName, source.id]);
      }
      if (action === 'deleteRepoItem') {
        const remove = async row => {
          const [children] = await conn.execute('SELECT * FROM repo WHERE parent_id=?', [row.id]);
          for (const child of children) await remove(child);
          // Delete from CDN if applicable
          if (row.cdn_asset_id && row.storage_provider === 'KROOMBOX_CDN') {
            try { await cdn.deleteFile(row.cdn_asset_id); }
            catch { fail('File belum dihapus karena CDN belum mengonfirmasi penghapusan. Silakan coba kembali.', 502); }
            await conn.execute("UPDATE cdn_assets SET cdn_status='DELETED', deleted_at=NOW() WHERE cdn_file_id=?", [row.cdn_asset_id]);
          }
          // Also delete legacy blob if exists
          await conn.execute('DELETE FROM file_blobs WHERE repo_id=?', [row.id]);
          await conn.execute('DELETE FROM repo WHERE id=?', [row.id]);
        };
        await remove(source);
      }
      if (action === 'copyRepoItem') {
        const parentId = await parent(p.newParentId);
        let cursor = parentId;
        while (cursor !== 'ROOT') {
          if (cursor === source.id) fail('Folder tidak dapat disalin ke dalam dirinya sendiri.');
          cursor = (await item(cursor)).parent_id || 'ROOT';
        }
        const copy = async (row, destination, label) => {
          const [children] = await conn.execute('SELECT * FROM repo WHERE parent_id=?', [row.id]);
          if (row.type === 'FILE') await checkQuota(Number(row.size), row.category);
          const id = newId();
          let url = row.url;
          let newCdnFileId = null;
          let newStorageProvider = row.storage_provider || 'LEGACY';

          if (row.type === 'FILE') {
            if (row.storage_provider === 'KROOMBOX_CDN' && row.cdn_asset_id) {
              // Get file from CDN and re-upload as new copy
              try {
                const [[blob]] = await conn.execute('SELECT content FROM file_blobs WHERE repo_id=?', [row.id]);
                if (blob) {
                  // Legacy fallback blob exists
                  const cdnResult = await cdn.uploadFile(blob.content, label, row.mime, { featureType: 'REPOSITORY_FILE' });
                  newCdnFileId = cdnResult.fileId;
                  newStorageProvider = 'KROOMBOX_CDN';
                }
              } catch { newStorageProvider = 'LEGACY'; }
            } else {
              const [[blob]] = await conn.execute('SELECT content FROM file_blobs WHERE repo_id=?', [row.id]);
              if (blob) {
                try {
                  const cdnResult = await cdn.uploadFile(blob.content, label, row.mime, { featureType: 'REPOSITORY_FILE' });
                  newCdnFileId = cdnResult.fileId;
                  newStorageProvider = 'KROOMBOX_CDN';
                } catch {
                  newStorageProvider = 'LEGACY';
                }
              }
            }
            const origin = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`).replace(/\/$/, '');
            url = newStorageProvider === 'KROOMBOX_CDN' ? `${origin}/files/${id}` : `${origin}/files/${id}`;
          }

          await conn.execute(
            'INSERT INTO repo (id,name,url,date,size,mime,category,owner_id,role,parent_id,type,cdn_asset_id,storage_provider) VALUES (?,?,?,NOW(),?,?,?,?,?,?,?,?,?)',
            [id, label, url, row.size, row.mime, row.category, user.id, user.role, destination, row.type, newCdnFileId, newStorageProvider]
          );

          if (row.type === 'FILE' && newStorageProvider === 'LEGACY') {
            const [[blob]] = await conn.execute('SELECT content FROM file_blobs WHERE repo_id=?', [row.id]);
            if (blob) await conn.execute('INSERT INTO file_blobs (repo_id,content) VALUES (?,?)', [id, blob.content]);
          }

          for (const child of children) await copy(child, id, child.name);
          return id;
        };
        result.id = await copy(source, parentId, name(p.newName || source.name));
      }
    }
    await conn.commit();
    return result;
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}
