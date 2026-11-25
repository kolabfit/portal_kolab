import { Router } from 'express';
import { fileURLToPath } from 'node:url';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';
import { activeMembers, memberKey } from '../lib/virtualOffice.js';
import { floorAreas } from '../lib/virtualOfficeFloors.js';

const router = Router();
const mapFile = fileURLToPath(new URL('../assets/virtual-office-map.png', import.meta.url));
const generic = 'Pengaturan Virtual Office tidak valid.';

function invalid(message = generic) {
  throw Object.assign(new Error(message), { invalid: true });
}

function parsePeople(input, areas, members, placed) {
  if (!Array.isArray(input) || input.length > 40) invalid();
  const ids = new Set();
  return input.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) invalid();
    const { id, name, title, point, member } = entry;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(id) || ids.has(id)) invalid();
    ids.add(id);
    if (typeof title !== 'string' || title.trim().length > 120) invalid();

    let person;
    if (member !== undefined) {
      if (!member || !['STUDENT', 'LECTURER'].includes(member.role) || typeof member.id !== 'string') invalid();
      const found = members.get(memberKey(member));
      if (!found) invalid(`Anggota ${typeof name === 'string' && name.trim() ? name.trim() : member.id} tidak aktif atau tidak ditemukan. Hapus penandanya lalu simpan lagi.`);
      if (placed.has(memberKey(found))) invalid(`${found.name} sudah punya posisi di denah.`);
      placed.add(memberKey(found));
      // Name is a snapshot for admins if the member later leaves; title '' means use the profile title.
      person = { id, member: { role: found.role, id: found.id }, name: found.name, title: title.trim() };
    } else {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || !title.trim()) {
        invalid('Lengkapi nama dan jabatan untuk setiap penanda.');
      }
      person = { id, name: name.trim(), title: title.trim() };
    }

    const { x, z } = point ?? {};
    if (!Number.isFinite(x) || !Number.isFinite(z) || !areas.some(([left, right, back, front]) =>
      x >= left && x <= right && z >= back && z <= front
    )) invalid(`Posisi ${person.name} berada di luar lantai ruang.`);
    return { ...person, point: { x, z } };
  });
}

function parseOverrides(input, members) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid();
  const overrides = {};
  const placed = new Set();
  for (const [id, values] of Object.entries(input)) {
    if (!Object.hasOwn(floorAreas, id) || !values || typeof values !== 'object' || Array.isArray(values)) invalid();
    if (Object.keys(values).some(key => key !== 'name' && key !== 'description' && key !== 'people')) invalid();
    const { name = '', description = '' } = values;
    if (typeof name !== 'string' || typeof description !== 'string') invalid();
    if (name.trim().length > 100 || description.trim().length > 600) invalid();
    const people = parsePeople(values.people ?? [], floorAreas[id], members, placed);
    if (name.trim() || description.trim() || people.length) {
      overrides[id] = { name: name.trim(), description: description.trim(), ...(people.length ? { people } : {}) };
    }
  }
  return overrides;
}

// Fill member names and titles from current profiles. Members never expose their NIM/NIP to non-admins.
function present(rooms, members, admin) {
  return Object.fromEntries(Object.entries(rooms).map(([id, room]) => {
    if (!room.people) return [id, room];
    const people = room.people.flatMap(person => {
      if (!person.member) return [person];
      const found = members.get(memberKey(person.member));
      if (admin) return [{ ...person, name: found?.name ?? person.name, defaultTitle: found?.title ?? '', ...(found ? {} : { inactive: true }) }];
      if (!found) return [];
      return [{ id: person.id, name: found.name, title: person.title || found.title, point: person.point }];
    });
    return [id, { ...room, people }];
  }));
}

const hasMembers = rooms => Object.values(rooms).some(room => room.people?.some(person => person.member));

// Public (login/register page): room names, descriptions and anonymous figure positions only. No names or titles.
router.get('/public', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const [[row]] = await db.execute('SELECT is_published, room_overrides FROM virtual_office_settings WHERE id=1');
  if (!row?.is_published) return res.json({ published: false });
  const rooms = row.room_overrides;
  const shown = hasMembers(rooms) ? present(rooms, await activeMembers(db), false) : rooms;
  res.json({
    published: true,
    rooms: Object.fromEntries(Object.entries(shown).map(([id, room]) => [id, {
      name: room.name, description: room.description,
      ...(room.people ? { people: room.people.map(({ id, point }) => ({ id, name: '', title: '', point })) } : {})
    }]))
  });
});

router.get('/public/map', async (req, res) => {
  const [[row]] = await db.execute('SELECT is_published FROM virtual_office_settings WHERE id=1');
  if (!row?.is_published) return res.status(404).json({ message: 'Virtual Office belum ditayangkan.' });
  res.sendFile(mapFile, { cacheControl: false, lastModified: false });
});

router.use(requireSession, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', async (req, res) => {
  const [[row]] = await db.execute('SELECT is_published, room_overrides, version FROM virtual_office_settings WHERE id=1');
  if (!row) return res.status(503).json({ message: 'Pengaturan Virtual Office belum tersedia.' });

  const published = Boolean(row.is_published);
  const admin = req.user.role === 'ADMIN';
  if (!published && !admin) return res.json({ published });

  const rooms = row.room_overrides;
  res.json({
    published,
    rooms: hasMembers(rooms) ? present(rooms, await activeMembers(db), admin) : rooms,
    ...(admin ? { version: row.version } : {})
  });
});

router.get('/members', async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Akses admin diperlukan.' });
  const members = [...(await activeMembers(db)).values()];
  res.json(members.sort((a, b) => a.name.localeCompare(b.name, 'id')));
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
  if (typeof published !== 'boolean' || !Number.isInteger(version) || version < 1 || version >= 4294967295) {
    return res.status(400).json({ message: generic });
  }
  const members = await activeMembers(db);
  let overrides;
  try {
    overrides = parseOverrides(rooms, members);
  } catch (error) {
    if (!error.invalid) throw error;
    return res.status(400).json({ message: error.message });
  }

  const [result] = await db.execute(
    'UPDATE virtual_office_settings SET is_published=?, room_overrides=?, version=version+1 WHERE id=1 AND version=?',
    [published, JSON.stringify(overrides), version]
  );
  if (!result.affectedRows) {
    return res.status(409).json({ message: 'Pengaturan sudah berubah. Muat ulang halaman sebelum menyimpan lagi.' });
  }
  res.json({ published, rooms: present(overrides, members, true), version: version + 1 });
});

export default router;
