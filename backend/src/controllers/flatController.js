const { query } = require('../config/db');

// GET /api/flats  (public-ish, used by registration form to pick a flat)
async function listFlats(req, res, next) {
  try {
    const result = await query(
      `SELECT f.flat_id, f.flat_number, f.floor_number, b.name AS building_name
       FROM flats f JOIN buildings b ON f.building_id = b.building_id
       ORDER BY b.name, f.flat_number`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/flats/buildings  (admin - used by the flats management screen)
async function listBuildings(req, res, next) {
  try {
    const result = await query(
      `SELECT b.building_id, b.name, b.total_floors,
              COUNT(f.flat_id)::int AS flat_count
       FROM buildings b
       LEFT JOIN flats f ON f.building_id = b.building_id
       GROUP BY b.building_id
       ORDER BY b.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/flats  (admin adds a building)
async function createBuilding(req, res, next) {
  try {
    const { name, totalFloors } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const result = await query(
      `INSERT INTO buildings (name, total_floors) VALUES ($1, $2) RETURNING building_id, name, total_floors`,
      [name, totalFloors || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/flats/units  (admin adds a flat to a building)
async function createFlat(req, res, next) {
  try {
    const { buildingId, flatNumber, floorNumber, areaSqft } = req.body;
    if (!buildingId || !flatNumber) {
      return res.status(400).json({ success: false, message: 'buildingId and flatNumber are required' });
    }
    const result = await query(
      `INSERT INTO flats (building_id, flat_number, floor_number, area_sqft)
       VALUES ($1, $2, $3, $4) RETURNING flat_id, flat_number, floor_number, area_sqft`,
      [buildingId, flatNumber, floorNumber || null, areaSqft || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFlats, listBuildings, createBuilding, createFlat };
