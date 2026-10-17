/**
 * Letter Registry — Template Source of Truth
 *
 * Menghubungkan jenis surat dengan:
 * - file template asli (TIDAK boleh diubah)
 * - format file
 * - required fields yang harus tersedia sebelum rendering
 * - resolver key (data apa yang perlu difetch)
 * - renderer engine yang digunakan
 * - nama file output convention
 *
 * JANGAN menerima path template dari frontend.
 * Template hanya bisa dipilih dari registry ini.
 */

import path from 'node:path';
import { fileURLToPath } from 'url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * Folder template surat. Urutan: env LETTER_TEMPLATE_DIR, lalu api/template_surat (di dalam proyek,
 * ikut ter-deploy), lalu ../../../template_surat (susunan lokal lama: sejajar folder repo).
 * Folder yang belum ada TIDAK menghentikan server: login dan API lain tetap jalan, hanya
 * pembuatan surat yang gagal (lihat getTemplatePath).
 */
function resolveTemplateDir() {
  const candidates = [
    process.env.LETTER_TEMPLATE_DIR && path.resolve(process.env.LETTER_TEMPLATE_DIR),
    path.resolve(__dirname, '../template_surat'),
    path.resolve(__dirname, '../../../template_surat'),
  ].filter(Boolean);
  return candidates.find((dir) => fs.existsSync(dir)) || candidates[0];
}

export const TEMPLATE_DIR = resolveTemplateDir();

if (!fs.existsSync(TEMPLATE_DIR)) {
  console.warn(`[LetterRegistry] Template directory not found: ${TEMPLATE_DIR} (set LETTER_TEMPLATE_DIR or add api/template_surat). Pembuatan surat dinonaktifkan sampai folder tersedia.`);
}

/**
 * @typedef {Object} LetterDefinition
 * @property {string}   id          - ID unik jenis surat
 * @property {string}   label       - Label tampilan
 * @property {string}   filename    - Nama file template AKTUAL di TEMPLATE_DIR
 * @property {'docx'|'pdf'} format  - Format file template
 * @property {string}   renderer    - Engine yang dipakai: 'pdfkit' | 'docxtemplater'
 * @property {string[]} resolvers   - Data yang perlu di-resolve: 'internship', 'startup', 'event'
 * @property {string[]} required    - Required fields dari request body
 * @property {string[]} manual      - Field yang harus diisi manual (tidak bisa dari DB)
 * @property {string}   outputName  - Template nama file output (dapat berisi {tokens})
 */

/** @type {Record<string, LetterDefinition>} */
export const LETTER_REGISTRY = {
  'surat-keterangan': {
    id: 'surat-keterangan',
    label: 'Surat Keterangan Penerimaan Magang',
    filename: 'Surat Keterangan Penerimaan Magang Ko+Lab 2024.docx',
    format: 'docx',
    renderer: 'pdfkit',
    resolvers: ['internship_group'],
    required: ['startup_id', 'nomor_surat'],
    manual: ['nomor_surat', 'penandatangan_nip'],
    outputName: 'Surat_Keterangan_{startup}_{date}.pdf',
  },
  'surat-komitmen-magang': {
    id: 'surat-komitmen-magang',
    label: 'Surat Komitmen Magang',
    filename: 'SURAT KOMITMEN MAGANG 2024.docx',
    format: 'docx',
    renderer: 'pdfkit',
    resolvers: ['student'],
    required: ['student_nim'],
    manual: ['jurusan', 'kota_tanggal', 'penandatangan_nip'],
    outputName: 'Surat_Komitmen_{nim}_{date}.pdf',
  },
  'surat-pengantar': {
    id: 'surat-pengantar',
    label: 'Surat Pengantar Tim Startup',
    filename: 'SURAT-TIM-STARTUP-Sorgummi.docx',
    format: 'docx',
    renderer: 'pdfkit',
    resolvers: ['startup_members'],
    required: ['startup_id', 'nomor_surat'],
    manual: ['nomor_surat', 'penandatangan_nip'],
    outputName: 'Surat_Pengantar_{startup}_{date}.pdf',
  },
  'surat-undangan': {
    id: 'surat-undangan',
    label: 'Surat Undangan Kegiatan',
    filename: 'SURAT UNDANGAN KEGIATAN.docx',
    format: 'docx',
    renderer: 'pdfkit',
    resolvers: ['event_optional'],
    required: ['addressee_name', 'kegiatan_nama', 'kegiatan_tanggal', 'kegiatan_waktu', 'kegiatan_lokasi'],
    manual: ['nomor_surat', 'addressee_name', 'addressee_title', 'kegiatan_nama', 'kegiatan_tanggal', 'kegiatan_waktu', 'kegiatan_lokasi', 'penandatangan_nip'],
    outputName: 'Surat_Undangan_{date}.pdf',
  },
  'surat-rekognisi': {
    id: 'surat-rekognisi',
    label: 'Surat Rekognisi',
    filename: 'Surat-Rekognisi Innovillage.docx',
    format: 'docx',
    renderer: 'pdfkit',
    resolvers: ['startup_members_optional'],
    required: ['nomor_surat'],
    manual: ['nomor_surat', 'tujuan_surat', 'kegiatan_judul', 'mata_kuliah_list', 'mahasiswa_lolos', 'mahasiswa_seleksi', 'penandatangan_nip'],
    outputName: 'Surat_Rekognisi_{date}.pdf',
  },
  'surat-dispen': {
    id: 'surat-dispen',
    label: 'Surat Dispensasi',
    filename: 'Surat Dispensasi Ko+Lab Oodo Training.docx',
    format: 'docx',
    renderer: 'pdfkit',
    resolvers: ['students_manual'],
    required: ['nomor_surat', 'kegiatan_nama', 'kegiatan_tanggal', 'kelas'],
    manual: ['nomor_surat', 'hal', 'lampiran', 'tujuan_dosen', 'kegiatan_nama', 'kegiatan_tanggal', 'lokasi', 'kelas', 'prodi', 'agenda_list', 'penandatangan_nip'],
    outputName: 'Surat_Dispen_{date}.pdf',
  },
  'surat-sertifikat': {
    id: 'surat-sertifikat',
    label: 'Sertifikat',
    filename: 'Sertifikat idspora_3.pdf',
    format: 'pdf',
    renderer: 'pdf-lib',
    resolvers: ['student_cert'],
    required: ['student_nim', 'peran'],
    manual: ['peran', 'startup_id', 'tanggal_terbit', 'penandatangan_nip'],
    outputName: 'Sertifikat_{nim}_{date}.pdf',
  },
};

/**
 * Cari definisi surat berdasarkan ID.
 * @param {string} type
 * @returns {LetterDefinition}
 */
export function getLetter(type) {
  const def = LETTER_REGISTRY[type];
  if (!def) throw new Error(`Jenis surat tidak dikenal: ${type}`);
  return def;
}

/**
 * Dapatkan absolute path template dengan aman.
 * @param {LetterDefinition} def
 * @returns {string}
 */
export function getTemplatePath(def) {
  // Sanitasi: pastikan filename tidak mengandung path traversal
  const safe = path.basename(def.filename);
  const fullPath = path.join(TEMPLATE_DIR, safe);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Template tidak ditemukan: ${safe} (folder: ${TEMPLATE_DIR})`);
  }
  return fullPath;
}
