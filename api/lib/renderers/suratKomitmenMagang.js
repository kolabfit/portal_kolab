/**
 * PDF Renderer — Surat Komitmen Magang
 *
 * Mengacu pada template asli:
 *   "SURAT KOMITMEN MAGANG 2024.docx"
 */

import PDFDocument from 'pdfkit';
import { resolveImageBuffer, drawSignatureOrSpacer } from './signatureHelper.js';

/**
 * @param {object} data   - Resolved data dari letterResolver (student)
 * @param {object} manual - Manual fields dari request
 * @returns {Buffer}      - PDF buffer
 */
export async function renderSuratKomitmenMagang(data, manual) {
  return new Promise(async (resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 70, right: 65 },
      info: { Title: 'Surat Komitmen Magang Startup', Author: 'Portal Ko+Lab' },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 70 - 65;
    const student = data.student || {};
    const studentName = String(student.name || manual.student_name || '').trim();
    const studentNim = String(student.nim || manual.student_nim || '').trim();
    const jurusan = String(manual.jurusan || 'D3 Sistem Informasi').trim();

    // ─── KOP SURAT ───────────────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold')
       .text('RESEARCH ALLIANCE Ko+Lab', { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text('FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(70, doc.y).lineTo(doc.page.width - 65, doc.y).strokeColor('#000').lineWidth(0.8).stroke();
    doc.moveTo(70, doc.y + 2).lineTo(doc.page.width - 65, doc.y + 2).strokeColor('#000').lineWidth(2).stroke();
    doc.moveDown(1.2);

    // ─── JUDUL ────────────────────────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold')
       .text('SURAT KOMITMEN MAGANG STARTUP', { align: 'center' });
    doc.moveDown(1.5);

    // ─── IDENTITAS MAHASISWA ──────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica').text('Yang bertanda tangan di bawah ini :');
    doc.moveDown(0.6);

    const rows = [
      ['Nama', `:  ${studentName}`],
      ['NIM', `:  ${studentNim}`],
      ['Jurusan', `:  ${jurusan}`]
    ];

    rows.forEach(([label, val]) => {
      const labelW = 80;
      const x = doc.page.margins.left + 15;
      const y = doc.y;
      doc.font('Helvetica-Bold').text(label, x, y, { width: labelW });
      doc.font('Helvetica').text(val, x + labelW, y, { width: W - labelW - 15 });
      doc.moveDown(0.5);
    });

    doc.moveDown(0.8);

    // ─── ISI KOMITMEN ─────────────────────────────────────────────────────────
    doc.font('Helvetica').text(
      'Selaku yang memberikan pernyataan komitmen, dengan ini saya menyatakan bahwa :',
      { lineGap: 3 }
    );
    doc.moveDown(0.5);

    const commitments = [
      'Bersedia mengikuti aturan yang ada di Ko+Lab.',
      'Bersedia menjaga keharmonisan dan menjalin kerja sama dengan rekan startup, anggota dan pengurus Ko+Lab.',
      'Bertanggung jawab terhadap hal dan tugas yang diberikan baik itu pekerjaan startup atau non-startup yang diberikan.',
      'Berkomitmen untuk berusaha menjalankan SevenS Ko+Lab Culture.',
      'Tidak akan melakukan tindakan yang melanggar aturan yang ada di Telkom University, baik secara akademik dan menjaga norma sosial.',
      'Bersedia diberikan peringatan jika ada pelanggaran pada aturan, dan dikeluarkan apabila pelanggaran yang dilakukan sudah tergolong berat serta menanggung segala risikonya.'
    ];

    commitments.forEach((text, i) => {
      const numW = 20;
      const x = doc.page.margins.left + 15;
      const y = doc.y;
      doc.font('Helvetica').text(`${i + 1}.`, x, y, { width: numW });
      doc.text(text, x + numW, y, { width: W - numW - 15, lineGap: 3, align: 'justify' });
      doc.moveDown(0.6);
    });

    doc.moveDown(0.8);

    // ─── PENUTUP ──────────────────────────────────────────────────────────────
    doc.text(
      'Demikian surat komitmen ini disetujui dan dibuat dengan sebenar-benarnya, agar dapat digunakan sebagaimana mestinya.',
      { lineGap: 4, align: 'justify' }
    );
    doc.moveDown(1.5);

    // ─── TTD MAHASISWA ────────────────────────────────────────────────────────
    const dateNow = new Date();
    const months = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
    const tglSurat = manual.kota_tanggal || `Bandung, ${dateNow.getDate()} ${months[dateNow.getMonth()]} ${dateNow.getFullYear()}`;

    doc.text(tglSurat, { align: 'right' });
    doc.text('Yang membuat pernyataan,', { align: 'right' });
    
    const sigBuffer = await resolveImageBuffer(manual.signature_image || manual.signature_url);
    drawSignatureOrSpacer(doc, sigBuffer, { align: 'right', width: 110, height: 48, fallbackMoveDown: 3.5 });

    doc.font('Helvetica-Bold').text(studentName || '__________________________', { align: 'right' });
    if (studentNim) {
      doc.font('Helvetica').fontSize(9).text(`NIM: ${studentNim}`, { align: 'right' });
    }

    doc.end();
  });
}
