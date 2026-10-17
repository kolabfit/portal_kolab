/**
 * Letter Data Resolver
 *
 * Mengambil data yang dibutuhkan dari database
 * berdasarkan resolver keys yang didefinisikan di letterRegistry.
 *
 * Setiap resolver mengembalikan objek data yang sudah divalidasi
 * sebelum diserahkan ke renderer.
 */

import db from './db.js';
import sanitizeHtml from 'sanitize-html';

/** Sanitasi string sederhana untuk mencegah injeksi teks di PDF */
const clean = (str) => {
  if (str == null) return '';
  return String(str).replace(/[<>&"]/g, ' ').trim();
};

/**
 * Format tanggal ke format Indonesia: "07 Juli 2026"
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDateID(dateStr) {
  if (!dateStr) return '';
  const months = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(dateStr);
  if (isNaN(d)) return String(dateStr);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Resolver: single student by NIM
 */
async function resolveStudent(nim) {
  const [rows] = await db.execute(
    'SELECT nim, name FROM students WHERE nim = ?',
    [nim]
  );
  if (!rows.length) throw new Error(`Mahasiswa dengan NIM ${nim} tidak ditemukan.`);
  return { nim: rows[0].nim, name: clean(rows[0].name) };
}

/**
 * Resolver: group internship untuk satu startup
 * Mengembalikan data internship beserta daftar mahasiswa
 */
async function resolveInternshipGroup(startupId) {
  // Validasi startup
  const [stRows] = await db.execute(
    'SELECT id, name FROM startup_teams WHERE id = ?',
    [startupId]
  );
  if (!stRows.length) throw new Error(`Startup dengan ID ${startupId} tidak ditemukan.`);
  const startup = stRows[0];

  // Ambil internship ONGOING/PLANNED untuk startup ini
  const [internships] = await db.execute(`
    SELECT i.id, i.student_nim, i.start_date, i.end_date, i.status,
           i.field_supervisor, i.academic_supervisor_nip,
           s.name AS student_name,
           l.name AS academic_supervisor_name
    FROM internships i
    JOIN students s ON i.student_nim = s.nim
    LEFT JOIN lecturers l ON i.academic_supervisor_nip = l.nip
    WHERE i.startup_id = ?
      AND i.status IN ('ONGOING', 'PLANNED')
    ORDER BY s.name
  `, [startupId]);

  if (!internships.length) {
    throw new Error(`Tidak ada mahasiswa magang aktif untuk startup ${startup.name}.`);
  }

  // Semua internship dalam satu startup biasanya memiliki tanggal yang sama
  const first = internships[0];

  return {
    startup_id: startup.id,
    startup_name: clean(startup.name),
    start_date: first.start_date,
    end_date: first.end_date,
    start_date_id: formatDateID(first.start_date),
    end_date_id: formatDateID(first.end_date),
    field_supervisor: clean(first.field_supervisor || ''),
    academic_supervisor_name: clean(first.academic_supervisor_name || ''),
    students: internships.map((i, idx) => ({
      no: idx + 1,
      nim: i.student_nim,
      name: clean(i.student_name),
    })),
  };
}

/**
 * Resolver: anggota startup (untuk surat pengantar, rekognisi)
 */
async function resolveStartupMembers(startupId) {
  const [stRows] = await db.execute(
    'SELECT id, name FROM startup_teams WHERE id = ?',
    [startupId]
  );
  if (!stRows.length) throw new Error(`Startup tidak ditemukan.`);
  const startup = stRows[0];

  const [members] = await db.execute(`
    SELECT nim, name, startup_position AS posisi
    FROM students
    WHERE startup_id = ? AND is_active = TRUE
    ORDER BY name
  `, [startupId]);

  return {
    startup_id: startup.id,
    startup_name: clean(startup.name),
    members: members.map((m, idx) => ({
      no: idx + 1,
      nim: m.nim,
      name: clean(m.name),
      posisi: clean(m.posisi || 'MEMBER'),
    })),
  };
}

/**
 * Resolver: event by ID
 */
async function resolveEvent(eventId) {
  const [rows] = await db.execute(
    'SELECT id, title, date, time, location_offline, location_online, description FROM events WHERE id = ?',
    [eventId]
  );
  if (!rows.length) throw new Error(`Event dengan ID ${eventId} tidak ditemukan.`);
  const e = rows[0];
  return {
    event_id: e.id,
    title: clean(e.title),
    date: e.date,
    date_id: formatDateID(e.date),
    time: e.time || '',
    location: clean(e.location_offline || e.location_online || ''),
    description: clean(e.description || ''),
  };
}

/**
 * Resolver: signatory (dosen penandatangan)
 */
async function resolveSignatory(nip) {
  if (nip) {
    const [rows] = await db.execute('SELECT nip, name FROM lecturers WHERE nip = ?', [nip]);
    if (rows.length) {
      return {
        name: clean(rows[0].name),
        nip: rows[0].nip,
        jabatan: 'Ketua Research Alliance Ko+Lab Telkom University',
        jabatanSingkat: 'Ketua RA Ko+Lab Fakultas Ilmu Terapan'
      };
    }
  }
  return null;
}

/**
 * Main resolve function — dipanggil oleh route handler
 * @param {string[]} resolvers  - resolver keys dari registry
 * @param {object}  params     - parameter dari request (startup_id, student_nim, dll.)
 * @returns {Promise<object>}  - data gabungan
 */
export async function resolveData(resolvers, params) {
  let data = {};

  // Selalu cek apakah ada penandatangan_nip
  if (params.penandatangan_nip) {
    const sig = await resolveSignatory(params.penandatangan_nip);
    if (sig) data.signatory = sig;
  }

  for (const resolver of resolvers) {
    switch (resolver) {
      case 'student':
        if (!params.student_nim) throw new Error('student_nim diperlukan.');
        data = { ...data, student: await resolveStudent(params.student_nim) };
        break;

      case 'student_cert': {
        if (!params.student_nim) throw new Error('student_nim diperlukan.');
        const [rows] = await db.execute(
          'SELECT s.nim, s.name, s.startup_id, st.name AS startup_name FROM students s LEFT JOIN startup_teams st ON s.startup_id = st.id WHERE s.nim = ?',
          [params.student_nim]
        );
        if (!rows.length) throw new Error(`Mahasiswa dengan NIM ${params.student_nim} tidak ditemukan.`);
        const stRow = rows[0];
        data.student = { nim: stRow.nim, name: clean(stRow.name) };
        data.startup_name = clean(stRow.startup_name || params.startup_name || 'Ko+Lab');
        break;
      }

      case 'internship_group':
        if (!params.startup_id) throw new Error('startup_id diperlukan untuk surat keterangan.');
        data = { ...data, ...(await resolveInternshipGroup(params.startup_id)) };
        break;

      case 'startup_members':
        if (!params.startup_id) throw new Error('startup_id diperlukan.');
        data = { ...data, ...(await resolveStartupMembers(params.startup_id)) };
        break;

      case 'startup_members_optional':
        if (params.startup_id) {
          data = { ...data, ...(await resolveStartupMembers(params.startup_id)) };
        }
        break;

      case 'event':
        if (!params.event_id) throw new Error('event_id diperlukan.');
        data = { ...data, event: await resolveEvent(params.event_id) };
        break;

      case 'event_optional':
        if (params.event_id) {
          try {
            data = { ...data, event: await resolveEvent(params.event_id) };
          } catch (e) {
            // Ignore if manual details provided
          }
        }
        break;

      case 'students_manual': {
        // Mendukung array of strings (NIMs) atau array of objects ({nim, name, kelas, prodi})
        let nims = [];
        let manualOverrides = {};

        if (Array.isArray(params.students) && params.students.length > 0) {
          params.students.forEach((s) => {
            if (s.nim) {
              nims.push(s.nim);
              manualOverrides[s.nim] = s;
            }
          });
        } else if (Array.isArray(params.student_nims) && params.student_nims.length > 0) {
          nims = params.student_nims;
        } else if (typeof params.student_nims === 'string' && params.student_nims.trim()) {
          nims = params.student_nims.split(',').map((x) => x.trim()).filter(Boolean);
        }

        if (nims.length > 0) {
          const nimList = nims.slice(0, 50);
          const placeholders = nimList.map(() => '?').join(',');
          const [studs] = await db.execute(
            `SELECT nim, name FROM students WHERE nim IN (${placeholders}) ORDER BY name`,
            nimList
          );
          data.students = studs.map((s, i) => {
            const over = manualOverrides[s.nim] || {};
            return {
              no: i + 1,
              nim: s.nim,
              name: over.name || clean(s.name),
              kelas: over.kelas || params.kelas || 'D3SI-48-01',
              prodi: over.prodi || params.prodi || 'D3 Sistem Informasi',
            };
          });
        } else if (Array.isArray(params.students)) {
          data.students = params.students.map((s, i) => ({
            no: i + 1,
            nim: s.nim || '-',
            name: clean(s.name || '-'),
            kelas: s.kelas || params.kelas || 'D3SI-48-01',
            prodi: s.prodi || params.prodi || 'D3 Sistem Informasi',
          }));
        }
        break;
      }

      default:
        throw new Error(`Resolver tidak dikenal: ${resolver}`);
    }
  }

  return data;
}
