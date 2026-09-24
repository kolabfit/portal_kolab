/**
 * Portal Asset API — Gateway for all file operations via Kroombox CDN
 *
 * Routes:
 *   POST   /api/assets/upload      Upload file to CDN
 *   GET    /api/assets/:id         Get asset metadata
 *   GET    /api/assets/:id/access  Get file access (public URL or signed URL)
 *   DELETE /api/assets/:id         Delete asset
 */

import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';
import * as cdn from '../lib/kroomboxCdn.js';
import { validateFile, FILE_VALIDATION } from '../config/storage.js';

const router = express.Router();

// Memory storage — buffer passes directly to CDN, no disk write
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB hard limit at multer level
});

// ─── GET /api/assets/cdn-repo/:id/access ─────────────────────────────────────
// Compatibility redirect for repo CDN URLs generated before route fix.
// Delegates to the canonical repo file access handler.
router.get('/cdn-repo/:id/access', (req, res) => {
  const repoId = req.params.id;
  return res.redirect(`${req.protocol}://${req.get('host')}/api/files/${encodeURIComponent(repoId)}`);
});

// ─── POST /api/assets/upload ────────────────────────────────────────────────
router.post('/upload', requireSession, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ status: 'error', message: 'Tidak ada file yang diunggah.' });

    const featureType = String(req.body.featureType || 'OTHER').toUpperCase();
    const featureId = String(req.body.featureId || '');
    const visibility = String(req.body.visibility || 'public').toLowerCase();
    const isPrivate = visibility === 'private' || (FILE_VALIDATION[featureType]?.isPrivate ?? false);

    // Validate file
    const validation = validateFile(file, featureType);
    if (!validation.valid) {
      return res.status(400).json({ status: 'error', message: validation.error });
    }

    const conn = await db.getConnection();
    try {
      const assetId = crypto.randomUUID();

      // Insert UPLOADING record first
      await conn.execute(
        `INSERT INTO cdn_assets (id, owner_id, owner_role, feature_type, feature_id,
          original_name, mime_type, file_size, cdn_status, is_private, storage_provider, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADING', ?, 'KROOMBOX_CDN', ?)`,
        [assetId, req.user.id, req.user.role, featureType, featureId,
         file.originalname, file.mimetype, file.size, isPrivate, req.user.id]
      );

      // Upload to CDN
      let cdnResult;
      try {
        cdnResult = await cdn.uploadFile(file.buffer, file.originalname, file.mimetype, {
          featureType
        });
      } catch (cdnError) {
        // Update status to FAILED, but keep metadata row
        await conn.execute(
          `UPDATE cdn_assets SET cdn_status='FAILED' WHERE id=?`, [assetId]
        );
        console.error(`[CDN] Upload failed for asset ${assetId}:`, cdnError.message);
        return res.status(502).json({ status: 'error', message: 'File gagal diunggah. CDN sedang tidak tersedia, silakan coba kembali.' });
      }

      const fileId = cdnResult.fileId;
      let cdnStatus = cdnResult.status || 'PROCESSING';
      let deliveryUrl = cdnResult.deliveryUrl;

      // Article uploads return their ID immediately so retries can reuse it.
      // Other callers retain bounded readiness polling (30 seconds maximum).
      if (cdnStatus === 'PROCESSING' && fileId && !['ARTICLE_ATTACHMENT', 'ARTICLE_THUMBNAIL'].includes(featureType)) {
        try {
          const ready = await cdn.waitForReady(fileId, 8);
          cdnStatus = ready.status;
          deliveryUrl = ready.deliveryUrl || deliveryUrl;
        } catch {
          cdnStatus = 'PROCESSING'; // Will become ready eventually
        }
      }

      // Update with CDN file ID and status
      await conn.execute(
        `UPDATE cdn_assets SET cdn_file_id=?, cdn_delivery_url=?, cdn_status=? WHERE id=?`,
        [fileId, deliveryUrl, cdnStatus, assetId]
      );

      // Audit log
      await conn.execute(
        `INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), 'uploadCdnAsset', ?, ?)`,
        [req.user.id, JSON.stringify({ assetId, cdnFileId: fileId, featureType })]
      ).catch(() => {}); // Non-critical

      return res.json({
        status: 'success',
        asset: {
          id: assetId,
          fileId,
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          cdnStatus,
          url: `/api/assets/${assetId}/access`,
          deliveryUrl: isPrivate ? null : deliveryUrl
        }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Assets] Upload error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Upload gagal. Silakan coba kembali.' });
  }
});

