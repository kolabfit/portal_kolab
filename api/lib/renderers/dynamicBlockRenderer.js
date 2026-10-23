/**
 * Dynamic Block PDF Renderer — Portal Ko+Lab
 *
 * Renders any customized document blocks (Kop Surat, Judul, Paragraf,
 * Tabel Data, Garis Pembatas, Tanda Tangan, Spasi Kosong) with 100% WYSIWYG
 * fidelity directly to an official PDF using PDFKit.
 *
 * Supports:
 * - Single-page & Multi-page documents (pageNumber attribute / pagesCount)
 * - Exact column widths (percentages & proportional layout)
 * - Custom row heights and cell padding
 * - Digital signature images (PNG/JPG base64 data URLs & URLs)
 * - Custom typography (fonts, sizes, colors, alignment, styles)
 * - Portrait & Landscape A4 orientations
 */

import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import path from 'path';
import { resolveImageBuffer } from './signatureHelper.js';

const asset = (p) => fileURLToPath(new URL(`../../assets/${p}`, import.meta.url));

// Template sertifikat (desain "Sertifikat Aslab"): latar ornamen + logo, font Poppins, isi rata kiri x=177pt.
// Editor memakai latar & margin yang sama (public/sertifikat-bg.png, CERT_* di SuratAdministrasiView).
export const CERTIFICATE_TYPE = 'surat-sertifikat';
const CERT_MARGINS = { top: 40, bottom: 30, left: 177, right: 60 };

// Gambar bawaan portal ("/logo-fit.png" = public/ di frontend) dibaca dari api/assets; selain itu data URL / URL
async function resolveImage(url) {
  if (typeof url === 'string' && url.startsWith('/')) {
    const file = asset(path.basename(url));
    return existsSync(file) ? file : null;
  }
  return resolveImageBuffer(url);
}

/**
 * Calculates column widths in points based on headers and custom percentage widths
 */
function calculateColumnWidths(headers, colWidths, totalWidth) {
  const colCount = Math.max(1, headers.length);
  let percentages = [];

  if (Array.isArray(colWidths) && colWidths.length === colCount && colWidths.every(w => typeof w === 'number' && w > 0)) {
    percentages = [...colWidths];
  } else {
    const base = Math.floor(100 / colCount);
    const remainder = 100 - base * colCount;
    percentages = Array(colCount).fill(base);
    if (percentages.length > 0) percentages[0] += remainder;
  }

  // Normalize percentages to sum to 100
  const sum = percentages.reduce((a, b) => a + b, 0);
  const normalized = percentages.map(p => (p / (sum || 100)) * totalWidth);
  return normalized;
}

// Lebar tab = 24 spasi, sama dengan `tab-size: 24` di editor (SuratAdministrasiView)
export const TAB_SPACES = 24;
// Lebar blok tanda tangan; editor memakai lebar yang sama (SIGNATURE_BLOCK_WIDTH di SuratAdministrasiView)
export const SIGNATURE_BLOCK_WIDTH = 240;

/**
 * Teks paragraf dengan dukungan tab ("Nama\t: isi").
 * Font standar PDF tidak punya glyph tab (tercetak sebagai tanda kutip), jadi tab
 * di-emulasikan sebagai tab stop: segmen berikutnya mulai di kelipatan TAB_SPACES spasi.
 */
