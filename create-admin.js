// One-time bootstrap: creates the first admin account directly, typed at
// the terminal — no email needed for this step since there's no admin yet
// to send one from. Run with: node create-admin.js
//
// Note: the password is typed in plain view here (not hidden) to keep this
// script simple and reliable across terminals. Make sure no one's looking
// over your shoulder, and clear your terminal scrollback afterwards if
// you're on a shared machine.
require('dotenv').config();
const readline = require('readline');
const pool = require('./db');
const { hashPassword, isValidPassword } = require('./password');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('=== Create the first admin account ===\n');
  const email = (await ask('Email address: ')).trim().toLowerCase();
  const fullName = (await ask('Full name: ')).trim();
  const password = await ask('Password (min 8 characters): ');

  if (!email.includes('@')) {
    console.error('That does not look like a valid email address.');
    rl.close();
    process.exit(1);
  }
  if (!fullName) {
    console.error('Full name is required.');
    rl.close();
    process.exit(1);
  }
  if (!isValidPassword(password)) {
    console.error('Password must be at least 8 characters.');
    rl.close();
    process.exit(1);
  }

  const existing = await pool.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
  if (existing.rows.length) {
    console.error(`An account with ${email} already exists. If you meant to reset its password, use "Forgot password" on the dashboard instead.`);
    rl.close();
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await pool.query(
    `INSERT INTO users (email, password_hash, role, full_name, is_active, email_verified)
     VALUES ($1, $2, 'admin', $3, true, true)`,
    [email, passwordHash, fullName]
  );

  console.log(`\nAdmin account created for ${email}. You can now log in at /dashboard.html.`);
  rl.close();
  await pool.end();
}

main().catch(err => {
  console.error('Failed to create admin account:', err.message);
  process.exit(1);
});
