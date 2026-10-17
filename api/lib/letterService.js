/**
 * Letter Service — Orchestrator
 *
 * Mengatur alur lengkap:
 *   Validate type → Validate fields → Resolve data → Select renderer → Return PDF buffer
 *
 * Tidak ada logika bisnis di route handler.
 * Semua validasi terpusat di sini.
 */

import { getLetter, getTemplatePath } from './letterRegistry.js';
import { resolveData } from './letterResolver.js';
import { renderSuratKeterangan } from './renderers/suratKeterangan.js';
import { renderSuratPengantar } from './renderers/suratPengantar.js';
import { renderSuratDispensasi } from './renderers/suratDispensasi.js';
import { renderSuratRekognisi } from './renderers/suratRekognisi.js';
import { renderSuratUndangan } from './renderers/suratUndangan.js';
import { renderSuratKomitmenMagang } from './renderers/suratKomitmenMagang.js';
import { renderSuratSertifikat } from './renderers/suratSertifikat.js';
import { renderDynamicBlocksToPdf } from './renderers/dynamicBlockRenderer.js';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Validasi required fields dari request
 * @param {string[]} required - Field wajib menurut registry
 * @param {object}  body     - Request body dari user
 */
function validateFields(required, body) {
  const missing = required.filter((f) => {
    const v = body[f];
    if (v === undefined || v === null || v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });
  if (missing.length > 0) {
    throw Object.assign(new Error(`Field wajib tidak lengkap: ${missing.join(', ')}`), { status: 400 });
  }
}

/**
 * Route-agnostic letter generation
 *
 * @param {string}  letterType  - ID dari letter registry
 * @param {object}  body        - Validated request body (dari route handler)
 * @param {object}  user        - Authenticated user dari req.user
 * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
 */
export async function generateLetter(letterType, body, user) {
  // 1. Cari definisi surat jika terdaftar di registry
  let def = null;
  try {
    def = getLetter(letterType);
  } catch (err) {
    // Jika tidak ada di registry tapi membawa dynamic blocks (misal: template kustom), izinkan rendering dinamis
    if (!Array.isArray(body?.blocks) || body.blocks.length === 0) {
      throw err;
    }
  }

  // 1.5. Jika terdapat dynamic blocks dari visual editor / modifikasi pengguna
  if (Array.isArray(body?.blocks) && body.blocks.length > 0) {
    const orientation = body.paperOrientation || (def?.isLandscape ? 'landscape' : 'portrait');
    const pagesCount = Number(body.pagesCount) || 1;
    const buffer = await renderDynamicBlocksToPdf(body.blocks, {
      orientation,
      pagesCount,
      letterType: def?.id || letterType,
      letterTitle: def?.label || def?.title || body?.title || 'Dokumen Resmi Ko+Lab'
    });

    const dateSuffix = new Date().toISOString().slice(0, 10);
    const safeId = letterType.replace(/[^a-z0-9-]/gi, '_');
    const safeTag = (body.nomor_surat || 'kolab').replace(/[^a-z0-9]/gi, '_').slice(0, 30);
    const filename = `${safeId}_${safeTag}_${dateSuffix}.pdf`;

    return { buffer, filename, contentType: 'application/pdf' };
  }

  // 2. Validasi required fields (fallback template bawaan)
  validateFields(def.required, body);

  // 3. Resolve data dari database
  const data = await resolveData(def.resolvers, body);

  // 4. Kumpulkan manual fields (field yang tidak dari DB)
  const manual = { ...body };
  def.manual.forEach((f) => {
    if (manual[f] === undefined) manual[f] = body[f] ?? '';
  });

  // 5. Pilih renderer
  let buffer;
  const contentType = 'application/pdf';
  let ext = 'pdf';

  switch (def.id) {
    case 'surat-keterangan':
      buffer = await renderSuratKeterangan(data, manual);
      break;

    case 'surat-pengantar':
      buffer = await renderSuratPengantar(data, manual);
      break;

    case 'surat-dispen':
      buffer = await renderSuratDispensasi(data, manual);
      break;

    case 'surat-rekognisi':
      buffer = await renderSuratRekognisi(data, manual);
      break;

    case 'surat-undangan':
      buffer = await renderSuratUndangan(data, manual);
      break;

    case 'surat-komitmen-magang':
      buffer = await renderSuratKomitmenMagang(data, manual);
      break;

    case 'surat-sertifikat':
      buffer = await renderSuratSertifikat(data, manual);
      break;

    default:
      throw Object.assign(
        new Error(`Generator untuk "${def.label}" belum diimplementasikan.`),
        { status: 501 }
      );
  }

  // 6. Generate filename yang aman
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const safeId = letterType.replace(/[^a-z0-9-]/gi, '_');
  const safeTag = (data.startup_name || data.student?.nim || 'kolab')
    .replace(/[^a-z0-9]/gi, '_')
    .slice(0, 30);
  const filename = `${safeId}_${safeTag}_${dateSuffix}.${ext}`;

  return { buffer, filename, contentType };
}
