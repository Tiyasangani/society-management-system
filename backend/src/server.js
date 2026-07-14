require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await pool.query('SELECT 1'); // fail fast if DB is unreachable
    app.listen(PORT, () => {
      console.log(`✅ Society Management System API running on http://localhost:${PORT}`);
      console.log(`   API docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('❌ Could not connect to PostgreSQL. Check your .env DB settings.', err.message);
    process.exit(1);
  }
}

start();