export function renderTabbedText(doc, text, x, width, opts) {
  const stop = doc.widthOfString(' ') * TAB_SPACES;
  let plain = [];
  const flush = () => {
    if (!plain.length) return;
    // PDFKit membuang baris kosong di akhir teks; spasi kosong itu ditambahkan manual
    const t = plain.join('\n').replace(/\n+$/, '');
    const trailing = plain.length - (t ? t.split('\n').length : 0);
    // **teks** = tebal (opts.font / opts.boldFont)
    const runs = t.split(/\*\*([\s\S]+?)\*\*/).map((s, i) => [s, i % 2 === 1]).filter(([s]) => s);
    if (runs.length > 1 || runs[0]?.[1]) {
      const regular = opts.font || 'Helvetica';
      runs.forEach(([s, bold], i) => {
        doc.font(bold ? (opts.boldFont || 'Helvetica-Bold') : regular);
        const more = { width, ...opts, continued: i < runs.length - 1 };
        i ? doc.text(s, more) : doc.text(s, x, doc.y, more);
      });
      doc.font(regular);
    } else if (t) doc.text(t, x, doc.y, { width, ...opts });
    if (trailing) doc.y += trailing * (doc.currentLineHeight(true) + (opts.lineGap || 0));
    plain = [];
  };

  for (const line of String(text).split('\n')) {
    if (!line.includes('\t')) { plain.push(line); continue; }
    flush();
    const segs = line.split('\t');
    const y = doc.y;
    let cx = 0;
    segs.forEach((seg, i) => {
      const last = i === segs.length - 1;
      if (!last) {
        if (seg) doc.text(seg, x + cx, y, { lineBreak: false });
        // Seperti CSS: jika jarak ke tab stop < 0.5ch, lompat ke tab stop berikutnya
        const end = cx + doc.widthOfString(seg);
        cx = (Math.floor(end / stop) + 1) * stop;
        if (cx - end < doc.widthOfString('0') / 2) cx += stop;
      } else {
        // Segmen terakhir boleh terbungkus; baris lanjutannya menjorok sejajar isi
        doc.text(seg || ' ', x + cx, y, { ...opts, width: Math.max(stop, width - cx), align: opts.align === 'justify' ? 'justify' : 'left' });
      }
    });
  }
  flush();
}

/**
 * Renders an array of DocumentBlock objects to a PDF buffer
 *
 * @param {Array<object>} blocks - Array of document block objects
 * @param {object} options - { orientation: 'portrait'|'landscape', pagesCount?: number, letterType?: string, letterTitle?: string }
 * @returns {Promise<Buffer>}
 */
