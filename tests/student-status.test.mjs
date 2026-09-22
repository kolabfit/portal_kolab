import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTs } from './load-ts.mjs';
const { default: View, StudentStatusSummary } = loadTs('views/StudentStatusView.tsx');
const data = { profile: { nim: 'A', name: 'Student A' }, membership: { isActive: true, isApproved: true, studentType: 'NON_STARTUP', jobDesk: null }, startup: null, internship: { current: null, history: [] }, workload: { activeLoad: 0, totalHistory: 0, categoryLoad: { PKM: 0, PROJECT: 0, RESEARCH: 0, COMPETITION: 0 }, active: [], history: [], planned: [] } };
const state = { data, loading: false, error: false, retry() {} };
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
test('student status renders actual children, empty states and numeric zero without admin actions', () => {
  const html = render(View, { state });
  for (const text of ['Student A', 'Belum tergabung dalam startup.', 'Belum memiliki data magang.', 'Belum memiliki workload aktif.', 'Belum ada riwayat workload.', '0 Aktif']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /undefined|NaN|Tambah Member|Delete|Import|Export/);
});
test('loading and failure provide accessible feedback and retry', () => {
  assert.match(render(View, { state: { ...state, data: null, loading: true } }), /Memuat status saya/);
  assert.match(render(View, { state: { ...state, data: null, error: true } }), /Data status belum dapat dimuat/);
  assert.match(render(View, { state: { ...state, data: null, error: true } }), /Coba Lagi/);
});
test('dashboard summary opens status and includes approval and workload counts', () => {
  let opened = false;
  const props = { state: { ...state, data: { ...data, membership: { ...data.membership, isApproved: false } } }, onOpen() { opened = true; } };
  const html = render(StudentStatusSummary, props);
  assert.match(html, /Buka Status Saya/); assert.match(html, /Menunggu Approval/); assert.match(html, /0 Aktif/);
  StudentStatusSummary(props).props.onClick(); assert.ok(opened);
});
test('workload job desk and PIC remain visible; expanded description is read only', () => {
  const item = { id: 'w', name: 'Project A', category: 'PROJECT', description: 'Project description', status: 'ACTIVE', jobDesk: 'Backend Developer', startDate: '2026-09-01', endDate: '2026-12-31', picName: 'Supervisor', picRole: 'LECTURER' };
  const html = render(View, { state: { ...state, data: { ...data, workload: { ...data.workload, activeLoad: 1, active: [item] } } } });
  for (const text of ['Backend Developer', 'Supervisor', 'Dosen', 'Lihat Detail']) assert.ok(html.includes(text), text);
  const { ActiveWorkloadCard } = loadTs('components/student-status/ActiveWorkloadCard.tsx', { react: { ...React, useState: () => [true, () => {}] } });
  const expanded = render(ActiveWorkloadCard, { item, categories: { PROJECT: 'Project' } });
  assert.match(expanded, /Project description/); assert.doesNotMatch(expanded, /Edit|Delete|Tambah Member/);
});
for (const [position, label] of [['CTO', 'CTO'], ['MEMBER', 'Anggota']]) test(`Status Saya and dashboard display KROOMBOX / ${label} ahead of job desk`, () => {
  const props = { state: { ...state, data: { ...data, membership: { ...data.membership, studentType: 'STARTUP', jobDesk: 'Backend & Infrastructure' }, startup: { id: 'k', name: 'KROOMBOX', position } } }, onOpen() {} };
  const html = render(View, props);
  assert.match(html, /KROOMBOX/); assert.ok(html.includes(label));
  assert.ok(html.indexOf('>Posisi<') < html.indexOf('>Job Desk<'));
  const dashboard = render(StudentStatusSummary, props);
  assert.match(dashboard, /KROOMBOX/); assert.ok(dashboard.includes(label));
  assert.doesNotMatch(dashboard, /Backend/);
});
