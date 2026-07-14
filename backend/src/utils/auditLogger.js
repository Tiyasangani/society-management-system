const { query } = require('../config/db');

/**
 * Writes an entry to audit_logs. Never throws - logging failures
 * should not break the main request flow.
 */
async function logAction({ userId, action, entityType, entityId, details, ipAddress }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null, ipAddress || null]
    );
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { logAction };
