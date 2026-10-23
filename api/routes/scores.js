import express from 'express';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';

// Nilai magang: skor Social Credit + KPI Presensi, ditarik server-to-server dari kedua aplikasi.
// Mahasiswa: dirinya sendiri. Dosen: mahasiswa bimbingannya. Admin (pembimbing lapangan): semua.
const router = express.Router();
router.use(requireSession);

const CACHE_MS = 10 * 60 * 1000;
// ponytail: cache per proses, hilang saat restart & tidak dibagi antar instance; cukup untuk 1 server API.
const cache = new Map();

async function fetchJson(baseUrl, key, path) {
  const hit = cache.get(baseUrl + path);
  if (hit && hit.expires > Date.now()) return hit.data;
  const response = await fetch(baseUrl.replace(/\/+$/, '') + path, {
    headers: { 'X-Integration-Key': key, Accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} dari ${baseUrl}`);
  const { data } = await response.json();
  if (!Array.isArray(data)) throw new Error(`Respons ${baseUrl} bukan data integrasi`);
  cache.set(baseUrl + path, { data, expires: Date.now() + CACHE_MS });
  return data;
}

const toDate = value => String(value).slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

// Magang yang dinilai per mahasiswa: yang sedang berjalan, kalau tidak ada yang terakhir selesai.
export function pickInternships(rows) {
  const picked = new Map();
  const rank = { ONGOING: 0, COMPLETED: 1 };
  for (const row of rows) {
    if (!(row.status in rank)) continue;
    const current = picked.get(row.student_nim);
    if (!current || rank[row.status] < rank[current.status] || (rank[row.status] === rank[current.status] && toDate(row.end_date) > toDate(current.end_date))) picked.set(row.student_nim, row);
  }
  return [...picked.values()];
}

// Periode presensi per magang; magang yang sama periodenya cukup satu request.
export function presencePeriods(internships, now = today()) {
  const periods = new Map();
  for (const row of internships) {
    const from = toDate(row.start_date);
    const to = toDate(row.end_date) < now ? toDate(row.end_date) : now;
    if (from > to) continue;
    const key = `${from}|${to}`;
    if (!periods.has(key)) periods.set(key, { from, to, nims: [] });
    periods.get(key).nims.push(row.student_nim);
  }
  return [...periods.values()];
}

async function targetInternships(user) {
  const base = `SELECT i.student_nim, i.status, i.start_date, i.end_date, i.field_supervisor, s.name, t.name AS startup_name
    FROM internships i JOIN students s ON s.nim=i.student_nim LEFT JOIN startup_teams t ON t.id=i.startup_id`;
  if (user.role === 'STUDENT') return (await db.execute(`${base} WHERE i.student_nim=?`, [user.id]))[0];
  if (user.role === 'LECTURER') return (await db.execute(`${base} WHERE i.academic_supervisor_nip=? OR i.academic_supervisor2_nip=?`, [user.id, user.id]))[0];
  return (await db.execute(base))[0];
}

router.get('/', async (req, res, next) => {
  try {
    const internships = pickInternships(await targetInternships(req.user));
    const sources = { socialCredit: 'ok', presence: 'ok' };

    let socialCredit = new Map();
    const sc = process.env.SOCIAL_CREDIT_API_URL;
    if (!sc || !process.env.SOCIAL_CREDIT_API_KEY) sources.socialCredit = 'not_configured';
    else if (internships.length) {
      try {
        const rows = await fetchJson(sc, process.env.SOCIAL_CREDIT_API_KEY, '/api/integration/scores');
        socialCredit = new Map(rows.filter(r => r.nim).map(r => [String(r.nim).trim(), r]));
      } catch (error) { console.error('Social credit scores error:', error.message); sources.socialCredit = 'error'; }
    }

    const presence = new Map();
    const pr = process.env.PRESENCE_API_URL;
    if (!pr || !process.env.PRESENCE_API_KEY) sources.presence = 'not_configured';
    else {
      for (const period of presencePeriods(internships)) {
        try {
          const rows = await fetchJson(pr, process.env.PRESENCE_API_KEY, `/api/integration/discipline?from=${period.from}&to=${period.to}`);
          const byNim = new Map(rows.filter(r => r.nim).map(r => [String(r.nim).trim(), r]));
          for (const nim of period.nims) if (byNim.has(nim)) presence.set(nim, byNim.get(nim));
        } catch (error) { console.error('Presence KPI error:', error.message); sources.presence = 'error'; }
      }
    }

    const data = internships.map(row => {
      const s = socialCredit.get(row.student_nim);
      const p = presence.get(row.student_nim);
      return {
        nim: row.student_nim, name: row.name, startupName: row.startup_name, fieldSupervisor: row.field_supervisor,
        internship: { status: row.status, startDate: toDate(row.start_date), endDate: toDate(row.end_date) },
        socialCredit: s ? { score: s.score, grade: s.grade, aspects: s.aspects } : null,
        presence: p ? {
          kpiScore: p.kpi_score, kpiStatus: p.kpi_status, periodStart: p.period_start, periodEnd: p.period_end,
          ontime: p.ontime, late: p.late, totalLateMinutes: p.total_late_minutes, alpha: p.alpha, izinSakit: p.izin_sakit,
          missingDailyReports: p.missing_daily_reports, reports: p.reports,
        } : null,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    res.set('Cache-Control', 'no-store').json({ data, sources });
  } catch (error) { next(error); }
});

export default router;
