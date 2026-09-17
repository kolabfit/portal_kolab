import db from '../lib/db.js';

export async function migrate() {
  await db.execute('CREATE TABLE IF NOT EXISTS file_blobs (repo_id VARCHAR(100) PRIMARY KEY, content LONGBLOB NOT NULL)');
  await db.execute('CREATE TABLE IF NOT EXISTS integration_results (id VARCHAR(36) PRIMARY KEY, action VARCHAR(100), user_id VARCHAR(50), request_data LONGTEXT, response_data LONGTEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  const [columns] = await db.query('SHOW COLUMNS FROM admins');
  for (const [column, type] of Object.entries({ name: 'VARCHAR(100)', email: 'VARCHAR(100)', avatar: 'TEXT', photo_id: 'TEXT' })) {
    if (!columns.some(c => c.Field === column)) await db.query(`ALTER TABLE admins ADD COLUMN ${column} ${type}`);
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/migrate.js')) {
  try { await migrate(); console.log('MySQL persistence migration completed. Existing records preserved.'); }
  finally { await db.end(); }
}
