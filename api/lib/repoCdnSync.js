import crypto from 'node:crypto';
import db from './db.js';
import * as cdn from './kroomboxCdn.js';
import { normalizeSnapshot, fileCategory, confirmedMissing } from './repoCdnSnapshot.js';

let inFlight;
let lastAttempt = 0;
let lastResult = { status: 'idle' };
let missing = new Map();

export async function syncRepositoryCdn() {
  if (process.env.KROOMBOX_CDN_SYNC_ENABLED === 'false' || !process.env.KROOMBOX_CDN_PROJECT_ID || !process.env.KROOMBOX_CDN_API_KEY) return { status: 'disabled' };
  if (inFlight) return inFlight;
  if (Date.now() - lastAttempt < 10000) return lastResult;
  lastAttempt = Date.now();
  inFlight = reconcile().then(result => (lastResult = result)).catch(error => {
    missing.clear();
    console.warn('[Repo CDN Sync] Inventory unchanged:', error.code || 'SYNC_FAILED', error.response?.status || '');
    return (lastResult = { status: 'unavailable', message: 'Sinkronisasi CDN tertunda. Daftar terakhir tetap ditampilkan.' });
  }).finally(() => { inFlight = undefined; });
  return inFlight;
}

async function reconcile() {
  const conn = await db.getConnection();
  let locked = false;
  try {
    // Also serialize concurrent Portal instances sharing the same database.
    const [[lock]] = await conn.execute("SELECT GET_LOCK(CONCAT(DATABASE(), ':repo-cdn-sync'), 0) AS acquired");
    if (!lock.acquired) return { status: 'busy' };
    locked = true;
    const snapshot = normalizeSnapshot(await cdn.listFiles(), process.env.KROOMBOX_CDN_PROJECT_ID);
    await conn.beginTransaction();
    const [rows] = await conn.execute("SELECT *, (date > NOW() - INTERVAL 1 MINUTE) AS is_recent FROM repo WHERE storage_provider='KROOMBOX_CDN' FOR UPDATE");
    const [assets] = await conn.execute('SELECT * FROM cdn_assets FOR UPDATE');
    const byRemote = new Map(rows.map(row => [row.cdn_asset_id, row]));
    const assetIds = new Set(assets.map(asset => asset.cdn_file_id));
    // Preserve existing ownership. Unknown CDN files belong to the admin inbox.
    for (const remote of snapshot) {
      if (!byRemote.has(remote.id) && !assetIds.has(remote.id)) {
        const id = `cdn-${remote.id}`;
        await conn.execute(`INSERT INTO repo (id,name,url,date,size,mime,category,owner_id,role,parent_id,type,cdn_asset_id,storage_provider)
          VALUES (?,?,?,NOW(),?,?,?,'ROOT','ADMIN','ROOT',?,?,'KROOMBOX_CDN')`,
        [id, remote.name, `/api/files/${id}`, remote.size, remote.mime, fileCategory(remote.mime, remote.name), remote.type, remote.id]);
        await conn.execute(`INSERT INTO cdn_assets (id,cdn_file_id,owner_id,owner_role,feature_type,feature_id,original_name,mime_type,file_size,cdn_delivery_url,cdn_status,is_private,storage_provider,created_by)
          VALUES (?,?,'ROOT','ADMIN','REPOSITORY_FILE',?,?,?,?,?,?,true,'KROOMBOX_CDN','ROOT')`,
        [crypto.randomUUID(), remote.id, id, remote.name, remote.mime, remote.size, cdn.getDeliveryUrl(remote.id), remote.status]);
        byRemote.set(remote.id, { id, owner_id: 'ROOT', role: 'ADMIN', parent_id: 'ROOT' });
      }
    }
    for (const remote of snapshot) {
      const local = byRemote.get(remote.id);
      if (!local) continue;
      if (!assetIds.has(remote.id) && rows.some(row => row.cdn_asset_id === remote.id)) {
        await conn.execute(`INSERT INTO cdn_assets (id,cdn_file_id,owner_id,owner_role,feature_type,feature_id,original_name,mime_type,file_size,cdn_delivery_url,cdn_status,is_private,storage_provider,created_by)
          VALUES (?,?,?,?,'REPOSITORY_FILE',?,?,?,?,?, ?,true,'KROOMBOX_CDN',?)`,
        [crypto.randomUUID(), remote.id, local.owner_id, local.role, local.id, remote.name, remote.mime, remote.size, cdn.getDeliveryUrl(remote.id), remote.status, local.owner_id]);
      }
      const parent = byRemote.get(remote.parent);
      // Portal's own folders remain logical folders; map CDN folders only for
      // imported entries, and never move a file into another owner's folder.
      const parentId = local.id.startsWith('cdn-')
        ? (parent && snapshot.some(r => r.id === remote.parent && r.type === 'FOLDER') &&
          parent.owner_id === local.owner_id && parent.role === local.role ? parent.id : 'ROOT')
        : local.parent_id;
      await conn.execute('UPDATE repo SET name=?,size=?,mime=?,category=?,parent_id=? WHERE cdn_asset_id=? AND storage_provider=\'KROOMBOX_CDN\'',
        [remote.name, remote.size, remote.mime, fileCategory(remote.mime, remote.name), parentId, remote.id]);
      await conn.execute('UPDATE cdn_assets SET original_name=?,mime_type=?,file_size=?,cdn_status=?,deleted_at=NULL WHERE cdn_file_id=?',
        [remote.name, remote.mime, remote.size, remote.status, remote.id]);
    }
    const changes = confirmedMissing(rows, new Set(snapshot.map(r => r.id)), missing, Date.now());
    for (const id of changes.removed) {
      // Keep metadata/ownership for audit and restoration, hide from all lists.
      await conn.execute("UPDATE cdn_assets SET cdn_status='DELETED',deleted_at=COALESCE(deleted_at,NOW()) WHERE cdn_file_id=?", [id]);
    }
    await conn.commit();
    missing = changes.pending;
    return { status: 'success', syncedAt: new Date().toISOString() };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    if (locked) await conn.execute("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':repo-cdn-sync'))").catch(() => {});
    conn.release();
  }
}
