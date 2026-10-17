/**
 * PDF Renderer — Sertifikat
 *
 * Menggunakan pdf-lib untuk meng-overlay teks penerima, peran, startup,
 * dan tanggal di atas template asli: "Sertifikat idspora_3.pdf"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, '../../../../template_surat/Sertifikat idspora_3.pdf');

/**
 * @param {object} data   - Resolved data dari letterResolver (student, startup)
 * @param {object} manual - Manual fields dari request
 * @returns {Promise<Buffer>} - PDF buffer
 */
export async function renderSuratSertifikat(data, manual) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template Sertifikat tidak ditemukan di: ${TEMPLATE_PATH}`);
  }

  const existingPdfBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const student = data.student || {};
  const studentName = String(manual.recipient_name || student.name || 'Nama Mahasiswa').toUpperCase().trim();
  const studentNim = student.nim || manual.student_nim || '';
  const peran = String(manual.peran || 'Peserta Program Inkubasi').trim();
  const startupName = String(data.startup_name || manual.startup_name || 'Ko+Lab').trim();

  const dateNow = new Date();
  const months = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember'];
  const tglTerbit = manual.tanggal_terbit || `${dateNow.getDate()} ${months[dateNow.getMonth()]} ${dateNow.getFullYear()}`;

  // Helper center text
  const drawCenteredText = (text, y, size, font, color) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    firstPage.drawText(text, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color,
    });
  };

  // 1. Nama Penerima Sertifikat (Besar & Tegas di bagian tengah)
  // Posisi Y disesuaikan dengan layout template sertifikat (sekitar y = 300)
  const nameSize = studentName.length > 30 ? 24 : 28;
  drawCenteredText(studentName, 305, nameSize, fontBold, rgb(0.12, 0.16, 0.28));

  // 2. NIM jika ada
  if (studentNim) {
    drawCenteredText(`NIM: ${studentNim}`, 285, 12, fontRegular, rgb(0.35, 0.4, 0.5));
  }

  // 3. Keterangan Peran / Prestasi
  const roleText = `Sebagai ${peran} — Tim Startup ${startupName}`;
  drawCenteredText(roleText, 250, 15, fontBold, rgb(0.85, 0.45, 0.1));

  // 4. Keterangan Dedikasi
  const descText = 'atas partisipasi, dedikasi, dan kontribusinya dalam program pembinaan Research Alliance Ko+Lab';
  drawCenteredText(descText, 225, 11, fontItalic, rgb(0.25, 0.3, 0.4));

  // 5. Tanggal Terbit di bagian bawah tengah/kanan
  drawCenteredText(`Bandung, ${tglTerbit}`, 160, 11, fontRegular, rgb(0.3, 0.35, 0.45));

  // 6. Nama Penandatangan (jika dipilih)
  if (data.signatory) {
    drawCenteredText(data.signatory.name, 95, 12, fontBold, rgb(0.15, 0.2, 0.3));
    drawCenteredText(data.signatory.jabatan || 'Ketua Research Alliance Ko+Lab', 80, 10, fontRegular, rgb(0.35, 0.4, 0.5));
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
}
