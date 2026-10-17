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
import { resolveImageBuffer } from './signatureHelper.js';

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
      const margins = orientation === 'landscape'
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
        autoFirstPage: true
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

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

        const pageBlocks = blocksByPage.get(pageNum) || [];

        for (const block of pageBlocks) {
          const style = block.style || {};
          const data = block.data || {};

          // Margin Top
          if (style.marginTop && style.marginTop > 0) {
            doc.moveDown(style.marginTop / 18);
          }

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
            doc.moveDown(style.marginBottom ? style.marginBottom / 16 : 0.8);
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

            doc.moveDown(style.marginBottom ? style.marginBottom / 16 : 0.8);
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
            const lineGap = style.lineHeight ? Math.max(1, (style.lineHeight - 1) * 7) : 3;

            doc.fontSize(fontSize).font(fontName)
              .fillColor(style.color || '#0f172a')
              .text(data.text || '', leftMargin, doc.y, {
                width: usableWidth,
                align,
                lineGap
              });

            doc.moveDown(style.marginBottom ? style.marginBottom / 16 : 0.6);
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
                  .strokeColor('#cbd5e1')
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
                let maxRowH = Math.max(style.rowHeight || 20, 20);
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
                    .strokeColor('#e2e8f0')
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

              doc.moveDown(style.marginBottom ? style.marginBottom / 16 : 0.8);
            }
          }

          // ─── 5. GARIS PEMBATAS ───────────────────────────────────────────
          else if (block.type === 'garis_pembatas') {
            const thickness = style.borderThickness || 1;
            const color = style.borderColor || '#cbd5e1';
            const curY = doc.y + 4;

            doc.moveTo(leftMargin, curY)
              .lineTo(rightMargin, curY)
              .strokeColor(color)
              .lineWidth(thickness)
              .stroke();

            doc.moveDown(style.marginBottom ? style.marginBottom / 16 : 0.6);
          }

          // ─── 6. TANDA TANGAN ─────────────────────────────────────────────
          else if (block.type === 'tanda_tangan') {
            const textAlign = style.textAlign || 'right';
            const blockWidth = 240;
            const startX = textAlign === 'center'
              ? leftMargin + (usableWidth - blockWidth) / 2
              : textAlign === 'left'
                ? leftMargin
                : rightMargin - blockWidth;

            // City & Date
            if (data.cityDate) {
              doc.fontSize(10).font('Helvetica')
                .fillColor('#334155')
                .text(data.cityDate, startX, doc.y, { width: blockWidth, align: textAlign });
            }

            // Salutation / Role title
            if (data.salutation) {
              doc.fontSize(10).font('Helvetica-Bold')
                .fillColor('#0f172a')
                .text(data.salutation, startX, doc.y + 1, { width: blockWidth, align: textAlign });
            }

            doc.moveDown(0.2);

            // Digital Signature Image
            let signatureRendered = false;
            if (data.signatureUrl) {
              const sigBuffer = await resolveImageBuffer(data.signatureUrl);
              if (sigBuffer) {
                try {
                  const sigW = 110;
                  const sigH = 46;
                  const sigX = textAlign === 'center'
                    ? startX + (blockWidth - sigW) / 2
                    : textAlign === 'left'
                      ? startX
                      : startX + blockWidth - sigW;

                  doc.image(sigBuffer, sigX, doc.y, { fit: [sigW, sigH] });
                  doc.y += sigH + 4;
                  signatureRendered = true;
                } catch (_) {}
              }
            }

            if (!signatureRendered) {
              doc.moveDown(2.8); // spacing if no signature image
            }

            // Signer Name (Underlined)
            const signerName = data.name || 'Robbi Hendriyanto, S.T., M.T.';
            doc.fontSize(style.fontSize || 10.5).font('Helvetica-Bold')
              .fillColor('#0f172a')
              .text(signerName, startX, doc.y, {
                width: blockWidth,
                align: textAlign,
                underline: true
              });

            // NIP
            if (data.nip) {
              doc.fontSize(9).font('Helvetica')
                .fillColor('#475569')
                .text(`NIP: ${data.nip}`, startX, doc.y + 1, {
                  width: blockWidth,
                  align: textAlign
                });
            }

            // Role / Jabatan
            if (data.role) {
              doc.fontSize(9).font('Helvetica')
                .fillColor('#475569')
                .text(data.role, startX, doc.y + 1, {
                  width: blockWidth,
                  align: textAlign
                });
            }

            doc.moveDown(style.marginBottom ? style.marginBottom / 16 : 0.8);
          }

          // ─── 7. SPASI KOSONG ─────────────────────────────────────────────
          else if (block.type === 'spasi_kosong') {
            const h = style.height || 24;
            doc.y += h;
          }

          // Bottom Margin
          if (style.marginBottom && style.marginBottom > 0) {
            doc.moveDown(style.marginBottom / 25);
          }
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
