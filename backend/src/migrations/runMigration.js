/**
 * Runs 001_schema.sql against the configured PostgreSQL database.
 * Usage: npm run migrate
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { pool } = require('../config/db');

async function runMigration() {
  const sqlPath = path.join(__dirname, '001_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Running migration: 001_schema.sql ...');
    await client.query(sql);
    console.log('✅ Migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