export async function renderDynamicBlocksToPdf(blocks, options = {}) {
  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const letterTitle = options.letterTitle || 'Dokumen Resmi Ko+Lab';

  return new Promise(async (resolve, reject) => {
    try {
      const chunks = [];
      const isCert = options.letterType === CERTIFICATE_TYPE;
      const margins = isCert ? CERT_MARGINS : orientation === 'landscape'
        ? { top: 40, bottom: 40, left: 50, right: 50 }
        : { top: 50, bottom: 50, left: 60, right: 50 };

      const doc = new PDFDocument({
        size: 'A4',
        layout: orientation,
        margins,
        info: {
          Title: letterTitle,
          Author: 'Research Alliance Ko+Lab Telkom University',
          Creator: 'Portal Ko+Lab Document Engine',
        },
        autoFirstPage: true,
        // Sertifikat: font awal Poppins (bukan Helvetica) agar nama 'Helvetica' di bawah tidak tertahan cache
        font: isCert ? asset('fonts/Poppins-Regular.ttf') : undefined
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Sertifikat: nama font standar dipetakan ke Poppins, jadi kode blok di bawah tetap sama
      if (isCert) {
        for (const name of ['Helvetica', 'Helvetica-Oblique']) doc.registerFont(name, asset('fonts/Poppins-Regular.ttf'));
        for (const name of ['Helvetica-Bold', 'Helvetica-BoldOblique']) doc.registerFont(name, asset('fonts/Poppins-Bold.ttf'));
      }

      const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftMargin = doc.page.margins.left;
      const rightMargin = doc.page.width - doc.page.margins.right;

      // Group blocks by pageNumber
      const blocksByPage = new Map();
      const rawPagesCount = options.pagesCount || 1;
      let maxPageFound = 1;

      (blocks || []).forEach(block => {
        const p = Number(block.pageNumber || 1);
        if (p > maxPageFound) maxPageFound = p;
        if (!blocksByPage.has(p)) blocksByPage.set(p, []);
        blocksByPage.get(p).push(block);
      });

      const totalPages = Math.max(rawPagesCount, maxPageFound);

      // Render page by page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (pageNum > 1) {
          doc.addPage({
            size: 'A4',
            layout: orientation,
            margins
          });
        }

        if (isCert) doc.image(asset('sertifikat-bg.png'), 0, 0, { width: doc.page.width, height: doc.page.height });

        const pageBlocks = blocksByPage.get(pageNum) || [];

        // Logo/gambar posisi bebas: x/y/lebar (pt) dari pojok kiri atas halaman, tinggi mengikuti rasio
        for (const b of pageBlocks.filter(b => b.type === 'gambar')) {
          const img = await resolveImage(b.data?.imageUrl);
          const s = b.style || {};
          const y = doc.y;
          if (img) try { doc.image(img, s.x || 0, s.y || 0, { width: s.width || 100 }); } catch (_) {}
          doc.y = y;
        }

        for (const block of pageBlocks) {
          if (block.type === 'gambar') continue;
          const style = block.style || {};
          const data = block.data || {};

          // Margin (px editor = pt PDF, kanvas editor selebar 595px = A4)
          if (style.marginTop > 0) doc.y += style.marginTop;
          // Tanpa marginBottom: n × tinggi baris font terakhir (editor menghitung sama: defaultSpaceAfter)
          const spaceAfter = (fallbackLines) => typeof style.marginBottom === 'number' && style.marginBottom >= 0 ? (doc.y += style.marginBottom) : doc.moveDown(fallbackLines);

          // ─── 1. KOP SURAT ────────────────────────────────────────────────
          if (block.type === 'kop_surat') {
            const startY = doc.y;
            const logoW = 44;
            const logoH = 44;

            // Draw Logo if available
            let hasLogo = false;
            if (data.logoUrl) {
              const logoBuf = await resolveImageBuffer(data.logoUrl);
              if (logoBuf) {
                try {
                  doc.image(logoBuf, leftMargin + 10, startY, { fit: [logoW, logoH] });
                  hasLogo = true;
                } catch (_) {}
              }
            }

            const textAlign = style.textAlign || 'center';
            const textX = hasLogo ? leftMargin + logoW + 15 : leftMargin;
            const textWidth = hasLogo ? usableWidth - logoW - 25 : usableWidth;

            doc.fontSize(style.fontSize || 12).font('Helvetica-Bold')
              .fillColor('#0f172a')
              .text(data.institution || 'RESEARCH ALLIANCE Ko+Lab', textX, startY + 2, {
                width: textWidth,
                align: textAlign
              });

            doc.fontSize(9.5).font('Helvetica-Bold')
              .fillColor('#1e293b')
              .text(data.faculty || 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY', textX, doc.y + 1, {
                width: textWidth,
                align: textAlign
              });

            doc.fontSize(8).font('Helvetica')
              .fillColor('#64748b')
              .text(data.address || 'Gedung Selaru Lt.3, Telkom University, Jl. Telekomunikasi No. 1, Bandung', textX, doc.y + 2, {
                width: textWidth,
                align: textAlign
              });

            // Ensure y is below logo if logo is taller
            if (hasLogo && doc.y < startY + logoH + 4) {
              doc.y = startY + logoH + 4;
            }

            // Decorative Telkom University Double Line
            doc.moveDown(0.4);
            const lineY = doc.y;
            doc.moveTo(leftMargin, lineY).lineTo(rightMargin, lineY).strokeColor('#0f172a').lineWidth(1).stroke();
            doc.moveTo(leftMargin, lineY + 2).lineTo(rightMargin, lineY + 2).strokeColor('#0f172a').lineWidth(2).stroke();
            spaceAfter(0.8);
          }

          // ─── 2. JUDUL SURAT ──────────────────────────────────────────────
          else if (block.type === 'judul_surat') {
            const textAlign = style.textAlign || 'center';
            const fontSize = style.fontSize || 13;
            const isBold = style.fontWeight !== 'normal';

            doc.fontSize(fontSize).font(isBold ? 'Helvetica-Bold' : 'Helvetica')
              .fillColor(style.color || '#0f172a')
              .text(data.title || 'SURAT KETERANGAN RESMI', leftMargin, doc.y, {
                width: usableWidth,
                align: textAlign
              });

            if (data.nomor) {
              doc.fontSize(10).font('Helvetica')
                .fillColor('#334155')
                .text(`Nomor: ${data.nomor}`, leftMargin, doc.y + 2, {
                  width: usableWidth,
                  align: textAlign
                });
            }

            if (data.hal || data.lampiran) {
              const metaParts = [];
              if (data.hal) metaParts.push(`Hal: ${data.hal}`);
              if (data.lampiran) metaParts.push(`Lampiran: ${data.lampiran}`);
              doc.fontSize(9.5).font('Helvetica')
                .fillColor('#475569')
                .text(metaParts.join('     |     '), leftMargin, doc.y + 2, {
                  width: usableWidth,
                  align: textAlign
                });
            }

            spaceAfter(0.8);
          }

          // ─── 3. PARAGRAF TEKS ────────────────────────────────────────────
          else if (block.type === 'paragraf_teks') {
            const fontSize = style.fontSize || 11;
            const isBold = style.fontWeight === 'bold';
            const isItalic = style.fontStyle === 'italic';

            let fontName = 'Helvetica';
            if (isBold && isItalic) fontName = 'Helvetica-BoldOblique';
            else if (isBold) fontName = 'Helvetica-Bold';
            else if (isItalic) fontName = 'Helvetica-Oblique';

            const align = style.textAlign || 'justify';
            doc.fontSize(fontSize).font(fontName).fillColor(style.color || '#0f172a');
            // Samakan dengan line-height CSS editor (default 1.6): jarak baris = lineHeight × ukuran font,
            // dan baris pertama turun setengah "leading" seperti CSS.
            const lineBox = (style.lineHeight || 1.6) * fontSize;
            const lineGap = lineBox - doc.currentLineHeight(true);
            const halfLeading = (lineBox - (doc._font.ascender - doc._font.descender) / 1000 * fontSize) / 2;
            doc.y += halfLeading;
            renderTabbedText(doc, data.text || '', leftMargin, usableWidth, { align, lineGap, font: fontName, boldFont: isItalic ? 'Helvetica-BoldOblique' : 'Helvetica-Bold' });
            doc.y -= halfLeading;

            spaceAfter(0.6);
          }

          // ─── 4. TABEL DATA ───────────────────────────────────────────────
          else if (block.type === 'tabel_data') {
            const headers = data.headers || [];
            const rows = data.rows || [];

            if (data.tableTitle) {
              doc.fontSize(10).font('Helvetica-Bold')
                .fillColor('#0f172a')
                .text(data.tableTitle, leftMargin, doc.y, { width: usableWidth, align: 'left' });
              doc.moveDown(0.3);
            }

            if (headers.length > 0) {
              const colWidths = calculateColumnWidths(headers, data.colWidths, usableWidth);
              const paddingY = style.paddingY ?? 6;
              const paddingX = style.paddingX ?? 8;
              const tableFontSize = style.fontSize || 9.5;
              // Warna garis tabel bisa diatur (style.borderColor), default hitam
              const tableBorder = style.borderColor || '#000000';

              // Table Header Row
              const headerY = doc.y;
              let maxHeaderCellHeight = 22;

              // Pre-calculate header heights
              headers.forEach((h, i) => {
                const w = colWidths[i] - paddingX * 2;
                doc.fontSize(tableFontSize).font('Helvetica-Bold');
                const textH = doc.heightOfString(String(h || ''), { width: Math.max(10, w) });
                if (textH + paddingY * 2 > maxHeaderCellHeight) {
                  maxHeaderCellHeight = textH + paddingY * 2;
                }
              });

              // Background Fill for Header
              doc.rect(leftMargin, headerY, usableWidth, maxHeaderCellHeight)
                .fillColor('#f1f5f9')
                .fill();

              // Draw Header Text & Vertical Lines
              let curX = leftMargin;
              headers.forEach((h, i) => {
                const w = colWidths[i];
                // Border rect
                doc.rect(curX, headerY, w, maxHeaderCellHeight)
                  .strokeColor(tableBorder)
                  .lineWidth(0.8)
                  .stroke();

                doc.fontSize(tableFontSize).font('Helvetica-Bold')
                  .fillColor('#0f172a')
                  .text(String(h || ''), curX + paddingX, headerY + paddingY, {
                    width: w - paddingX * 2,
                    align: 'center'
                  });

                curX += w;
              });

              doc.y = headerY + maxHeaderCellHeight;

              // Data Rows
              rows.forEach((row, ri) => {
                let curRowY = doc.y;

                // Check if page overflow will occur, add page if needed
                if (curRowY > doc.page.height - doc.page.margins.bottom - 40) {
                  doc.addPage({ size: 'A4', layout: orientation, margins });
                  curRowY = doc.y;
                }

                // Calculate max height for this row
                // Default 28pt = nilai "Standar" di editor
                let maxRowH = Math.max(style.rowHeight || 28, 20);
                headers.forEach((_, ci) => {
                  const val = String(row[ci] || '');
                  const w = colWidths[ci] - paddingX * 2;
                  doc.fontSize(tableFontSize - 0.5).font('Helvetica');
                  const textH = doc.heightOfString(val, { width: Math.max(10, w) });
                  if (textH + paddingY * 2 > maxRowH) {
                    maxRowH = textH + paddingY * 2;
                  }
                });

                // Optional zebra striping
                if (ri % 2 === 1) {
                  doc.rect(leftMargin, curRowY, usableWidth, maxRowH)
                    .fillColor('#f8fafc')
                    .fill();
                }

                // Render Cells
                let cellX = leftMargin;
                headers.forEach((_, ci) => {
                  const w = colWidths[ci];
                  const val = String(row[ci] || '');

                  doc.rect(cellX, curRowY, w, maxRowH)
                    .strokeColor(tableBorder)
                    .lineWidth(0.6)
                    .stroke();

                  // Align column 1 center (often 'No'), others left
                  const cellAlign = ci === 0 && w < 45 ? 'center' : 'left';

                  doc.fontSize(tableFontSize - 0.5).font('Helvetica')
                    .fillColor('#334155')
                    .text(val, cellX + paddingX, curRowY + paddingY, {
                      width: w - paddingX * 2,
                      align: cellAlign
                    });

                  cellX += w;
                });

                doc.y = curRowY + maxRowH;
              });

              spaceAfter(0.8);
            }
          }

          // ─── 5. GARIS PEMBATAS ───────────────────────────────────────────
          else if (block.type === 'garis_pembatas') {
            const thickness = style.borderThickness || 1;
            const color = style.borderColor || '#cbd5e1';
            // Blok garis = 4pt + tebal garis + 4pt (sama dengan editor)
            const curY = doc.y + 4 + thickness / 2;

            // style.width (pt) = panjang garis dari margin kiri; default selebar halaman
            doc.moveTo(leftMargin, curY)
              .lineTo(style.width > 0 ? Math.min(rightMargin, leftMargin + style.width) : rightMargin, curY)
              .strokeColor(color)
              .lineWidth(thickness)
              .stroke();
            doc.y += 8 + thickness;

            spaceAfter(0);
          }

          // ─── 6. TANDA TANGAN ─────────────────────────────────────────────
          else if (block.type === 'tanda_tangan') {
            // Blok selebar 240pt diletakkan kiri/tengah/kanan; teks di dalamnya rata kiri
            // (rata tengah bila blok di tengah) — format baku tanda tangan surat dinas.
            const blockAlign = style.textAlign || 'right';
            const align = blockAlign === 'center' ? 'center' : 'left';
            const blockWidth = Math.min(usableWidth, style.width || SIGNATURE_BLOCK_WIDTH);
            const startX = blockAlign === 'center'
              ? leftMargin + (usableWidth - blockWidth) / 2
              : blockAlign === 'left' ? leftMargin : rightMargin - blockWidth;
            const fs = style.fontSize || 11;
            // Jarak baris 1.3 × ukuran font = line-height blok tanda tangan di editor
            const line = (text, font = 'Helvetica', extra = {}) => {
              doc.fontSize(fs).font(font).fillColor('#0f172a');
              doc.text(text, startX, doc.y, { width: blockWidth, align, lineGap: 1.3 * fs - doc.currentLineHeight(true), ...extra });
            };

            if (data.cityDate) line(data.cityDate);
            if (data.salutation) line(data.salutation);

            // Ruang tanda tangan selalu sama tinggi, ada gambar atau tidak
            // Tinggi gambar bisa diatur (style.signatureHeight); lebar maksimal selebar blok, rasio dijaga
            const sigW = blockWidth, sigH = style.signatureHeight || 56;
            const sigTop = doc.y + 4;
            if (data.signatureUrl) {
              const sigBuffer = await resolveImageBuffer(data.signatureUrl);
              if (sigBuffer) {
                const sigX = align === 'center' ? startX + (blockWidth - sigW) / 2 : startX;
                try { doc.image(sigBuffer, sigX, sigTop, { fit: [sigW, sigH], align: align === 'center' ? 'center' : 'left', valign: 'center' }); } catch (_) {}
              }
            }
            doc.y = sigTop + sigH + 4;

            // style.signatureLine: garis selebar blok di bawah nama (gaya sertifikat), bukan garis bawah teks
            line(data.name || 'Robbi Hendriyanto, S.T., M.T.', 'Helvetica-Bold', { underline: !style.signatureLine });
            if (style.signatureLine) {
              doc.moveTo(startX, doc.y).lineTo(startX + blockWidth, doc.y).strokeColor('#231f20').lineWidth(0.75).stroke();
              doc.y += 2;
            }
            if (data.nip) line(`NIP. ${data.nip}`);
            if (data.role) line(data.role);

            spaceAfter(0.8);
          }

          // ─── 7. SPASI KOSONG ─────────────────────────────────────────────
          else if (block.type === 'spasi_kosong') {
            const h = style.height || 24;
            doc.y += h;
          }
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
