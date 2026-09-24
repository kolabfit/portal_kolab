import express from 'express';
import db from '../lib/db.js';
import * as cdn from '../lib/kroomboxCdn.js';
import { pipeline } from 'node:stream/promises';

const router = express.Router();

// Random URLs are shareable, as repository/profile images are embedded without a bearer header.
router.get('/:id', async (req, res, next) => {
  try {
    const [[file]] = await db.execute('SELECT r.name, r.mime, r.cdn_asset_id, r.storage_provider FROM repo r WHERE r.id=?', [req.params.id]);
    
    if (!file) {
      return res.status(404).json({ status: 'error', message: 'File tidak ditemukan.' });
    }

    // If file has been migrated or originally uploaded to CDN
    if (file.storage_provider === 'KROOMBOX_CDN' && file.cdn_asset_id) {
      try {
        const [[asset]] = await db.execute('SELECT is_private, cdn_delivery_url, cdn_status, (created_at > NOW() - INTERVAL 5 MINUTE) AS is_recent FROM cdn_assets WHERE cdn_file_id=? AND deleted_at IS NULL LIMIT 1', [file.cdn_asset_id]);
        
        if (!asset) {
          return res.status(404).json({ status: 'error', message: 'File CDN tidak ditemukan.' });
        }

        const deliveryUrl = asset.is_private
          ? await cdn.createSignedUrl(file.cdn_asset_id, 900)
          : cdn.resolveDeliveryUrl(asset.cdn_delivery_url || cdn.getDeliveryUrl(file.cdn_asset_id));
        if (/^image\/(png|jpeg|gif|webp|avif|bmp|x-icon)$/.test(file.mime)) {
          // Include recent READY rows created by the former upload handler,
          // which marked files ready before CDN processing had completed.
          const image = await cdn.openImageStream(deliveryUrl, { processing: Boolean(asset.is_recent) });
          if (asset.cdn_status !== 'READY') {
            await db.execute("UPDATE cdn_assets SET cdn_status='READY' WHERE cdn_file_id=? AND deleted_at IS NULL", [file.cdn_asset_id])
              .catch(() => console.warn('[CDN] Could not persist image readiness'));
          }
          res.set('Content-Type', image.mime);
          res.set('X-Content-Type-Options', 'nosniff');
          res.set('Cache-Control', 'private, no-store');
          res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
          await pipeline(image.stream, res);
          return;
        }
        return res.redirect(deliveryUrl);
      } catch (err) {
        console.warn(`[Legacy Files] Failed to access CDN file ${file.cdn_asset_id}:`, err.code || 'CDN_DELIVERY_FAILED', 'upstreamStatus=', err.response?.status || err.upstreamStatus || 'unknown');
        if (res.headersSent || res.destroyed) return;
        res.set('Cache-Control', 'no-store');
        if (err.code === 'CDN_PROCESSING') {
          res.set('Retry-After', '5');
          return res.status(503).json({ status: 'processing', message: 'Foto masih diproses CDN. Preview akan mencoba kembali.' });
        }
        return res.status(502).json({ status: 'error', message: 'Gambar atau file CDN belum dapat dimuat. Silakan coba kembali.' });
      }
    }

    // Fallback to legacy database storage
    const [[blob]] = await db.execute('SELECT content FROM file_blobs WHERE repo_id=?', [req.params.id]);
    if (!blob) {
      return res.status(404).json({ status: 'error', message: 'Konten file tidak ditemukan.' });
    }

    const inline = /^(image\/(png|jpeg|gif|webp)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf)$/.test(file.mime);
    res.set('Content-Type', file.mime || 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.send(blob.content);
  } catch (error) { next(error); }
});

export default router;
