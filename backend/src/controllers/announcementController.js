const { query } = require('../config/db');
const { logAction } = require('../utils/auditLogger');

// POST /api/announcements  (admin, or committee member with can_publish_notices)
async function createAnnouncement(req, res, next) {
  try {
    if (req.user.role_name === 'committee') {
      const perm = await query(
        `SELECT can_publish_notices FROM committee_members WHERE user_id = $1`,
        [req.user.user_id]
      );
      if (perm.rows.length === 0 || !perm.rows[0].can_publish_notices) {
        return res.status(403).json({ success: false, message: 'You do not have permission to publish notices' });
      }
    }

    const { title, content, isUrgent, expiresAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'title and content are required' });
    }

    const result = await query(
      `INSERT INTO announcements (title, content, posted_by, is_urgent, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING announcement_id, title, is_urgent, created_at, expires_at`,
      [title, content, req.user.user_id, !!isUrgent, expiresAt || null]
    );

    await logAction({ userId: req.user.user_id, action: 'CREATE_ANNOUNCEMENT', entityType: 'announcement', entityId: result.rows[0].announcement_id, ipAddress: req.ip });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/announcements?page=&limit=
async function listAnnouncements(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT a.announcement_id, a.title, a.content, a.is_urgent, a.created_at, a.expires_at,
              u.full_name AS posted_by_name
       FROM announcements a
       JOIN users u ON a.posted_by = u.user_id
       WHERE a.expires_at IS NULL OR a.expires_at > NOW()
       ORDER BY a.is_urgent DESC, a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/announcements/:id
async function deleteAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(`DELETE FROM announcements WHERE announcement_id = $1 RETURNING announcement_id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    await logAction({ userId: req.user.user_id, action: 'DELETE_ANNOUNCEMENT', entityType: 'announcement', entityId: id, ipAddress: req.ip });
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createAnnouncement, listAnnouncements, deleteAnnouncement };
