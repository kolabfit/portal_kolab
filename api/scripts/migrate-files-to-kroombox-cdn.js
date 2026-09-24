/**
 * migrate-files-to-kroombox-cdn.js
 * Migrates legacy file_blobs binary files to Kroombox CDN.
 *
 * Usage:
 *   npm run migrate:cdn -- --dry-run   (scan without uploading)
 *   npm run migrate:cdn                (actual migration)
 *   npm run migrate:cdn -- --limit 50  (migrate 50 files)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx !== -1 ? parseInt(process.argv[idx + 1]) || 100 : 1000;
})();

// CDN import
const cdnModule = await import('../lib/kroomboxCdn.js');
const cdn = cdnModule;

const pool = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'portal_kolab'
});

const report = {
  total: 0,
  migrated: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

console.log('='.repeat(60));
console.log('KROOMBOX CDN MIGRATION SCRIPT');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no uploads)' : 'LIVE'}`);
console.log(`Limit: ${LIMIT}`);
console.log('='.repeat(60));

try {
  // Step 1: Count total legacy files in repo
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM repo r JOIN file_blobs b ON b.repo_id=r.id WHERE (r.storage_provider IS NULL OR r.storage_provider = 'LEGACY') AND r.type='FILE'"
  );
  report.total = Number(total);
  console.log(`\nLegacy files found: ${report.total}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Scanning files...');
    const [rows] = await pool.execute(
      `SELECT r.id, r.name, r.mime, b.content
       FROM repo r
       JOIN file_blobs b ON b.repo_id=r.id
       WHERE (r.storage_provider IS NULL OR r.storage_provider='LEGACY')
       AND r.type='FILE'
       LIMIT ?`,
      [LIMIT]
    );

    for (const row of rows) {
      const sizeKB = row.content?.length ? Math.round(row.content.length / 1024) : 0;
      console.log(`  [PENDING] ${row.name} (${sizeKB} KB) — ${row.mime}`);
      report.skipped++;
    }
    console.log(`\n[DRY RUN] Would migrate ${rows.length} files (no upload performed).`);
  } else {
    console.log('\n[LIVE] Starting migration...');
    const [rows] = await pool.execute(
      `SELECT r.id, r.name, r.mime, r.owner_id, r.role, b.content
       FROM repo r
       JOIN file_blobs b ON b.repo_id=r.id
       WHERE (r.storage_provider IS NULL OR r.storage_provider='LEGACY')
       AND r.type='FILE'
       AND r.cdn_asset_id IS NULL
       LIMIT ?`,
      [LIMIT]
    );

    for (const row of rows) {
      try {
        process.stdout.write(`  Migrating: ${row.name} (${Math.round(row.content.length / 1024)} KB)... `);

        // Upload to CDN
        const cdnResult = await cdn.uploadFile(row.content, row.name, row.mime, {
          featureType: 'REPOSITORY_FILE'
        });

        const fileId = cdnResult.fileId;
        const deliveryUrl = cdnResult.deliveryUrl;
        const cdnStatus = cdnResult.status || 'PROCESSING';

        // Save CDN asset record
        const assetId = crypto.randomUUID();
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.execute(
            `INSERT INTO cdn_assets (id, cdn_file_id, owner_id, owner_role, feature_type, feature_id,
              original_name, mime_type, file_size, cdn_delivery_url, cdn_status, is_private, storage_provider, created_by)
             VALUES (?, ?, ?, ?, 'REPOSITORY_FILE', ?, ?, ?, ?, ?, ?, true, 'KROOMBOX_CDN', 'MIGRATION')`,
            [assetId, fileId, row.owner_id, row.role, row.id, row.name, row.mime, row.content.length, deliveryUrl, cdnStatus]
          );

          // Update repo row
          const newUrl = `${(process.env.PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/files/${row.id}`;
          await conn.execute(
            "UPDATE repo SET cdn_asset_id=?, storage_provider='KROOMBOX_CDN' WHERE id=?",
            [fileId, row.id]
          );

          await conn.commit();
          console.log(`MIGRATED (cdn: ${fileId})`);
          report.migrated++;
        } catch (dbErr) {
          await conn.rollback();
          throw dbErr;
        } finally {
          conn.release();
        }
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
        report.failed++;
        report.errors.push({ repoId: row.id, filename: row.name, reason: err.message });
      }
    }
  }
} catch (err) {
  console.error('\nMigration error:', err.message);
}

// Final report
console.log('\n' + '='.repeat(60));
console.log('KROOMBOX CDN MIGRATION REPORT');
console.log('='.repeat(60));
console.log(`Total Legacy Files : ${report.total}`);
console.log(`Migrated           : ${report.migrated}`);
console.log(`Failed             : ${report.failed}`);
console.log(`Skipped (dry-run)  : ${report.skipped}`);

if (report.errors.length > 0) {
  console.log('\nFailed files:');
  console.log('repoId | filename | reason');
  for (const e of report.errors) {
    console.log(`  ${e.repoId} | ${e.filename} | ${e.reason}`);
  }
}

await pool.end();
