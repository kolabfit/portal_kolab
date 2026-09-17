import express from 'express';
import db from '../lib/db.js';
const router = express.Router();
// Random URLs are shareable, as repository/profile images are embedded without a bearer header.
router.get('/:id', async (req, res, next) => {
  try {
    const [[file]] = await db.execute('SELECT r.name,r.mime,b.content FROM repo r JOIN file_blobs b ON b.repo_id=r.id WHERE r.id=?', [req.params.id]);
    if (!file) return res.status(404).json({ status: 'error', message: 'File tidak ditemukan.' });
    const inline = /^(image\/(png|jpeg|gif|webp)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf)$/.test(file.mime);
    res.set('Content-Type', file.mime || 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.send(file.content);
  } catch (error) { next(error); }
});
export default router;
