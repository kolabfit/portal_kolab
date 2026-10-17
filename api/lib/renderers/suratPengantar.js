/**
 * PDF Renderer — Surat Pengantar Tim Startup
 *
 * Membangun PDF menggunakan pdfkit yang sudah tersedia di project.
 * Layout mengacu pada template asli:
 *   "SURAT-TIM-STARTUP-Sorgummi.docx"
 */

import PDFDocument from 'pdfkit';
import { resolveImageBuffer, drawSignatureOrSpacer } from './signatureHelper.js';

/**
 * @param {object} data   - Resolved data dari letterResolver (startup_members)
 * @param {object} manual - Manual fields dari request: { nomor_surat }
 * @returns {Buffer}      - PDF buffer
 */
export async function renderSuratPengantar(data, manual) {
  return new Promise(async (resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 70, right: 60 },
      info: { Title: 'Surat Pengantar Tim Startup', Author: 'Portal Ko+Lab' },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 70 - 60; // usable width
    const nomorSurat = String(manual.nomor_surat || '-').trim();

    // ─── KOP SURAT ───────────────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold')
       .text('RESEARCH ALLIANCE Ko+Lab', { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text('FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(70, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#000').stroke();
    doc.moveTo(70, doc.y + 2).lineTo(doc.page.width - 60, doc.y + 2).strokeColor('#000').lineWidth(2).stroke();
    doc.moveDown(0.8);

    // ─── JUDUL ────────────────────────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold')
       .text('SURAT KETERANGAN', { align: 'center' });
    doc.fontSize(10).font('Helvetica')
       .text(nomorSurat, { align: 'center' });
    doc.moveDown(1.2);

    // ─── PEMBUKA ──────────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica')
       .text('Yang bertanda tangan di bawah ini:', { lineGap: 2 });
    doc.moveDown(0.5);

    const signatory = data.signatory || {
      name: 'Muhamad Yusuf Ramadhan, S.A.B., M.A.B.',
      nip: '25980015',
      jabatan: 'Manager Program Startup Research Alliance Ko+Lab Telkom University',
      jabatanSingkat: 'Manager Program Startup Research Alliance Ko+Lab'
    };

    const infoRows = [
      ['Nama', `: ${signatory.name}`],
      ['NIP', `: ${signatory.nip || '-'}`],
      ['Jabatan', `: ${signatory.jabatan}`],
    ];

    infoRows.forEach(([label, val]) => {
      const labelW = 80;
      const x = doc.page.margins.left;
      const y = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text(label, x, y, { width: labelW, continued: false });
      doc.fontSize(10).font('Helvetica').text(val, x + labelW, y, { width: W - labelW });
    });

    doc.moveDown(0.8);

    // ─── BADAN SURAT ─────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica')
       .text(
         `Menerangkan bahwa nama-nama yang tertera di lampiran merupakan anggota tim Startup ${data.startup_name} ` +
         'dan berada dalam pembinaan Research Alliance Ko+Lab.',
         { lineGap: 4, align: 'justify' }
       );

    doc.moveDown(0.8);

    doc.text(
      'Demikian surat keterangan ini kami buat untuk digunakan sebagai keperluan administrasi pendataan startup. ' +
      'Atas perhatian Bapak/Ibu kami mengucapkan terima kasih.',
      { lineGap: 4, align: 'justify' }
    );

    doc.moveDown(1.5);

    // ─── TTD ─────────────────────────────────────────────────────────────────
    const dateNow = new Date();
    const months = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
    const tglSurat = `Bandung, ${dateNow.getDate()} ${months[dateNow.getMonth()]} ${dateNow.getFullYear()}`;

    doc.fontSize(10).font('Helvetica')
       .text('Hormat Saya,', { align: 'right' });
    doc.text(tglSurat, { align: 'right' });
    
    const sigBuffer = await resolveImageBuffer(manual.signature_image || manual.signature_url);
    drawSignatureOrSpacer(doc, sigBuffer, { align: 'right', width: 110, height: 48, fallbackMoveDown: 3 });

    doc.font('Helvetica-Bold')
       .text(signatory.name, { align: 'right' });
    doc.font('Helvetica').fontSize(9)
       .text(signatory.jabatanSingkat || signatory.jabatan, { align: 'right' });

    doc.moveDown(2);

    // ─── TABEL MAHASISWA ──────────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold')
       .text('Daftar Anggota Startup', { align: 'center' });
    doc.moveDown(0.8);

    // Header tabel
    const colWidths = [30, 120, 200, 100];
    const colLabels = ['NO', 'NIM', 'NAMA', 'POSISI'];
    const tblX = doc.page.margins.left;
    let y = doc.y;

    // Header row
    doc.fontSize(9).font('Helvetica-Bold');
    let x = tblX;
    colLabels.forEach((lbl, i) => {
      doc.rect(x, y, colWidths[i], 18).stroke();
      doc.text(lbl, x + 4, y + 4, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });
    y += 18;

    // Data rows
    doc.fontSize(9).font('Helvetica');
    data.members.forEach((s) => {
      x = tblX;
      const rowData = [String(s.no), s.nim, s.name, s.posisi];
      rowData.forEach((val, i) => {
        doc.rect(x, y, colWidths[i], 18).stroke();
        doc.text(val, x + 4, y + 4, { width: colWidths[i] - 8 });
        x += colWidths[i];
      });
      y += 18;
      // New page if needed
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    });

    doc.end();
  });
}
