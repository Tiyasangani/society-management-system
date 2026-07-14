/**
 * Seeds the database with a default admin user, a building and a few flats
 * so you can log in and test immediately after migrating.
 * Usage: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Building + flats
    const buildingRes = await client.query(
      `INSERT INTO buildings (name, total_floors) VALUES ($1, $2) RETURNING building_id`,
      ['Tower A', 10]
    );
    const buildingId = buildingRes.rows[0].building_id;

    const flatRes = await client.query(
      `INSERT INTO flats (building_id, flat_number, floor_number, area_sqft)
       VALUES ($1, '101', 1, 950) RETURNING flat_id`,
      [buildingId]
    );
    const flatId = flatRes.rows[0].flat_id;

    // Admin user
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id, flat_id)
       VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'admin'), NULL)
       ON CONFLICT (email) DO NOTHING`,
      ['System Admin', 'admin@society.com', '9999999999', adminPasswordHash]
    );

    // Sample resident
    const residentPasswordHash = await bcrypt.hash('Resident@123', 10);
    await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id, flat_id)
       VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'resident'), $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Ravi Sharma', 'resident@society.com', '9999999998', residentPasswordHash, flatId]
    );

    await client.query('COMMIT');
    console.log('✅ Seed data inserted.');
    console.log('   Admin login:    admin@society.com / Admin@123');
    console.log('   Resident login: resident@society.com / Resident@123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
