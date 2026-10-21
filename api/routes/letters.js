/**
 * Letters API Route
 *
 * POST /api/letters/:type/preview   — Stream PDF inline ke browser
 * POST /api/letters/:type/download  — Kirim PDF sebagai attachment download
 * GET  /api/letters/types           — Daftar jenis surat + status implementasi
 *
 * Authorization:
 *   LECTURER & ADMIN : akses penuh (types, meta, generate, download)
 *   STUDENT          : 403 Forbidden (tidak boleh mengakses surat administrasi)
 *   Unauthenticated  : 401 Unauthorized
 */

import express from 'express';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';
import { generateLetter } from '../lib/letterService.js';
import { LETTER_REGISTRY } from '../lib/letterRegistry.js';

const router = express.Router();

// Semua route butuh session
router.use(requireSession);

// Mahasiswa (STUDENT) dilarang mengakses seluruh fitur surat administrasi
router.use((req, res, next) => {
  if (!['LECTURER', 'ADMIN'].includes(req.user?.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Akses ditolak. Mahasiswa tidak diizinkan mengakses surat administrasi.',
    });
  }
  next();
});

// ─── GET /api/letters/types ─────────────────────────────────────────────────

router.get('/types', (req, res) => {
  const implemented = Object.keys(LETTER_REGISTRY);
  const types = Object.values(LETTER_REGISTRY).map((def) => ({
    id: def.id,
    label: def.label,
    format: def.format,
    implemented: implemented.includes(def.id),
    required: def.required,
    manual: def.manual,
  }));
  res.json({ status: 'success', data: types });
});

// ─── GET /api/letters/meta — Metadata untuk dropdown formulir ───────────────

router.get('/meta', async (req, res, next) => {
  try {
    const [lecturers] = await db.query(
      'SELECT nip, name, code FROM lecturers WHERE is_active = 1 ORDER BY name ASC'
    );
    const [students] = await db.query(
      'SELECT nim, name, startup_id FROM students WHERE is_active = 1 ORDER BY name ASC'
    );
    const [events] = await db.query(
      'SELECT id, title, date, time, location_offline FROM events ORDER BY date DESC LIMIT 25'
    );
    const [startups] = await db.query(
      'SELECT id, name FROM startup_teams ORDER BY name ASC'
    );

    res.json({
      status: 'success',
      data: {
        lecturers,
        students,
        events,
        startups
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Authorization middleware untuk generate ─────────────────────────────────

function requireGeneratorAccess(req, res, next) {
  if (!['LECTURER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Akses ditolak. Hanya Dosen dan Admin yang dapat membuat surat.',
    });
  }
  next();
}

// ─── Shared handler untuk preview & download ─────────────────────────────────

async function handleGenerate(req, res, mode) {
  const { type } = req.params;

  try {
    const { buffer, filename, contentType } = await generateLetter(type, req.body, req.user);

    // Validasi bahwa buffer adalah PDF valid (minimal 4 byte magic)
    if (!buffer || buffer.length < 100) {
      return res.status(500).json({ status: 'error', message: 'Dokumen yang dihasilkan tidak valid.' });
    }

    res.set('Content-Type', contentType);
    res.set('Content-Length', buffer.length);

    if (mode === 'download') {
      // Sanitasi filename untuk Content-Disposition
      const safeFilename = encodeURIComponent(filename);
      res.set('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    } else {
      // Preview inline
      res.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    }

    return res.send(buffer);

  } catch (err) {
    const status = err.status || 500;
    const message = status < 500
      ? err.message
      : 'Terjadi kesalahan saat memproses surat. Silakan coba lagi.';

    // Log full error untuk debugging (tidak dikirim ke client)
    console.error(`[Letters] ${type} ${mode} error:`, err.message);
    if (status >= 500) console.error(err.stack);

    return res.status(status).json({ status: 'error', message });
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post('/:type/preview', requireGeneratorAccess, (req, res) =>
  handleGenerate(req, res, 'preview')
);

router.post('/:type/download', requireGeneratorAccess, (req, res) =>
  handleGenerate(req, res, 'download')
);

export default router;
