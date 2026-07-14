const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { logAction } = require('../utils/auditLogger');

// GET /api/residents?search=&page=&limit=
async function listResidents(req, res, next) {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.is_active, u.created_at,
              f.flat_number, b.name AS building_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN flats f ON u.flat_id = f.flat_id
       LEFT JOIN buildings b ON f.building_id = b.building_id
       WHERE r.role_name = 'resident'
         AND (u.full_name ILIKE $1 OR u.email ILIKE $1 OR f.flat_number ILIKE $1)
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role_name = 'resident'`
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { page: Number(page), limit: Number(limit), total: Number(countResult.rows[0].count) },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/residents  (admin creates a resident)
async function createResident(req, res, next) {
  try {
    const { fullName, email, phone, password, flatId } = req.body;
    if (!fullName || !email || !password || !flatId) {
      return res.status(400).json({ success: false, message: 'fullName, email, password, flatId required' });
    }

    const existing = await query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id, flat_id)
       VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'resident'), $5)
       RETURNING user_id, full_name, email, phone, flat_id, created_at`,
      [fullName, email, phone || null, passwordHash, flatId]
    );

    await logAction({ userId: req.user.user_id, action: 'CREATE_RESIDENT', entityType: 'user', entityId: result.rows[0].user_id, ipAddress: req.ip });

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/residents/:id
async function updateResident(req, res, next) {
  try {
    const { id } = req.params;
    const { fullName, phone, flatId, isActive } = req.body;

    const result = await query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         flat_id = COALESCE($3, flat_id),
         is_active = COALESCE($4, is_active)
       WHERE user_id = $5
       RETURNING user_id, full_name, email, phone, flat_id, is_active`,
      [fullName, phone, flatId, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    await logAction({ userId: req.user.user_id, action: 'UPDATE_RESIDENT', entityType: 'user', entityId: id, ipAddress: req.ip });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/residents/:id  (soft delete)
async function deactivateResident(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE users SET is_active = FALSE WHERE user_id = $1 RETURNING user_id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }
    await logAction({ userId: req.user.user_id, action: 'DEACTIVATE_RESIDENT', entityType: 'user', entityId: id, ipAddress: req.ip });
    res.json({ success: true, message: 'Resident deactivated' });
  } catch (err) {
    next(err);
  }
}

// ---------------- Committee members ----------------

// GET /api/committee
async function listCommittee(req, res, next) {
  try {
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.is_active,
              cm.designation, cm.can_publish_notices, cm.assigned_date
       FROM committee_members cm
       JOIN users u ON cm.user_id = u.user_id
       ORDER BY cm.assigned_date DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/committee  (admin appoints a committee member)
async function createCommitteeMember(req, res, next) {
  const { fullName, email, phone, password, designation, canPublishNotices } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: 'fullName, email, password required' });
  }

  const { pool } = require('../config/db');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id)
       VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'committee'))
       RETURNING user_id, full_name, email, phone`,
      [fullName, email, phone || null, passwordHash]
    );
    const user = userResult.rows[0];

    const cmResult = await client.query(
      `INSERT INTO committee_members (user_id, designation, can_publish_notices)
       VALUES ($1, $2, $3) RETURNING committee_member_id, designation, can_publish_notices`,
      [user.user_id, designation || 'Committee Member', !!canPublishNotices]
    );

    await client.query('COMMIT');
    await logAction({ userId: req.user.user_id, action: 'CREATE_COMMITTEE_MEMBER', entityType: 'user', entityId: user.user_id, ipAddress: req.ip });

    res.status(201).json({ success: true, data: { ...user, ...cmResult.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  listResidents,
  createResident,
  updateResident,
  deactivateResident,
  listCommittee,
  createCommitteeMember,
};
