// The deployed bridge returns the complete project inventory as an array.
// Reject unknown/paginated shapes rather than treating them as an empty project.
export function normalizeSnapshot(data, projectId) {
  if (!projectId || !Array.isArray(data)) throw new Error('Incomplete CDN inventory');
  const seen = new Set();
  return data.map(row => {
    if (!row || String(row.project_id ?? row.projectId) !== projectId ||
        typeof row.id !== 'string' || !row.id || row.id.length > 50 || seen.has(row.id) ||
        typeof row.name !== 'string' || !row.name.trim() || row.name.length > 255) {
      throw new Error('Invalid CDN inventory');
    }
    seen.add(row.id);
    const mime = row.mime_type ?? row.mimeType;
    const size = Number(row.size);
    if (typeof mime !== 'string' || !mime || mime.length > 100 || !Number.isSafeInteger(size) || size < 0) {
      throw new Error('Invalid CDN file metadata');
    }
    const folder = mime === 'folder' || mime === 'application/vnd.google-apps.folder' || row.type === 'FOLDER';
    const status = String(row.status || '').toUpperCase();
    return { id: row.id, name: row.name, mime: folder ? 'folder' : mime, size,
      type: folder ? 'FOLDER' : 'FILE', parent: row.parent_id ?? row.parentId ?? null,
      status: ['READY', 'SUCCESS', 'DONE'].includes(status) ? 'READY' : 'PROCESSING' };
  });
}

export function fileCategory(mime, name) {
  if (mime === 'folder') return 'folder';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'sound';
  if (/pdf$/i.test(mime)) return 'pdf';
  if (/\.(zip|rar|7z|gz)$/i.test(name)) return 'archive';
  if (/\.(xlsx?|csv|ods)$/i.test(name)) return 'spreadsheet';
  if (/\.(docx?|txt|pptx?|odt)$/i.test(name)) return 'document';
  return 'other';
}

// Require two successful inventories at least 30s apart; reset on any failure.
export function confirmedMissing(rows, remoteIds, previous, now) {
  const pending = new Map();
  const removed = [];
  for (const row of rows) {
    if (!row.cdn_asset_id || remoteIds.has(row.cdn_asset_id) || row.is_recent) continue;
    const since = previous.get(row.cdn_asset_id) ?? now;
    pending.set(row.cdn_asset_id, since);
    if (now - since >= 30000) removed.push(row.cdn_asset_id);
  }
  return { pending, removed: [...new Set(removed)] };
}
