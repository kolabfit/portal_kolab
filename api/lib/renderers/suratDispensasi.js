/**
 * PDF Renderer — Surat Dispensasi
 *
 * Mengacu pada template asli:
 *   "Surat Dispensasi Ko+Lab Oodo Training.docx"
 */

import PDFDocument from 'pdfkit';
import { resolveImageBuffer, drawSignatureOrSpacer } from './signatureHelper.js';

/**
 * @param {object} data   - Resolved data dari letterResolver
 * @param {object} manual - Manual fields dari request
 * @returns {Buffer}      - PDF buffer
 */
export async function renderSuratDispensasi(data, manual) {
  return new Promise(async (resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 65, right: 60 },
      info: { Title: 'Surat Permohonan Dispensasi', Author: 'Portal Ko+Lab' },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 65 - 60;
    const nomorSurat = String(manual.nomor_surat || '001/DISP/KOLABFIT/2025').trim();
    const hal = String(manual.hal || 'Permohonan Dispensasi').trim();
    const lampiran = String(manual.lampiran || '2').trim();
    const tujuanDosen = String(manual.tujuan_dosen || 'Dosen Pengampu Mata Kuliah\nDi Tempat').trim();
    const kegiatanNama = String(manual.kegiatan_nama || 'Odoo Partner Recruitment 2025').trim();
    const kegiatanTanggal = String(manual.kegiatan_tanggal || 'Selasa, 07 Oktober 2025').trim();
    const kegiatanDeskripsi = manual.kegiatan_deskripsi 
      ? String(manual.kegiatan_deskripsi).trim()
      : `Dalam rangka keterlibatan pada kegiatan ${kegiatanNama} yang merupakan program pelatihan untuk mendapatkan training dan dukungan bisnis dari partner manager, yang akan dilaksanakan pada ${kegiatanTanggal}. Maka kami dengan ini meminta izin dispensasi untuk mahasiswa terlampir.`;

    const signatory = data.signatory || {
      name: 'Robbi Hendriyanto, S.T., M.T.',
      nip: '25850011',
      jabatan: 'Ketua Research Alliance Ko+Lab\nFakultas Ilmu Terapan'
    };

    // ─── KOP SURAT ───────────────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold')
       .text('RESEARCH ALLIANCE Ko+Lab', { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text('FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(65, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#000').lineWidth(0.8).stroke();
    doc.moveTo(65, doc.y + 2).lineTo(doc.page.width - 60, doc.y + 2).strokeColor('#000').lineWidth(2).stroke();
    doc.moveDown(0.8);

    // ─── HEADER SURAT ────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica');
    doc.text(`No: ${nomorSurat}`);
    doc.text(`Hal: ${hal}`);
    doc.text(`Lampiran: ${lampiran}`);
    doc.moveDown(0.8);

    doc.text('Kepada Yth.');
    doc.font('Helvetica-Bold').text(tujuanDosen);
    doc.moveDown(0.8);

    doc.font('Helvetica').text('Dengan hormat,', { lineGap: 3 });
    doc.moveDown(0.4);

    // ─── BADAN SURAT ─────────────────────────────────────────────────────────
    doc.text(kegiatanDeskripsi, { align: 'justify', lineGap: 3 });
    doc.moveDown(0.6);

    doc.text(
      'Demikian surat permohonan dispensasi ini kami sampaikan. Atas perhatian dan izin yang diberikan kami mengucapkan terima kasih.',
      { align: 'justify', lineGap: 3 }
    );
    doc.moveDown(1);

    // ─── TTD ─────────────────────────────────────────────────────────────────
    const dateNow = new Date();
    const months = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
    const tglSurat = manual.tanggal_surat || `Bandung, ${dateNow.getDate()} ${months[dateNow.getMonth()]} ${dateNow.getFullYear()}`;

    doc.text(tglSurat, { align: 'left' });
    
    const sigBuffer = await resolveImageBuffer(manual.signature_image || manual.signature_url);
    drawSignatureOrSpacer(doc, sigBuffer, { align: 'left', width: 110, height: 48, fallbackMoveDown: 2.5 });

    doc.font('Helvetica-Bold').text(signatory.name);
    doc.font('Helvetica').fontSize(9).text(signatory.jabatan);
    doc.moveDown(1.5);

    // ─── LAMPIRAN 1: DAFTAR MAHASISWA ─────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('Daftar Mahasiswa', { align: 'center' });
    doc.moveDown(0.5);

    const students = Array.isArray(data.students) && data.students.length > 0
      ? data.students
      : [
          { no: 1, name: 'Noval Adiprasetya', nim: '607012400051', prodi: manual.prodi || 'D3 Sistem Informasi', kelas: manual.kelas || 'D3SI-48-01' }
        ];

    const colW = [30, 180, 100, 120, 80];
    const colLabels = ['No', 'Nama Mahasiswa', 'NIM', 'Prodi', 'Kelas'];
    const startX = 65;
    let curY = doc.y;

    // Header tabel
    doc.fontSize(9).font('Helvetica-Bold');
    let curX = startX;
    colLabels.forEach((lbl, i) => {
      doc.rect(curX, curY, colW[i], 18).stroke();
      doc.text(lbl, curX + 3, curY + 4, { width: colW[i] - 6, align: i === 0 ? 'center' : 'left' });
      curX += colW[i];
    });
    curY += 18;

    // Baris Mahasiswa
    doc.fontSize(8.5).font('Helvetica');
    students.forEach((s, idx) => {
      curX = startX;
      const row = [
        String(s.no || idx + 1),
        s.name || '-',
        s.nim || '-',
        s.prodi || manual.prodi || 'D3 Sistem Informasi',
        s.kelas || manual.kelas || '-'
      ];
      row.forEach((val, i) => {
        doc.rect(curX, curY, colW[i], 18).stroke();
        doc.text(val, curX + 3, curY + 4, { width: colW[i] - 6, align: i === 0 ? 'center' : 'left' });
        curX += colW[i];
      });
      curY += 18;
      if (curY > doc.page.height - 70) {
        doc.addPage();
        curY = 50;
      }
    });

    // ─── LAMPIRAN 2: AGENDA KEGIATAN ──────────────────────────────────────────
    doc.addPage();
    doc.fontSize(11).font('Helvetica-Bold').text('Agenda Kegiatan', { align: 'center' });
    doc.moveDown(0.6);

    const agendaColW = [80, 150, 140, 60, 90];
    const agendaLabels = ['Tgl', 'Key Benefits', 'Agenda', 'Waktu', 'Lokasi'];
    curY = doc.y;

    doc.fontSize(8.5).font('Helvetica-Bold');
    curX = startX;
    agendaLabels.forEach((lbl, i) => {
      doc.rect(curX, curY, agendaColW[i], 18).stroke();
      doc.text(lbl, curX + 3, curY + 4, { width: agendaColW[i] - 6, align: 'center' });
      curX += agendaColW[i];
    });
    curY += 18;

    const agendaList = Array.isArray(manual.agenda_list) && manual.agenda_list.length > 0
      ? manual.agenda_list
      : [
          {
            tgl: kegiatanTanggal,
            benefits: '• Materi Training & Dukungan Eksklusif\n• Dukungan Bisnis Partner Manager',
            agenda: 'Welcome & Registration\nWorkshop Sesi 1\nNetworking Session',
            waktu: '09:30 - 17:00',
            lokasi: manual.lokasi || 'Bandung'
          }
        ];

    doc.fontSize(8).font('Helvetica');
    agendaList.forEach((ag) => {
      const rowHeight = 70;
      if (curY + rowHeight > doc.page.height - 50) {
        doc.addPage();
        curY = 50;
      }
      curX = startX;
      const vals = [
        ag.tgl || kegiatanTanggal,
        ag.benefits || '-',
        ag.agenda || '-',
        ag.waktu || '-',
        ag.lokasi || manual.lokasi || '-'
      ];
      vals.forEach((v, i) => {
        doc.rect(curX, curY, agendaColW[i], rowHeight).stroke();
        doc.text(v, curX + 3, curY + 4, { width: agendaColW[i] - 6, align: i === 3 ? 'center' : 'left' });
        curX += agendaColW[i];
      });
      curY += rowHeight;
    });

    doc.end();
  });
}