// ─── GET /api/assets/:id ─────────────────────────────────────────────────────
router.get('/:id', requireSession, async (req, res) => {
  try {
    const [[asset]] = await db.execute('SELECT * FROM cdn_assets WHERE id=? AND deleted_at IS NULL', [req.params.id]);
    if (!asset) return res.status(404).json({ status: 'error', message: 'Asset tidak ditemukan.' });

    // Only owner or admin can see metadata
    if (req.user.role !== 'ADMIN' && asset.owner_id !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
    }

    if (asset.cdn_file_id && ['PROCESSING', 'UPLOADING'].includes(asset.cdn_status)) {
      try {
        const status = await cdn.getFileStatus(asset.cdn_file_id, { signal: AbortSignal.timeout(7000) });
        asset.cdn_status = status.status;
        await db.execute('UPDATE cdn_assets SET cdn_status=? WHERE id=?', [status.status, asset.id]);
      } catch {
        return res.status(503).json({ status: 'error', message: 'Status file belum dapat diperiksa. Silakan coba kembali.' });
      }
    }

    return res.json({
      id: asset.id,
      fileId: asset.cdn_file_id,
      name: asset.original_name,
      mimeType: asset.mime_type,
      size: asset.file_size,
      featureType: asset.feature_type,
      cdnStatus: asset.cdn_status,
      isPrivate: asset.is_private,
      url: `/api/assets/${asset.id}/access`,
      deliveryUrl: asset.is_private ? null : asset.cdn_delivery_url
    });
  } catch (error) {
    console.error('[Assets] Get error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil asset.' });
  }
});

// ─── GET /api/assets/:id/access ─────────────────────────────────────────────
router.get('/:id/access', async (req, res, next) => {
  // Published article attachments are public, like the article itself. Drafts
  // and all other asset types retain the existing session/permission checks.
  try {
    const [[published]] = await db.execute(`SELECT a.cdn_file_id FROM cdn_assets a
      JOIN article_attachments att ON att.file_id=a.id
      JOIN articles article ON article.id=att.article_id
      WHERE a.id=? AND a.feature_type='ARTICLE_ATTACHMENT' AND a.is_private=false AND a.deleted_at IS NULL LIMIT 1`, [req.params.id]);
    if (published?.cdn_file_id) {
      res.set('Cache-Control', 'private, no-store');
      return res.redirect(await cdn.createSignedUrl(published.cdn_file_id, 900));
    }
    return requireSession(req, res, next);
  } catch (error) { next(error); }
}, async (req, res) => {
  try {
    const [[asset]] = await db.execute('SELECT * FROM cdn_assets WHERE id=? AND deleted_at IS NULL', [req.params.id]);
    if (!asset) return res.status(404).json({ status: 'error', message: 'Asset tidak ditemukan.' });

    // Permission check
    if (req.user.role !== 'ADMIN') {
      // Repo files: owner access only
      if (asset.feature_type === 'REPOSITORY_FILE' && asset.owner_id !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
      }
      // Private files: owner or admin only
      if (asset.is_private && asset.owner_id !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
      }
    }

    if (!asset.cdn_file_id) {
      return res.status(404).json({ status: 'error', message: 'File belum tersedia.' });
    }

    if (asset.is_private) {
      // Return signed URL (expires 15 minutes)
      try {
        const signedUrl = await cdn.createSignedUrl(asset.cdn_file_id, 900);
        return res.json({ status: 'success', url: signedUrl, expiresIn: 900 });
      } catch {
        return res.status(502).json({ status: 'error', message: 'Gagal menghasilkan link akses.' });
      }
    } else {
      // Redirect to CDN delivery URL
      const deliveryUrl = asset.cdn_delivery_url || cdn.getDeliveryUrl(asset.cdn_file_id);
      return res.redirect(cdn.resolveDeliveryUrl(deliveryUrl));
    }
  } catch (error) {
    console.error('[Assets] Access error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Gagal mengakses file.' });
  }
});

// ─── DELETE /api/assets/:id ──────────────────────────────────────────────────
router.delete('/:id', requireSession, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[asset]] = await conn.execute('SELECT * FROM cdn_assets WHERE id=? AND deleted_at IS NULL FOR UPDATE', [req.params.id]);
    if (!asset) {
      conn.release();
      return res.status(404).json({ status: 'error', message: 'Asset tidak ditemukan.' });
    }

    // Only owner or admin can delete
    if (req.user.role !== 'ADMIN' && asset.owner_id !== req.user.id) {
      conn.release();
      return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
    }

    // Mark as DELETE_PENDING
    await conn.execute("UPDATE cdn_assets SET cdn_status='DELETE_PENDING', deleted_at=NOW() WHERE id=?", [asset.id]);

    // Try to delete from CDN
    if (asset.cdn_file_id) {
      try {
        await cdn.deleteFile(asset.cdn_file_id);
        await conn.execute("UPDATE cdn_assets SET cdn_status='DELETED' WHERE id=?", [asset.id]);
      } catch (cdnErr) {
        console.warn(`[CDN] Delete failed for ${asset.cdn_file_id}, marked DELETE_PENDING:`, cdnErr.message);
        // Keep DELETE_PENDING for retry
      }
    }

    // Audit
    await conn.execute(
      "INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), 'deleteCdnAsset', ?, ?)",
      [req.user.id, JSON.stringify({ assetId: asset.id, cdnFileId: asset.cdn_file_id, featureType: asset.feature_type })]
    ).catch(() => {});

    await conn.commit();
    conn.release();

    return res.json({ status: 'success', message: 'Asset berhasil dihapus.' });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('[Assets] Delete error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus asset.' });
  }
});

export default router;
