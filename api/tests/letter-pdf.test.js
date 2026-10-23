import { test } from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import { renderTabbedText, renderDynamicBlocksToPdf, TAB_SPACES } from '../lib/renderers/dynamicBlockRenderer.js';

test('tab pada paragraf jadi tab stop, bukan karakter tab di PDF', () => {
  const doc = new PDFDocument({ size: 'A4' });
  doc.fontSize(11).font('Helvetica');
  const calls = [];
  const orig = doc.text.bind(doc);
  doc.text = (t, x, y, o) => { calls.push({ t, x }); return orig(t, x, y, o); };
  renderTabbedText(doc, 'Yang bertanda tangan:\n\nNama\t: Robbi\nJabatan\t: Ketua', 60, 480, { align: 'justify' });
  const stop = doc.widthOfString(' ') * TAB_SPACES;
  assert.ok(calls.every(c => !String(c.t).includes('\t')));
  assert.deepEqual(calls.filter(c => c.t.startsWith(':')).map(c => c.x), [60 + stop, 60 + stop]);
});

test('surat dengan tabel & tanda tangan ter-render', async () => {
  const buf = await renderDynamicBlocksToPdf([
    { type: 'paragraf_teks', data: { text: 'Nama\t: A\nNIP\t: 1' }, style: {} },
    { type: 'tanda_tangan', data: { cityDate: 'Bandung, 1 Januari 2026', salutation: 'Hormat Saya,', name: 'X', nip: '1', role: 'Ketua' }, style: { textAlign: 'right' } },
  ]);
  assert.equal(buf.subarray(0, 4).toString(), '%PDF');
});

test('**teks** jadi run tebal, tanda bintang tidak tercetak', () => {
  const doc = new PDFDocument({ size: 'A4' });
  doc.fontSize(11).font('Helvetica');
  const runs = [];
  const orig = doc.text.bind(doc);
  doc.text = (t, ...rest) => { runs.push([t, doc._font.name]); return orig(t, ...rest); };
  renderTabbedText(doc, 'pada **Ko+Lab**', 60, 480, { align: 'left' });
  assert.deepEqual(runs, [['pada ', 'Helvetica'], ['Ko+Lab', 'Helvetica-Bold']]);
});

test('sertifikat ter-render dengan latar & font Poppins', async () => {
  const buf = await renderDynamicBlocksToPdf([
    { type: 'paragraf_teks', data: { text: 'pada **Ko+Lab**' }, style: { marginBottom: 0 } },
    { type: 'tanda_tangan', data: { name: 'X', role: 'Ketua\nTelkom University' }, style: { width: 317, signatureLine: true } },
  ], { letterType: 'surat-sertifikat', orientation: 'landscape' });
  assert.match(buf.toString('latin1'), /Poppins-Bold/);
});

test('logo posisi bebas (gambar) tercetak tanpa menggeser alur teks', async () => {
  const blocks = [{ type: 'paragraf_teks', data: { text: 'A' }, style: { marginBottom: 0 } }];
  const plain = await renderDynamicBlocksToPdf(blocks, {});
  const withLogo = await renderDynamicBlocksToPdf([{ type: 'gambar', data: { imageUrl: '/logo-fit.png' }, style: { x: 400, y: 20, width: 120 } }, ...blocks], {});
  assert.match(withLogo.toString('latin1'), /\/Subtype \/Image/);
  assert.doesNotMatch(plain.toString('latin1'), /\/Subtype \/Image/);
});
