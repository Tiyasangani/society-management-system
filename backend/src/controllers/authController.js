const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { logAction } = require('../utils/auditLogger');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register  (self-registration is for residents only; admin creates committee/admin via /api/residents or /api/committee)
async function register(req, res, next) {
  try {
    const { fullName, email, phone, password, flatId } = req.body;

    if (!fullName || !email || !password || !flatId) {
      return res.status(400).json({ success: false, message: 'fullName, email, password and flatId are required' });
    }

    const existing = await query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id, flat_id)
       VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'resident'), $5)
       RETURNING user_id, full_name, email, phone, flat_id`,
      [fullName, email, phone || null, passwordHash, flatId]
    );

    const user = { ...result.rows[0], role_name: 'resident' };
    const token = generateToken(user.user_id);

    await logAction({ userId: user.user_id, action: 'REGISTER', entityType: 'user', entityId: user.user_id, ipAddress: req.ip });

    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.password_hash, u.is_active, u.flat_id, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user.user_id);
    delete user.password_hash;

    await logAction({ userId: user.user_id, action: 'LOGIN', entityType: 'user', entityId: user.user_id, ipAddress: req.ip });

    res.json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getProfile(req, res, next) {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/auth/me  (any authenticated user updates their own name/phone, and optionally password)
async function updateProfile(req, res, next) {
  try {
    const { fullName, phone, currentPassword, newPassword } = req.body;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'currentPassword is required to set a new password' });
      }
      const current = await query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
      const match = await bcrypt.compare(currentPassword, current.rows[0].password_hash);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      }
      const newHash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, req.user.user_id]);
    }

    const result = await query(
      `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone)
       WHERE user_id = $3
       RETURNING user_id, full_name, email, phone, flat_id`,
      [fullName || null, phone || null, req.user.user_id]
    );

    const user = { ...result.rows[0], role_name: req.user.role_name };

    await logAction({ userId: req.user.user_id, action: 'UPDATE_PROFILE', entityType: 'user', entityId: req.user.user_id, ipAddress: req.ip });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getProfile, updateProfile };
