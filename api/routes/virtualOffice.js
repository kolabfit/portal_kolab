import { Router } from 'express';
import { fileURLToPath } from 'node:url';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';

const router = Router();
const mapFile = fileURLToPath(new URL('../assets/virtual-office-map.png', import.meta.url));
// Floor extents in the approved room models, in local X/Z coordinates.
const floorAreas = {
  ngolab: [[-3.65, 3.65, -2.35, 2.35]],
  coworking: [[-5.90, 5.90, -3.05, 3.05]],
  redbox: [[-2.775, 2.775, -2.125, 2.125]],
  jago: [[-2.70, 2.70, -3.625, 3.625]],
  studio: [[-2.125, 2.125, -2.825, 2.825]],
  kroombox: [[-4.25, 4.25, -3.20, 6.00], [-6.09, -4.25, -3.20, -1.16]]
};

function parsePeople(input, areas) {
  if (!Array.isArray(input) || input.length > 40) return null;
  const ids = new Set();
  const people = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const { id, name, title, point } = entry;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(id) || ids.has(id)) return null;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) return null;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) return null;
    const { x, z } = point ?? {};
    if (!Number.isFinite(x) || !Number.isFinite(z) || !areas.some(([left, right, back, front]) =>
      x >= left && x <= right && z >= back && z <= front
    )) return null;
    ids.add(id);
    people.push({ id, name: name.trim(), title: title.trim(), point: { x, z } });
  }
  return people;
}

function parseOverrides(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const overrides = {};
  for (const [id, values] of Object.entries(input)) {
    if (!Object.hasOwn(floorAreas, id) || !values || typeof values !== 'object' || Array.isArray(values)) return null;
    if (Object.keys(values).some(key => key !== 'name' && key !== 'description' && key !== 'people')) return null;
    const { name = '', description = '' } = values;
    if (typeof name !== 'string' || typeof description !== 'string') return null;
    if (name.trim().length > 100 || description.trim().length > 600) return null;
    const people = parsePeople(values.people ?? [], floorAreas[id]);
    if (!people) return null;
    if (name.trim() || description.trim() || people.length) {
      overrides[id] = { name: name.trim(), description: description.trim(), ...(people.length ? { people } : {}) };
    }
  }
  return overrides;
}

router.use(requireSession, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', async (req, res) => {
  const [[row]] = await db.execute('SELECT is_published, room_overrides, version FROM virtual_office_settings WHERE id=1');
  if (!row) return res.status(503).json({ message: 'Pengaturan Virtual Office belum tersedia.' });

  const published = Boolean(row.is_published);
  if (!published && req.user.role !== 'ADMIN') return res.json({ published });

  res.json({
    published,
    rooms: row.room_overrides,
    ...(req.user.role === 'ADMIN' ? { version: row.version } : {})
  });
});

router.get('/map', async (req, res) => {
  const [[row]] = await db.execute('SELECT is_published FROM virtual_office_settings WHERE id=1');
  if (!row) return res.status(503).json({ message: 'Pengaturan Virtual Office belum tersedia.' });
  if (!row.is_published && req.user.role !== 'ADMIN') {
    return res.status(404).json({ message: 'Virtual Office belum ditayangkan.' });
  }

  res.sendFile(mapFile, { cacheControl: false, lastModified: false });
});

router.put('/', async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Akses admin diperlukan.' });

  const { published, rooms, version } = req.body ?? {};
  const overrides = parseOverrides(rooms);
  if (typeof published !== 'boolean' || !overrides || !Number.isInteger(version) || version < 1 || version >= 4294967295) {
    return res.status(400).json({ message: 'Pengaturan Virtual Office tidak valid.' });
  }

  const [result] = await db.execute(
    'UPDATE virtual_office_settings SET is_published=?, room_overrides=?, version=version+1 WHERE id=1 AND version=?',
    [published, JSON.stringify(overrides), version]
  );
  if (!result.affectedRows) {
    return res.status(409).json({ message: 'Pengaturan sudah berubah. Muat ulang halaman sebelum menyimpan lagi.' });
  }
  res.json({ published, rooms: overrides, version: version + 1 });
});

export default router;
