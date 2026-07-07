// Database connection. In normal (production) use this talks to the real
// cloud PostgreSQL database via DATABASE_URL. When USE_PGMEM=true it swaps
// in an in-memory Postgres-compatible engine instead, purely so the app can
// be exercised end-to-end without a live server — used for testing only.
const fs = require('fs');
const path = require('path');

let pool;

if (process.env.USE_PGMEM === 'true') {
  const { newDb } = require('pg-mem');
  const memDb = newDb({ autoCreateForeignKeyIndices: true });
  memDb.public.registerFunction({
    name: 'now',
    returns: 'timestamp',
    implementation: () => new Date(),
  });
  const { Pool } = memDb.adapters.createPg();
  pool = new Pool();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  pool.query(schema).catch(err => {
    console.error('Failed to initialise in-memory schema:', err);
  });
} else {
  const { Pool: PgPool } = require('pg');
  const useSsl = process.env.PGSSL !== 'false';
  pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
}

module.exports = pool;
