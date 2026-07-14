const { pool, query } = require('../config/db');
const { logAction } = require('../utils/auditLogger');

// POST /api/complaints  (resident raises a complaint, multipart/form-data, field name "images")
async function createComplaint(req, res, next) {
  const { categoryId, title, description, priority } = req.body;
  if (!categoryId || !title || !description) {
    return res.status(400).json({ success: false, message: 'categoryId, title, description are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const complaintResult = await client.query(
      `INSERT INTO complaints (raised_by, category_id, title, description, priority)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'medium'))
       RETURNING complaint_id, status, created_at`,
      [req.user.user_id, categoryId, title, description, priority]
    );
    const complaint = complaintResult.rows[0];

    const files = req.files || [];
    for (const file of files) {
      await client.query(
        `INSERT INTO complaint_images (complaint_id, file_path) VALUES ($1, $2)`,
        [complaint.complaint_id, `/uploads/complaints/${file.filename}`]
      );
    }

    await client.query(
      `INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
       VALUES ($1, NULL, 'open', $2, 'Complaint created')`,
      [complaint.complaint_id, req.user.user_id]
    );

    await client.query('COMMIT');
    await logAction({ userId: req.user.user_id, action: 'CREATE_COMPLAINT', entityType: 'complaint', entityId: complaint.complaint_id, ipAddress: req.ip });

    res.status(201).json({ success: true, data: { ...complaint, imagesUploaded: files.length } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/complaints?status=&page=&limit=
// Residents see only their own; admin/committee see all (with filters)
async function listComplaints(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (req.user.role_name === 'resident') {
      params.push(req.user.user_id);
      conditions.push(`c.raised_by = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT c.complaint_id, c.title, c.description, c.status, c.priority, c.created_at, c.resolved_at,
              cat.name AS category, u.full_name AS raised_by_name,
              assignee.full_name AS assigned_to_name,
              COALESCE(json_agg(ci.file_path) FILTER (WHERE ci.file_path IS NOT NULL), '[]') AS images
       FROM complaints c
       JOIN complaint_categories cat ON c.category_id = cat.category_id
       JOIN users u ON c.raised_by = u.user_id
       LEFT JOIN users assignee ON c.assigned_to = assignee.user_id
       LEFT JOIN complaint_images ci ON ci.complaint_id = c.complaint_id
       ${whereClause}
       GROUP BY c.complaint_id, cat.name, u.full_name, assignee.full_name
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/complaints/:id/status  (committee/admin updates status)
async function updateComplaintStatus(req, res, next) {
  const { id } = req.params;
  const { status, remarks, assignedTo } = req.body;

  const allowed = ['open', 'in_progress', 'resolved', 'rejected'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of ${allowed.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await client.query('SELECT status FROM complaints WHERE complaint_id = $1', [id]);
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    const oldStatus = current.rows[0].status;

    const updateResult = await client.query(
      `UPDATE complaints SET status = $1::varchar, assigned_to = COALESCE($2::uuid, assigned_to),
              resolved_at = CASE WHEN $1::varchar = 'resolved' THEN NOW() ELSE resolved_at END
       WHERE complaint_id = $3::integer
       RETURNING complaint_id, status, assigned_to, resolved_at`,
      [status, assignedTo || null, id]
    );

    await client.query(
      `INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, oldStatus, status, req.user.user_id, remarks || null]
    );

    await client.query('COMMIT');
    await logAction({ userId: req.user.user_id, action: 'UPDATE_COMPLAINT_STATUS', entityType: 'complaint', entityId: id, details: { oldStatus, status }, ipAddress: req.ip });

    res.json({ success: true, data: updateResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/complaints/:id/history
async function getComplaintHistory(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT h.history_id, h.old_status, h.new_status, h.remarks, h.changed_at, u.full_name AS changed_by
       FROM complaint_status_history h
       JOIN users u ON h.changed_by = u.user_id
       WHERE h.complaint_id = $1
       ORDER BY h.changed_at ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { createComplaint, listComplaints, updateComplaintStatus, getComplaintHistory };
