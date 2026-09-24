import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './api/.env' });

const db = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'portal_kolab'
});

const cdnAssetsSQL = `CREATE TABLE IF NOT EXISTS cdn_assets (
  id VARCHAR(50) PRIMARY KEY,
  cdn_file_id VARCHAR(255),
  owner_id VARCHAR(100),
  owner_role VARCHAR(20),
  feature_type VARCHAR(50),
  feature_id VARCHAR(100),
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT DEFAULT 0,
  cdn_delivery_url TEXT,
  cdn_status VARCHAR(30) DEFAULT 'PENDING',
  is_private BOOLEAN DEFAULT false,
  storage_provider VARCHAR(30) DEFAULT 'KROOMBOX_CDN',
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_cdn_assets_owner (owner_id, owner_role),
  INDEX idx_cdn_assets_feature (feature_type, feature_id),
  INDEX idx_cdn_assets_status (cdn_status)
)`;

await db.execute(cdnAssetsSQL);
console.log('cdn_assets table ready');

const [repoColumns] = await db.query('SHOW COLUMNS FROM repo');
if (!repoColumns.some(c => c.Field === 'cdn_asset_id')) {
  await db.query("ALTER TABLE repo ADD COLUMN cdn_asset_id VARCHAR(50) NULL");
  await db.query("ALTER TABLE repo ADD COLUMN storage_provider VARCHAR(30) DEFAULT 'LEGACY'");
  console.log('repo cdn columns added');
} else {
  console.log('repo cdn columns already exist');
}

const [attCols] = await db.query('SHOW COLUMNS FROM article_attachments');
if (!attCols.some(c => c.Field === 'cdn_asset_id')) {
  await db.query("ALTER TABLE article_attachments ADD COLUMN cdn_asset_id VARCHAR(50) NULL");
  await db.query("ALTER TABLE article_attachments ADD COLUMN storage_provider VARCHAR(30) DEFAULT 'LEGACY'");
  console.log('article_attachments cdn columns added');
} else {
  console.log('article_attachments cdn columns already exist');
}

console.log('All CDN migrations complete');
await db.end();
