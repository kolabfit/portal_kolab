/**
 * Mitra Ko+Lab — Backend API Route
 *
 * Authorization:
 *   LECTURER  → GET list, GET detail, POST create, PUT update, DELETE delete
 *   STUDENT   → GET list, GET detail  (read-only)
 *   ADMIN     → GET list, GET detail  (read-only, consistent with portal policy)
 *   Unauthenticated → 401 (enforced by requireSession)
 *
 * Mutation endpoints (POST / PUT / DELETE) reject non-LECTURER with 403.
 */

import express from 'express';
import db from '../lib/db.js';
import crypto from 'node:crypto';
import { requireSession } from '../lib/session.js';

const router = express.Router();

// All mitra routes require a valid session
router.use(requireSession);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseJson = (value) => {
  try { return value ? JSON.parse(value) : []; } catch { return []; }
};

/** Map a DB row to a clean API object */
const mapMitra = (row) => ({
  id: row.id,
  name: row.name,
  address: row.address || '',
  phone: row.phone || '',
  description: row.description || '',
  headName: row.head_name || '',
  logo: row.logo || '',
  website: row.website || '',
  members: parseJson(row.members),
  apps: parseJson(row.apps),
  createdBy: row.created_by || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Middleware: only LECTURER or ADMIN may mutate mitra data */
const requireLecturer = (req, res, next) => {
  if (req.user.role !== 'LECTURER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ status: 'error', message: 'Akses dosen atau admin diperlukan untuk operasi ini.' });
  }
  return next();
};

/** Validate URL format (empty/null allowed) */
const isValidUrl = (value) => {
  if (!value) return true;
  try { new URL(value.startsWith('http') ? value : `https://${value}`); return true; } catch { return false; }
};

/** Validate phone: digits, spaces, dashes, plus; 6–20 chars (if provided) */
const isValidPhone = (value) => {
  if (!value) return true;
  return /^[+\d][\d\s\-().]{4,19}$/.test(value.trim());
};

// ─── GET /api/mitra — List all mitra ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    let rows;
    if (search) {
      [rows] = await db.execute(
        'SELECT * FROM mitras WHERE name LIKE ? ORDER BY name ASC',
        [`%${search}%`]
      );
    } else {
      [rows] = await db.execute('SELECT * FROM mitras ORDER BY name ASC');
    }
    res.set('Cache-Control', 'no-store').json(rows.map(mapMitra));
  } catch (error) { next(error); }
});

// ─── GET /api/mitra/:id — Detail mitra ───────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await db.execute('SELECT * FROM mitras WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ status: 'error', message: 'Mitra tidak ditemukan.' });
    res.set('Cache-Control', 'no-store').json(mapMitra(row));
  } catch (error) { next(error); }
});

// ─── POST /api/mitra — Create (LECTURER only) ────────────────────────────────
router.post('/', requireLecturer, async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { name, address, phone, description, headName, logo, website, members, apps } = req.body;

    // Validation
    if (!name || !String(name).trim()) {
      return res.status(400).json({ status: 'error', message: 'Nama mitra wajib diisi.' });
    }
    if (String(name).trim().length > 100) {
      return res.status(400).json({ status: 'error', message: 'Nama mitra maksimal 100 karakter.' });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ status: 'error', message: 'Format nomor HP tidak valid.' });
    }
    if (website && !isValidUrl(website)) {
      return res.status(400).json({ status: 'error', message: 'Format website tidak valid.' });
    }
    if (Array.isArray(apps)) {
      for (const app of apps) {
        if (app.url && !isValidUrl(app.url)) {
          return res.status(400).json({ status: 'error', message: `URL Apps "${app.name || ''}" tidak valid.` });
        }
      }
    }

    const id = `mitra-${crypto.randomUUID()}`;
    const membersJson = JSON.stringify(Array.isArray(members) ? members : []);
    const appsJson = JSON.stringify(Array.isArray(apps) ? apps : []);

    await conn.execute(
      `INSERT INTO mitras (id, name, address, phone, description, head_name, logo, website, members, apps, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, String(name).trim(), address || '', phone || '', description || '',
       headName || '', logo || '', website || '', membersJson, appsJson, req.user.id]
    );

    // Audit log (same pattern as bridge.js)
    await conn.execute(
      'INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), ?, ?, ?)',
      ['manageMitra', req.user.id, JSON.stringify({ id, type: 'add' })]
    );

    await conn.commit();
    res.json({ status: 'success', id });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally { conn.release(); }
});

// ─── PUT /api/mitra/:id — Update (LECTURER only) ─────────────────────────────
router.put('/:id', requireLecturer, async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const mitraId = req.params.id;
    const [[existing]] = await conn.execute('SELECT * FROM mitras WHERE id=? FOR UPDATE', [mitraId]);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Mitra tidak ditemukan.' });

    const { name, address, phone, description, headName, logo, website, members, apps } = req.body;

    // Validation
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ status: 'error', message: 'Nama mitra wajib diisi.' });
    }
    if (name && String(name).trim().length > 100) {
      return res.status(400).json({ status: 'error', message: 'Nama mitra maksimal 100 karakter.' });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ status: 'error', message: 'Format nomor HP tidak valid.' });
    }
    if (website && !isValidUrl(website)) {
      return res.status(400).json({ status: 'error', message: 'Format website tidak valid.' });
    }
    if (Array.isArray(apps)) {
      for (const app of apps) {
        if (app.url && !isValidUrl(app.url)) {
          return res.status(400).json({ status: 'error', message: `URL Apps "${app.name || ''}" tidak valid.` });
        }
      }
    }

    const newName = name !== undefined ? String(name).trim() : existing.name;
    const membersJson = members !== undefined
      ? JSON.stringify(Array.isArray(members) ? members : [])
      : existing.members;
    const appsJson = apps !== undefined
      ? JSON.stringify(Array.isArray(apps) ? apps : [])
      : existing.apps;

    await conn.execute(
      `UPDATE mitras SET name=?, address=?, phone=?, description=?, head_name=?, logo=?, website=?, members=?, apps=?, updated_at=NOW()
       WHERE id=?`,
      [newName, address ?? existing.address ?? '', phone ?? existing.phone ?? '',
       description ?? existing.description ?? '', headName ?? existing.head_name ?? '',
       logo ?? existing.logo ?? '', website ?? existing.website ?? '',
       membersJson, appsJson, mitraId]
    );

    await conn.execute(
      'INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), ?, ?, ?)',
      ['manageMitra', req.user.id, JSON.stringify({ id: mitraId, type: 'edit' })]
    );

    await conn.commit();
    res.json({ status: 'success', id: mitraId });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally { conn.release(); }
});

// ─── DELETE /api/mitra/:id — Delete (LECTURER only) ──────────────────────────
router.delete('/:id', requireLecturer, async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const mitraId = req.params.id;
    const [[existing]] = await conn.execute('SELECT id, name FROM mitras WHERE id=? FOR UPDATE', [mitraId]);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Mitra tidak ditemukan.' });

    await conn.execute('DELETE FROM mitras WHERE id=?', [mitraId]);

    await conn.execute(
      'INSERT INTO system_logs (timestamp, action, user_id, details) VALUES (NOW(), ?, ?, ?)',
      ['manageMitra', req.user.id, JSON.stringify({ id: mitraId, type: 'delete', name: existing.name })]
    );

    await conn.commit();
    res.json({ status: 'success', id: mitraId });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally { conn.release(); }
});

export default router;
