import crypto from 'node:crypto';
import db from '../lib/db.js';

try {
  const [admins] = await db.execute('SELECT username FROM admins LIMIT 1');
  if (admins.length > 0) {
    console.log('Admin already exists; seed skipped. Existing credentials are unchanged.');
  } else {
    // Some application features refer to the administrator as hrkolab.
    const username = 'hrkolab';
    const password = process.env.ADMIN_SEED_PASSWORD || crypto.randomBytes(18).toString('base64url');
    if (password.length < 12) {
      throw new Error('ADMIN_SEED_PASSWORD must contain at least 12 characters.');
    }
    // Match the password format used by routes/auth.js.
    const hashed = crypto.createHash('sha256').update(password).digest('hex');
    await db.execute('INSERT INTO admins (username, password) VALUES (?, ?)', [username, hashed]);
    console.log('Admin created successfully. Save these credentials:');
    console.log('Username: ' + username);
    console.log('Password: ' + password);
  }
} catch (error) {
  console.error('Admin seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}

