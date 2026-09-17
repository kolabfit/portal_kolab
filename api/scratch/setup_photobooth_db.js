import db from '../lib/db.js';

async function setup() {
  try {
    console.log('Creating photobooth_settings table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS photobooth_settings (
        category VARCHAR(50) PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table photobooth_settings created successfully or already exists.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

setup();
