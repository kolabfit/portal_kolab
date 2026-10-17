/**
 * PDF Renderer — Surat Rekognisi
 *
 * Mengacu pada template asli:
 *   "Surat-Rekognisi Innovillage.docx"
 */

import PDFDocument from 'pdfkit';
import { resolveImageBuffer, drawSignatureOrSpacer } from './signatureHelper.js';

/**
 * @param {object} data   - Resolved data dari letterResolver
 * @param {object} manual - Manual fields dari request
 * @returns {Buffer}      - PDF buffer
 */
export async function renderSuratRekognisi(data, manual) {
  return new Promise(async (resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 65, right: 60 },
      info: { Title: 'Surat Pengajuan Rekognisi Mata Kuliah', Author: 'Portal Ko+Lab' },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const nomorSurat = String(manual.nomor_surat || '001/ADM/KOLABFIT/2025').trim();
    const lampiran = String(manual.lampiran || '2 lembar').trim();
    const hal = String(manual.hal || 'Pengajuan Rekognisi Mata Kuliah').trim();
    const tujuan = String(manual.tujuan_surat || 'Kaprodi D3 Sistem Informasi\ndi tempat').trim();

    const signatory = data.signatory || {
      name: 'Robbi Hendriyanto, S.T., M.T.',
      nip: '25850011',
      jabatan: 'Ketua Ko+Lab Fakultas Ilmu Terapan'
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

    // ─── HEADER ──────────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica');
    doc.text(`No: ${nomorSurat}`);
    doc.text(`Lampiran : ${lampiran}`);
    doc.text(`Hal: ${hal}`);
    doc.moveDown(0.8);

    doc.text('Kepada Ysh.');
    doc.font('Helvetica-Bold').text(tujuan);
    doc.moveDown(0.8);

    doc.font('Helvetica').text('Dengan hormat,');
    doc.moveDown(0.4);

    doc.text(
      'Dalam rangka mendukung kegiatan pengembangan portofolio mahasiswa khususnya di Program Studi D3 Sistem Informasi. ' +
      'Maka kami selaku Research Alliance Ko+Lab di Fakultas Ilmu Terapan yang membawahi pembinaan mahasiswa mengajukan ' +
      'mahasiswa-mahasiswa tim yang terlampir di lampiran untuk di rekognisi pada mata kuliah berikut:',
      { align: 'justify', lineGap: 3 }
    );
    doc.moveDown(0.8);

    // ─── TABEL MATA KULIAH ────────────────────────────────────────────────────
    const matkulList = Array.isArray(manual.mata_kuliah_list) && manual.mata_kuliah_list.length > 0
      ? manual.mata_kuliah_list
      : [
          { mk: 'Analisis dan Perancangan Sistem Informasi', nilai: '+15', ket: 'Untuk tim lolos pendanaan' },
          { mk: 'Pengembangan Aplikasi Berbasis Web', nilai: '+10', ket: 'Untuk tim lolos pendanaan' },
          { mk: 'Basis Data II', nilai: '+10', ket: 'Untuk tim lolos pendanaan' },
          { mk: 'Etika Profesi', nilai: 'Indeks A', ket: 'Untuk seluruh tim yang mendaftar Innovillage' }
        ];

    const colW = [25, 230, 95, 120];
    const colLabels = ['No', 'Daftar Mata Kuliah', 'Penambahan Nilai', 'Keterangan'];
    const startX = 65;
    let curY = doc.y;

    doc.fontSize(8.5).font('Helvetica-Bold');
    let curX = startX;
    colLabels.forEach((lbl, i) => {
      doc.rect(curX, curY, colW[i], 18).stroke();
      doc.text(lbl, curX + 3, curY + 4, { width: colW[i] - 6, align: i === 0 || i === 2 ? 'center' : 'left' });
      curX += colW[i];
    });
    curY += 18;

    doc.fontSize(8).font('Helvetica');
    matkulList.forEach((item, idx) => {
      curX = startX;
      const vals = [String(idx + 1), item.mk || '-', item.nilai || '-', item.ket || '-'];
      vals.forEach((v, i) => {
        doc.rect(curX, curY, colW[i], 20).stroke();
        doc.text(v, curX + 3, curY + 4, { width: colW[i] - 6, align: i === 0 || i === 2 ? 'center' : 'left' });
        curX += colW[i];
      });
      curY += 20;
    });

    doc.moveDown(1);
    doc.y = curY + 10;
    doc.fontSize(10).font('Helvetica').text(
      'Demikian surat permohonan pengajuan rekognisi mata kuliah ini kami sampaikan. Atas perhatiannya kami mengucapkan terima kasih.',
      { align: 'justify', lineGap: 3 }
    );
    doc.moveDown(1);

    // ─── TTD ─────────────────────────────────────────────────────────────────
    const dateNow = new Date();
    const months = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
    const tglSurat = manual.tanggal_surat || `Bandung, ${dateNow.getDate()} ${months[dateNow.getMonth()]} ${dateNow.getFullYear()}`;

    doc.text(tglSurat, { align: 'right' });
    
    const sigBuffer = await resolveImageBuffer(manual.signature_image || manual.signature_url);
    drawSignatureOrSpacer(doc, sigBuffer, { align: 'right', width: 110, height: 48, fallbackMoveDown: 2.5 });

    doc.font('Helvetica-Bold').text(signatory.name, { align: 'right' });
    doc.font('Helvetica').fontSize(9).text(signatory.jabatan, { align: 'right' });

    // ─── LAMPIRAN: DAFTAR MAHASISWA ───────────────────────────────────────────
    doc.addPage();
    doc.fontSize(11).font('Helvetica-Bold').text('Berikut terlampir daftar mahasiswa lolos pendanaan :', { align: 'left' });
    doc.moveDown(0.6);

    const mhsColW = [25, 175, 80, 110, 40, 40];
    const mhsLabels = ['No', 'Judul', 'NIM', 'Nama', 'Kelas', 'Prodi'];

    function drawStudentTable(list) {
      curY = doc.y;
      doc.fontSize(8).font('Helvetica-Bold');
      curX = startX;
      mhsLabels.forEach((lbl, i) => {
        doc.rect(curX, curY, mhsColW[i], 18).stroke();
        doc.text(lbl, curX + 2, curY + 4, { width: mhsColW[i] - 4, align: 'center' });
        curX += mhsColW[i];
      });
      curY += 18;

      doc.fontSize(7.5).font('Helvetica');
      list.forEach((m, idx) => {
        if (curY > doc.page.height - 50) {
          doc.addPage();
          curY = 50;
        }
        curX = startX;
        const vals = [
          String(m.no || idx + 1),
          m.judul || '-',
          m.nim || '-',
          m.nama || '-',
          m.kelas || manual.kelas || '48-01',
          m.prodi || manual.prodi || 'D3SI'
        ];
        vals.forEach((v, i) => {
          doc.rect(curX, curY, mhsColW[i], 22).stroke();
          doc.text(v, curX + 2, curY + 3, { width: mhsColW[i] - 4, align: i === 0 || i >= 4 ? 'center' : 'left' });
          curX += mhsColW[i];
        });
        curY += 22;
      });
      doc.y = curY + 15;
    }

    const lolosList = Array.isArray(manual.mahasiswa_lolos) && manual.mahasiswa_lolos.length > 0
      ? manual.mahasiswa_lolos
      : (Array.isArray(data.members) && data.members.length > 0
          ? data.members.map((m, i) => ({ no: i + 1, judul: data.startup_name || manual.kegiatan_judul || 'Proyek Ko+Lab', nim: m.nim, nama: m.name, kelas: '48-01', prodi: 'D3SI' }))
          : [{ no: 1, judul: manual.kegiatan_judul || 'Platform Berbasis AI', nim: '607012430003', nama: 'Fitra Okto Kurniawan', kelas: '48-03', prodi: 'D3SI' }]
        );

    drawStudentTable(lolosList);

    if (Array.isArray(manual.mahasiswa_seleksi) && manual.mahasiswa_seleksi.length > 0) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fontSize(11).font('Helvetica-Bold').text('Daftar mahasiswa telah mengikuti tahap seleksi :', { align: 'left' });
      doc.moveDown(0.6);
      drawStudentTable(manual.mahasiswa_seleksi);
    }

    doc.end();
  });
}
