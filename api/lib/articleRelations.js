import crypto from 'node:crypto';

const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };

// Called within the same transaction as the article INSERT/UPDATE.
export async function saveArticleRelations(db, articleId, data, user) {
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags) || data.tags.length > 5 || data.tags.some(id => typeof id !== 'string')) fail('Maksimal 5 tag yang valid.');
    const inputTags = [...new Set(data.tags)];
    const finalIds = [];
    if (inputTags.length) {
      const [existingById] = await db.execute(`SELECT id FROM article_tags WHERE id IN (${inputTags.map(() => '?').join(',')})`, inputTags);
      const existingIds = new Set(existingById.map(r => r.id));
      
      for (const input of inputTags) {
        if (existingIds.has(input)) {
          finalIds.push(input);
        } else {
           const name = String(input).trim();
           if (!name) continue;
           const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
           if (slug) {
              const [[existingBySlug]] = await db.execute('SELECT id FROM article_tags WHERE slug = ?', [slug]);
              if (existingBySlug) {
                 finalIds.push(existingBySlug.id);
              } else {
                 const newId = `tag-${crypto.randomUUID()}`;
                 await db.execute('INSERT INTO article_tags (id, name, slug) VALUES (?, ?, ?)', [newId, name, slug]);
                 finalIds.push(newId);
              }
           }
        }
      }
    }
    const ids = [...new Set(finalIds)];
    
    await db.execute('DELETE FROM article_tag_map WHERE article_id=?', [articleId]);
    for (const id of ids) await db.execute('INSERT INTO article_tag_map (article_id,tag_id) VALUES (?,?)', [articleId, id]);
  }
  if (data.attachments === undefined) return; // Older clients preserve attachments.
  if (!Array.isArray(data.attachments) || data.attachments.length > 5) fail('Maksimal 5 lampiran per artikel.');
  const [existing] = await db.execute('SELECT * FROM article_attachments WHERE article_id=?', [articleId]);
  const attachments = [];
  const seen = new Set();
  for (const entry of data.attachments) {
    if (!entry || typeof entry.fileId !== 'string' || seen.has(entry.fileId)) fail('Referensi lampiran tidak valid.');
    seen.add(entry.fileId);
    const kept = existing.find(row => row.file_id === entry.fileId);
    if (kept) { attachments.push(kept); continue; }
    const [[asset]] = await db.execute('SELECT * FROM cdn_assets WHERE id=? AND deleted_at IS NULL', [entry.fileId]);
    if (!asset || !asset.cdn_file_id || asset.feature_type !== 'ARTICLE_ATTACHMENT' ||
        asset.feature_id !== articleId || asset.owner_id !== user.id || asset.owner_role !== user.role ||
        asset.is_private || asset.cdn_status !== 'READY') {
      fail('Lampiran belum diunggah atau tidak dapat digunakan untuk artikel ini.');
    }
    attachments.push({ id: crypto.randomUUID(), file_id: asset.id, original_name: asset.original_name,
      mime_type: asset.mime_type, size: asset.file_size, cdn_asset_id: asset.id, storage_provider: 'KROOMBOX_CDN' });
  }
  await db.execute('DELETE FROM article_attachments WHERE article_id=?', [articleId]);
  for (const row of attachments) {
    await db.execute(`INSERT INTO article_attachments (id,article_id,file_id,original_name,mime_type,size,cdn_asset_id,storage_provider) VALUES (?,?,?,?,?,?,?,?)`,
      [row.id, articleId, row.file_id, row.original_name, row.mime_type, row.size, row.cdn_asset_id || null, row.storage_provider || 'LEGACY']);
  }
}
