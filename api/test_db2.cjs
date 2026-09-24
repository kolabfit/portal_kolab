const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/laragon/www/portal_kolab/api/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portal_kolab',
    port: parseInt(process.env.DB_PORT || '3306')
  });
  
  const [rows] = await connection.execute(`SELECT id, name, website, ig, tiktok, linkedin FROM startup_teams WHERE name IN ('JagoAI', 'Kroombox')`);
  console.log(rows);
  process.exit(0);
}
check();
