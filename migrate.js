// One-off script: creates the tables on your cloud database.
// Run with: node migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
  console.log('Schema applied successfully.');
  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
