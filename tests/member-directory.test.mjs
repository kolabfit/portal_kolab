import { loadTs } from './load-ts.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';

// Render the actual component with in-memory hooks; no network or browser required.
function directory(options = {}) {
  const state = [];
  let cursor = 0;
  const requests = [];
  const react = { ...React, useEffect() {}, useState(initial) {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
  } };
  const module = { exports: {} };
  const source = fs.readFileSync(new URL('../views/MemberManagementView.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'react') return react;
    if (name === '../components/StartupPositionSelect') return loadTs('components/StartupPositionSelect.tsx');
    if (name === '../startupPositions') return loadTs('startupPositions.ts');
    if (name === '../api') return { api: { postData: (...args) => { requests.push(args); return Promise.resolve({ status: 'success' }); } } };
    if (name === '../types') return { UserRole: { ADMIN: 'ADMIN', STUDENT: 'STUDENT', LECTURER: 'LECTURER' } };
    return new Proxy({}, { get: () => () => null });
  }, console, FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? null; } } });
  function render() {
    cursor = 0;
    return module.exports.default({ userRole: 'ADMIN', startups: options.startups || [], onShowAlert() {}, showConfirm() {} });
  }
  render();
  state[0] = options.students || [{ role: 'STUDENT', studentId: 's1', name: 'Student' }];
  state[1] = [{ role: 'LECTURER', studentId: 'l1', name: 'Lecturer' }];
  state[3] = false;
  return { render, requests };
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
}
const label = node => React.Children.toArray(node.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join('');
const textContent = node => nodes(node).map(label).join(' ');
const fixtures = {
  startups: [{ id: 'k', name: 'KROOMBOX' }, { id: 'n', name: 'NGOLAB' }],
  students: [
    { studentId: 's1', name: 'Faisal', role: 'STUDENT', studentType: 'STARTUP', startupId: 'k', startupPosition: 'CTO', studentJobDesk: 'Backend', internshipStatus: 'ONGOING', workload: { activeLoad: 1 }, isActive: true, isApproved: true },
    { studentId: 's2', name: 'Alya', role: 'STUDENT', studentType: 'STARTUP', startupId: 'k', startupPosition: 'CEO', isActive: true, isApproved: true },
    { studentId: 's3', name: 'Andi', role: 'STUDENT', studentType: 'STARTUP', startupId: 'n', startupPosition: 'MEMBER', isActive: true, isApproved: true },
    { studentId: 's4', name: 'Non Startup', role: 'STUDENT', studentType: 'NON_STARTUP', startupPosition: null, isActive: true, isApproved: true }
  ]
};
const find = (tree, type, prop, value) => nodes(tree).find(n => n.type === type && n.props[prop] === value);
const positionField = tree => nodes(tree).find(n => n.type?.name === 'StartupPositionSelect');
test('student position header, badge, combined filters and reset; lecturer header unchanged', () => {
  const app = directory(fixtures);
  let tree = app.render();
  assert.ok(nodes(tree).some(n => n.type === 'th' && label(n) === 'POSISI STARTUP'));
  assert.ok(!nodes(tree).some(n => n.type === 'th' && label(n) === 'Job Desk'));
  assert.ok(nodes(tree).some(n => n.type === 'span' && label(n) === 'Anggota'));
  const filter = find(tree, 'select', 'aria-label', 'Posisi Startup');
  assert.deepEqual(nodes(filter).filter(n => n.type === 'option').map(label), ['Semua Posisi', 'CEO', 'COO', 'CTO', 'CFO', 'CMO', 'Anggota']);
  filter.props.onChange({ target: { value: 'CTO' } });
  for (const [name, value] of [['Filter startup', 'KROOMBOX'], ['Filter magang', 'ONGOING'], ['Filter workload', '1'], ['Filter status', 'active'], ['Filter nama', 'Faisal']]) {
    find(tree, 'input', 'aria-label', name).props.onChange({ target: { value } });
  }
  tree = app.render();
  const body = nodes(tree).find(n => n.type === 'tbody');
  assert.match(textContent(body), /Faisal/); assert.doesNotMatch(textContent(body), /Alya|Andi|Non Startup/);
  nodes(tree).find(n => n.type === 'button' && label(n) === 'Reset filter mahasiswa').props.onClick();
  tree = app.render(); assert.match(textContent(nodes(tree).find(n => n.type === 'tbody')), /Andi/);
  nodes(tree).find(n => n.type === 'button' && label(n).startsWith('DOSEN')).props.onClick();
  tree = app.render();
  assert.ok(nodes(tree).some(n => n.type === 'th' && label(n) === 'Job Desk'));
  assert.ok(!nodes(tree).some(n => n.type === 'th' && label(n) === 'POSISI STARTUP'));
});
test('add form defaults to MEMBER, resets on startup/type change and sends canonical position', async () => {
  const app = directory(fixtures);
  let tree = app.render();
  nodes(tree).find(n => n.type === 'button' && label(n).includes('New User')).props.onClick();
  tree = app.render(); assert.equal(positionField(tree), undefined);
  nodes(tree).find(n => n.type === 'button' && label(n) === ' Startup').props.onClick();
  tree = app.render(); assert.equal(positionField(tree).props.value, 'MEMBER');
  find(tree, 'select', 'name', 'startupId').props.onChange({ target: { value: 'k' } });
  tree = app.render(); positionField(tree).props.onChange('CTO');
  tree = app.render(); find(tree, 'select', 'name', 'startupId').props.onChange({ target: { value: 'n' } });
  tree = app.render(); assert.equal(positionField(tree).props.value, 'MEMBER');
  nodes(tree).find(n => n.type === 'button' && label(n) === ' Non-Startup').props.onClick();
  tree = app.render(); assert.equal(positionField(tree), undefined);
  nodes(tree).find(n => n.type === 'button' && label(n) === ' Startup').props.onClick();
  tree = app.render(); assert.equal(find(tree, 'select', 'name', 'startupId').props.value, '');
  find(tree, 'select', 'name', 'startupId').props.onChange({ target: { value: 'k' } });
  tree = app.render(); positionField(tree).props.onChange('CTO');
  tree = app.render();
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { id: 'new', name: 'New', studentJobDesk: 'Backend' } });
  const payload = app.requests.find(([action]) => action === 'register')[1];
  assert.equal(payload.startupId, 'k'); assert.equal(payload.startupPosition, 'CTO');
});
test('edit form displays current position, resets when moved, clears NON_STARTUP and preserves Job Desk', async () => {
  const app = directory(fixtures);
  let tree = app.render(); find(tree, 'button', 'aria-label', 'Edit Faisal').props.onClick();
  tree = app.render(); assert.equal(positionField(tree).props.value, 'CTO');
  assert.equal(find(tree, 'input', 'name', 'studentJobDesk').props.defaultValue, 'Backend');
  find(tree, 'select', 'name', 'startupId').props.onChange({ target: { value: 'n' } });
  tree = app.render(); assert.equal(positionField(tree).props.value, 'MEMBER');
  find(tree, 'select', 'name', 'studentType').props.onChange({ target: { value: 'NON_STARTUP' } });
  tree = app.render(); assert.equal(positionField(tree), undefined);
  assert.equal(find(tree, 'select', 'name', 'startupId').props.value, '');
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { name: 'Faisal', studentType: 'NON_STARTUP', studentJobDesk: 'Backend' } });
  const payload = app.requests.find(([action]) => action === 'manageMember')[1];
  assert.equal(payload.data.startupId, null); assert.equal(payload.data.startupPosition, null); assert.equal(payload.data.studentJobDesk, 'Backend');
});
test('startup cluster groups member names in explicit leadership order', () => {
  const app = directory(fixtures);
  let tree = app.render(); nodes(tree).find(n => n.type === 'button' && label(n) === 'Startup Cluster').props.onClick();
  tree = app.render(); nodes(tree).find(n => n.type === 'button' && label(n).includes('Lihat Struktur Tim')).props.onClick();
  tree = app.render(); const team = nodes(tree).find(n => n.type === 'div' && String(n.props.className).includes('fixed inset-0 z-[150]'));
  assert.deepEqual(nodes(team).filter(n => n.type === 'h5').map(label), ['CEO', 'COO', 'CTO', 'CFO', 'CMO', 'Anggota']);
  const sections = nodes(team).filter(n => n.type === 'section');
  assert.match(textContent(sections[0]), /Alya/); assert.match(textContent(sections[2]), /Faisal/); assert.doesNotMatch(textContent(team), /Andi/);
});
test('edit member submits chosen C-level as startupPosition independently of Job Desk', async () => {
  const app = directory(fixtures);
  let tree = app.render(); find(tree, 'button', 'aria-label', 'Edit Andi').props.onClick();
  tree = app.render(); assert.equal(positionField(tree).props.value, 'MEMBER');
  positionField(tree).props.onChange('CTO'); tree = app.render();
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { name: 'Andi', studentType: 'STARTUP', studentJobDesk: 'Backend' } });
  const payload = app.requests.find(([action]) => action === 'manageMember')[1];
  assert.equal(payload.targetId, 's3'); assert.equal(payload.data.startupPosition, 'CTO');
  assert.equal(payload.data.startupId, 'n'); assert.equal(payload.data.studentJobDesk, 'Backend');
});
test('directory actions, placeholder, selection reset and execution guard', async () => {
  const app = directory();
  const common = ['Aktifkan', 'Nonaktifkan', 'Setujui', 'Batalkan Persetujuan', 'Edit Detail'];
  const internship = ['Tetapkan Magang', 'Ubah Status Magang', 'Selesaikan Magang', 'Hapus dari Magang'];
  const select = tree => nodes(tree).find(n => n.type === 'select' && n.props['aria-label'] === 'Pilih aksi bulk');
  const bulk = tree => nodes(tree).find(n => n.type === 'button' && label(n).includes('Bulk Action ('));
  let tree = app.render();
  for (const tab of ['students', 'lecturers', 'students']) {
    const options = nodes(select(tree)).filter(n => n.type === 'option').map(label);
    assert.deepEqual(options, ['PILIH AKSI...', ...common, ...(tab === 'students' ? internship : []), 'Hapus']);
    assert.equal(select(tree).props.value, '');
    assert.ok(bulk(tree).props.disabled);
    assert.match(label(bulk(tree)), /\(0\)/);
    nodes(tree).find(n => n.type === 'input' && n.props.type === 'checkbox').props.onChange();
    tree = app.render();
    assert.match(label(bulk(tree)), /\(1\)/);
    assert.ok(bulk(tree).props.disabled);
    await bulk(tree).props.onClick();
    assert.equal(app.requests.length, 0);
    select(tree).props.onChange({ target: { value: tab === 'students' ? 'assignInternship' : 'activate' } });
    tree = app.render();
    assert.equal(bulk(tree).props.disabled, false);
    const next = tab === 'students' ? 'DOSEN' : 'MAHASISWA';
    nodes(tree).find(n => n.type === 'button' && label(n).startsWith(next)).props.onClick();
    tree = app.render();
  }
});
