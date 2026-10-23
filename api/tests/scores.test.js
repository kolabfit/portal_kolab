import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickInternships, presencePeriods } from '../routes/scores.js';

test('magang yang dinilai: ONGOING dulu, lalu COMPLETED terakhir; PLANNED/CANCELLED diabaikan', () => {
  const rows = [
    { student_nim: 'a', status: 'COMPLETED', start_date: '2025-01-01', end_date: '2025-06-30' },
    { student_nim: 'a', status: 'ONGOING', start_date: '2026-07-07', end_date: '2026-12-31' },
    { student_nim: 'b', status: 'COMPLETED', start_date: '2025-01-01', end_date: '2025-06-30' },
    { student_nim: 'b', status: 'COMPLETED', start_date: '2025-07-01', end_date: '2025-12-31' },
    { student_nim: 'c', status: 'PLANNED', start_date: '2027-01-01', end_date: '2027-06-30' },
    { student_nim: 'd', status: 'CANCELLED', start_date: '2026-01-01', end_date: '2026-06-30' },
  ];
  const picked = Object.fromEntries(pickInternships(rows).map(r => [r.student_nim, r.end_date]));
  assert.deepEqual(picked, { a: '2026-12-31', b: '2025-12-31' });
});

test('periode presensi: dipotong ke hari ini, digabung per periode', () => {
  const periods = presencePeriods([
    { student_nim: 'a', start_date: '2026-07-07', end_date: '2026-12-31' },
    { student_nim: 'b', start_date: '2026-07-07', end_date: '2026-12-31' },
    { student_nim: 'c', start_date: '2025-07-01', end_date: '2025-12-31' },
    { student_nim: 'd', start_date: '2026-11-01', end_date: '2026-12-31' },
  ], '2026-10-22');
  assert.deepEqual(periods, [
    { from: '2026-07-07', to: '2026-10-22', nims: ['a', 'b'] },
    { from: '2025-07-01', to: '2025-12-31', nims: ['c'] },
  ]);
});
