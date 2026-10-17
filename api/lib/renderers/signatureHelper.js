/**
 * Helper to resolve and render digital signature images in PDFKit documents.
 */

import axios from 'axios';

/**
 * Resolves an image input (base64 data URL, raw base64, or HTTP/HTTPS URL)
 * into a Buffer suitable for PDFKit doc.image().
 * Returns null if not provided or if loading fails.
 *
 * @param {string} imgInput
 * @returns {Promise<Buffer|null>}
 */
export async function resolveImageBuffer(imgInput) {
  if (!imgInput || typeof imgInput !== 'string') return null;
  const trimmed = imgInput.trim();
  if (!trimmed) return null;

  try {
    // 1. Data URL (e.g. data:image/png;base64,iVBORw0KGgo...)
    if (trimmed.startsWith('data:image/')) {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        const base64Data = trimmed.slice(commaIdx + 1);
        return Buffer.from(base64Data, 'base64');
      }
    }

    // 2. Direct base64 string without data prefix
    if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100) {
      return Buffer.from(trimmed, 'base64');
    }

    // 3. Remote URL (CDN or API)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const resp = await axios.get(trimmed, {
        responseType: 'arraybuffer',
        timeout: 5000,
        maxContentLength: 8 * 1024 * 1024
      });
      return Buffer.from(resp.data);
    }
  } catch (err) {
    console.warn('[signatureHelper] Failed to load signature image:', err.message);
  }
  return null;
}

/**
 * Safely renders a signature in PDFKit:
 * If signature buffer is available, draws image scaled and positioned.
 * If not, falls back to spacing (doc.moveDown) so layout is preserved.
 *
 * @param {object} doc - PDFDocument instance
 * @param {Buffer|null} imgBuffer - Image buffer
 * @param {object} options - { align: 'right'|'left'|'center', width: number, height: number, fallbackMoveDown: number }
 */
export function drawSignatureOrSpacer(doc, imgBuffer, options = {}) {
  const { align = 'right', width = 110, height = 48, fallbackMoveDown = 3 } = options;
  if (!imgBuffer) {
    doc.moveDown(fallbackMoveDown);
    return;
  }

  try {
    const pageWidth = doc.page.width;
    const margins = doc.page.margins;
    let x = margins.left;
    if (align === 'right') {
      x = pageWidth - margins.right - width;
    } else if (align === 'center') {
      x = margins.left + (pageWidth - margins.left - margins.right - width) / 2;
    }

    const y = doc.y;
    doc.image(imgBuffer, x, y, { fit: [width, height], align: 'center' });
    doc.y = y + height + 6;
  } catch (err) {
    console.warn('[signatureHelper] Error drawing signature image to PDF:', err.message);
    doc.moveDown(fallbackMoveDown);
  }
}
