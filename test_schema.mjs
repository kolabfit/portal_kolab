import pool from './api/lib/db.js';
async function test() {
  const [repo] = await pool.execute('SHOW CREATE TABLE repo');
  console.log(repo[0]['Create Table']);
  const [cdn] = await pool.execute('SHOW CREATE TABLE cdn_assets');
  console.log(cdn[0]['Create Table']);
  process.exit(0);
}
test();
