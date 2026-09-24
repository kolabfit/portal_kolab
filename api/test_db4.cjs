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
  
  const [rows] = await connection.execute(`
    SELECT t.id,t.name,t.logo,t.website,t.ig,t.tiktok,t.linkedin,s.nim,s.name AS student_name,s.startup_position
    FROM startup_teams t LEFT JOIN students s ON s.startup_id=t.id AND s.type='STARTUP'
    WHERE t.name = 'Kroombox'
  `);
  console.log(rows);
  process.exit(0);
}
check();
