/**
 * PDF Renderer — Surat Undangan Kegiatan
 *
 * Mengacu pada template asli:
 *   "SURAT UNDANGAN KEGIATAN.docx"
 */

import PDFDocument from 'pdfkit';
import { resolveImageBuffer, drawSignatureOrSpacer } from './signatureHelper.js';

/**
 * @param {object} data   - Resolved data dari letterResolver (event)
 * @param {object} manual - Manual fields dari request
 * @returns {Buffer}      - PDF buffer
 */
export async function renderSuratUndangan(data, manual) {
  return new Promise(async (resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 70, right: 65 },
      info: { Title: 'Surat Undangan Kegiatan', Author: 'Portal Ko+Lab' },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 70 - 65;
    const addresseeName = String(manual.addressee_name || 'Agnessya Nurrezqia, S.I.KOM., M.I.KOM.').trim();
    const addresseeTitle = String(manual.addressee_title || 'Narasumber').trim();
    
    // Fallback data event jika ada dari DB atau manual
    const event = data.event || {};
    const kegiatanNama = String(manual.kegiatan_nama || event.title || 'Forum Group Discussion Hibah Penelitian Kerjasama').trim();
    const kegiatanLokasi = String(manual.kegiatan_lokasi || event.location || 'Ruang Multimedia 2, Gd. Selaru Lt.3 FIT Telkom University').trim();
    const kegiatanWaktu = String(manual.kegiatan_waktu || (event.time ? `${event.time} WIB` : '09.00 – 16.00 WIB')).trim();
    const kegiatanHari = String(manual.kegiatan_hari_tanggal || event.date_id || 'Kamis, 10 Oktober 2024').trim();

    const signatory = data.signatory || {
      name: 'Robbi Hendriyanto, S.T., M.T.',
      nip: '25850011',
      jabatan: 'Ketua RA Ko+Lab Fakultas Ilmu Terapan'
    };

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
       .text('SURAT UNDANGAN KEGIATAN', { align: 'center' });
    if (manual.nomor_surat) {
      doc.fontSize(9.5).font('Helvetica').text(manual.nomor_surat, { align: 'center' });
    }
    doc.moveDown(1.5);

    // ─── PENERIMA ─────────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica').text('Ysh. Di tempat:');
    doc.font('Helvetica-Bold').text(addresseeName);
    doc.moveDown(1);

    // ─── PEMBUKA ──────────────────────────────────────────────────────────────
    doc.font('Helvetica').text('Dengan hormat,', { lineGap: 3 });
    doc.moveDown(0.5);

    doc.text(
      `Sehubungan dengan akan diselenggarakannya kegiatan "${kegiatanNama}", kami mengundang saudara/i untuk hadir sebagai ` +
      `${addresseeTitle} pada kegiatan tersebut. Adapun kegiatan yang akan diselenggarakan dengan rincian sebagai berikut:`,
      { align: 'justify', lineGap: 4 }
    );
    doc.moveDown(0.8);

    // ─── RINCIAN KEGIATAN ─────────────────────────────────────────────────────
    const details = [
      ['Lokasi', kegiatanLokasi],
      ['Pukul', kegiatanWaktu],
      ['Hari / Tanggal', kegiatanHari]
    ];

    details.forEach(([label, val]) => {
      const labelW = 100;
      const x = doc.page.margins.left + 20;
      const y = doc.y;
      doc.font('Helvetica-Bold').text(label, x, y, { width: labelW });
      doc.font('Helvetica').text(`:  ${val}`, x + labelW, y, { width: W - labelW - 20 });
      doc.moveDown(0.5);
    });

    doc.moveDown(0.8);

    // ─── PENUTUP ──────────────────────────────────────────────────────────────
    doc.font('Helvetica').text(
      'Demikian surat undangan ini dibuat, agar dapat digunakan sebagaimana mestinya. Kami mengharapkan kehadiran yang bersangkutan pada surat undangan ini, atas perhatiannya kami ucapkan terima kasih.',
      { align: 'justify', lineGap: 4 }
    );
    doc.moveDown(2);

    // ─── TTD ─────────────────────────────────────────────────────────────────
    const dateNow = new Date();
    const months = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
    const tglSurat = manual.tanggal_surat || `Bandung, ${dateNow.getDate()} ${months[dateNow.getMonth()]} ${dateNow.getFullYear()}`;

    doc.text(tglSurat, { align: 'right' });
    doc.text('Hormat Saya,', { align: 'right' });
    
    const sigBuffer = await resolveImageBuffer(manual.signature_image || manual.signature_url);
    drawSignatureOrSpacer(doc, sigBuffer, { align: 'right', width: 110, height: 48, fallbackMoveDown: 3 });

    doc.font('Helvetica-Bold').text(signatory.name, { align: 'right' });
    doc.font('Helvetica').fontSize(9).text(signatory.jabatan, { align: 'right' });

    doc.end();
  });
}
