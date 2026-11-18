import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';

const router = Router();
const conditions = ['GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE'];
const statuses = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'];
const assetColumns = 'id, code, name, category, room_id AS roomId, `condition`, status, custodian, notes, version';

function problem(status, message) {
  return Object.assign(new Error(message), { status });
}

function field(body, key, label, maxLength, required = true) {
  const value = body?.[key] ?? '';
  if (typeof value !== 'string' || value.trim().length > maxLength || (required && !value.trim())) {
    throw problem(400, `${label} harus ${required ? 'diisi dan ' : ''}maksimal ${maxLength} karakter.`);
  }
  return value.trim() || null;
}

function code(body, label) {
  const value = field(body, 'code', label, 40).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._/-]*$/.test(value) || value.length > 40) {
    throw problem(400, `${label} hanya boleh berisi huruf A–Z, angka, titik, garis bawah, garis miring, atau tanda hubung, diawali huruf atau angka.`);
  }
  return value;
}

function roomFields(body) {
  return [
    code(body, 'Kode ruang'),
    field(body, 'name', 'Nama ruang', 120),
    field(body, 'floor', 'Lantai atau area', 60, false),
    field(body, 'notes', 'Catatan', 500, false)
  ];
}

function assetFields(body) {
  const condition = field(body, 'condition', 'Kondisi', 20);
  const status = field(body, 'status', 'Status', 20);
  if (!conditions.includes(condition)) throw problem(400, 'Kondisi aset tidak valid.');
  if (!statuses.includes(status)) throw problem(400, 'Status aset tidak valid.');
  return {
    code: code(body, 'Kode aset'),
    name: field(body, 'name', 'Nama aset', 120),
    category: field(body, 'category', 'Kategori', 80),
    roomId: field(body, 'roomId', 'Ruang', 36),
    condition,
    status,
    custodian: field(body, 'custodian', 'Penanggung jawab', 120, false),
    notes: field(body, 'notes', 'Catatan', 500, false)
  };
}

function snapshot(asset, room) {
  return {
    roomId: room.id, roomCode: room.code, roomName: room.name,
    condition: asset.condition, status: asset.status
  };
}

router.use(requireSession, (req, res, next) => {
  if (req.user.role !== 'ADMIN') return next(problem(403, 'Akses admin diperlukan.'));
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.query('START TRANSACTION READ ONLY, WITH CONSISTENT SNAPSHOT');
    const [rooms] = await conn.query('SELECT id, code, name, floor, notes FROM facility_rooms ORDER BY name, code');
    const [assets] = await conn.query(`SELECT ${assetColumns} FROM facility_assets ORDER BY name, code`);
    await conn.commit();
    res.json({ rooms, assets });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
});

router.post('/rooms', async (req, res) => {
  const id = randomUUID();
  await db.execute('INSERT INTO facility_rooms (id, code, name, floor, notes) VALUES (?, ?, ?, ?, ?)', [id, ...roomFields(req.body)]);
  res.status(201).json({ id });
});

router.put('/rooms/:id', async (req, res) => {
  const [result] = await db.execute(
    'UPDATE facility_rooms SET code=?, name=?, floor=?, notes=? WHERE id=?',
    [...roomFields(req.body), req.params.id]
  );
  if (!result.affectedRows) throw problem(404, 'Ruang tidak ditemukan.');
  res.json({ id: req.params.id });
});

router.delete('/rooms/:id', async (req, res) => {
  const [result] = await db.execute('DELETE FROM facility_rooms WHERE id=?', [req.params.id]);
  if (!result.affectedRows) throw problem(404, 'Ruang tidak ditemukan.');
  res.json({ id: req.params.id });
});

router.get('/assets/:id/history', async (req, res) => {
  const [assets] = await db.execute('SELECT id FROM facility_assets WHERE id=?', [req.params.id]);
  if (!assets.length) throw problem(404, 'Aset tidak ditemukan.');
  const [history] = await db.execute(
    `SELECT CAST(id AS CHAR) AS id, previous_state AS previousState, current_state AS currentState,
            changed_by AS changedBy, UNIX_TIMESTAMP(changed_at) * 1000 AS changedAt
     FROM facility_asset_history WHERE asset_id=? ORDER BY id DESC`,
    [req.params.id]
  );
  res.json(history);
});

async function saveAsset(req, res) {
  const asset = assetFields(req.body);
  const editing = req.method === 'PUT';
  const id = editing ? req.params.id : randomUUID();
  if (editing && (!Number.isSafeInteger(req.body.version) || req.body.version < 1)) {
    throw problem(400, 'Versi aset tidak valid. Muat ulang daftar aset.');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let previous;
    if (editing) {
      const [[current]] = await conn.execute(`SELECT ${assetColumns} FROM facility_assets WHERE id=? FOR UPDATE`, [id]);
      if (!current) throw problem(404, 'Aset tidak ditemukan.');
      if (current.version !== req.body.version) {
        throw problem(409, 'Aset sudah diubah. Tutup formulir dan muat ulang daftar sebelum mengedit lagi.');
      }
      previous = current;
    }

    const roomIds = [...new Set([asset.roomId, previous?.roomId].filter(Boolean))];
    const [rooms] = await conn.execute(
      `SELECT id, code, name FROM facility_rooms WHERE id IN (${roomIds.map(() => '?').join(', ')}) ORDER BY id FOR SHARE`,
      roomIds
    );
    const room = rooms.find(row => row.id === asset.roomId);
    if (!room) throw problem(400, 'Ruang yang dipilih tidak ditemukan.');

    const values = [asset.code, asset.name, asset.category, room.id, asset.condition, asset.status, asset.custodian, asset.notes];
    if (previous) {
      await conn.execute(
        `UPDATE facility_assets SET code=?, name=?, category=?, room_id=?, \`condition\`=?, status=?,
          custodian=?, notes=?, version=version+1 WHERE id=?`,
        [...values, id]
      );
    } else {
      await conn.execute(
        'INSERT INTO facility_assets (id, code, name, category, room_id, `condition`, status, custodian, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, ...values]
      );
    }

    if (!previous || previous.roomId !== room.id || previous.condition !== asset.condition || previous.status !== asset.status) {
      const before = previous ? snapshot(previous, rooms.find(row => row.id === previous.roomId)) : null;
      await conn.execute(
        'INSERT INTO facility_asset_history (asset_id, previous_state, current_state, changed_by) VALUES (?, ?, ?, ?)',
        [id, before ? JSON.stringify(before) : null, JSON.stringify(snapshot(asset, room)), req.user.username]
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
  res.status(editing ? 200 : 201).json({ id });
}

router.post('/assets', saveAsset);
router.put('/assets/:id', saveAsset);

router.use((error, req, res, next) => {
  if (error.code === 'ER_DUP_ENTRY') {
    const label = req.path.startsWith('/rooms') ? 'ruang' : 'aset';
    return next(problem(409, `Kode ${label} sudah digunakan.`));
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return next(problem(409, 'Pindahkan semua aset dari ruang ini sebelum menghapusnya.'));
  }
  next(error);
});

export default router;
