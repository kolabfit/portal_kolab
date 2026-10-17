import { migrateStartupPosition } from '../lib/startupPosition.js';
import db from '../lib/db.js';
import { internshipsSchema } from '../lib/internships.js';

export async function migrate() {
  await migrateStartupPosition(db);
  await db.execute(internshipsSchema);
  await db.execute(`CREATE TABLE IF NOT EXISTS workloads (
    id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, category VARCHAR(30) NOT NULL,
    description TEXT, start_date DATE, end_date DATE, status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    pic_id VARCHAR(50), pic_role VARCHAR(20), created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_workloads_category (category), INDEX idx_workloads_status (status),
    INDEX idx_workloads_pic (pic_id, pic_role), INDEX idx_workloads_dates (start_date, end_date)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS workload_members (
    id VARCHAR(50) PRIMARY KEY, workload_id VARCHAR(50) NOT NULL, member_id VARCHAR(50) NOT NULL,
    member_role VARCHAR(20) NOT NULL, job_desk VARCHAR(255), joined_at DATE, left_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_workload_member (workload_id, member_id, member_role),
    INDEX idx_workload_members_workload (workload_id), INDEX idx_workload_members_member (member_id, member_role)
  )`);
  await db.execute('CREATE TABLE IF NOT EXISTS file_blobs (repo_id VARCHAR(100) PRIMARY KEY, content LONGBLOB NOT NULL)');
  await db.execute('CREATE TABLE IF NOT EXISTS integration_results (id VARCHAR(36) PRIMARY KEY, action VARCHAR(100), user_id VARCHAR(50), request_data LONGTEXT, response_data LONGTEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');

  // Article Extension Migrations
  await db.execute(`CREATE TABLE IF NOT EXISTS article_tags (
    id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS article_tag_map (
    article_id VARCHAR(50) NOT NULL, tag_id VARCHAR(50) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, tag_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS article_attachments (
    id VARCHAR(50) PRIMARY KEY, article_id VARCHAR(50) NOT NULL, file_id VARCHAR(100) NOT NULL,
    original_name VARCHAR(255) NOT NULL, mime_type VARCHAR(100), size INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attachments_article (article_id)
  )`);
  
  // Create article_categories if not exists first (in case it wasn't created yet)
  await db.execute(`CREATE TABLE IF NOT EXISTS article_categories (
    id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL
  )`);

  const [catColumns] = await db.query('SHOW COLUMNS FROM article_categories');
  for (const [col, type] of Object.entries({ 
    slug: 'VARCHAR(100)', 
    description: 'TEXT', 
    is_active: 'BOOLEAN DEFAULT true', 
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' 
  })) {
    if (!catColumns.some(c => c.Field === col)) {
       await db.query(`ALTER TABLE article_categories ADD COLUMN ${col} ${type}`);
       // set slug if empty
       if (col === 'slug') await db.query("UPDATE article_categories SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL OR slug = ''");
    }
  }

  const [columns] = await db.query('SHOW COLUMNS FROM admins');
  for (const [column, type] of Object.entries({ name: 'VARCHAR(100)', email: 'VARCHAR(100)', avatar: 'TEXT', photo_id: 'TEXT' })) {
    if (!columns.some(c => c.Field === column)) await db.query(`ALTER TABLE admins ADD COLUMN ${column} ${type}`);
  }

  // Mitra Ko+Lab
  await db.execute(`CREATE TABLE IF NOT EXISTS mitras (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(30),
    description TEXT,
    head_name VARCHAR(100),
    logo TEXT,
    website TEXT,
    members TEXT,
    apps TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mitras_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);

  // CDN Asset Metadata table
  await db.execute(`CREATE TABLE IF NOT EXISTS cdn_assets (
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
  )`);

  // Add cdn_asset_id to repo table for CDN-backed files
  const [repoColumns] = await db.query('SHOW COLUMNS FROM repo');
  if (!repoColumns.some(c => c.Field === 'cdn_asset_id')) {
    await db.query("ALTER TABLE repo ADD COLUMN cdn_asset_id VARCHAR(50) NULL");
    await db.query("ALTER TABLE repo ADD COLUMN storage_provider VARCHAR(30) DEFAULT 'LEGACY'");
  }

  // Add cdn_asset_id to article_attachments
  const [attCdnColumns] = await db.query('SHOW COLUMNS FROM article_attachments');
  if (!attCdnColumns.some(c => c.Field === 'cdn_asset_id')) {
    await db.query("ALTER TABLE article_attachments ADD COLUMN cdn_asset_id VARCHAR(50) NULL");
    await db.query("ALTER TABLE article_attachments ADD COLUMN storage_provider VARCHAR(30) DEFAULT 'LEGACY'");
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/migrate.js')) {
  try { await migrate(); console.log('MySQL persistence migration completed. Existing records preserved.'); }
  finally { await db.end(); }
}
