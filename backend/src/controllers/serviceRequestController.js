const { query } = require('../config/db');
const { logAction } = require('../utils/auditLogger');

// POST /api/service-requests
async function createServiceRequest(req, res, next) {
  try {
    const { serviceType, description, preferredDate } = req.body;
    if (!serviceType) {
      return res.status(400).json({ success: false, message: 'serviceType is required' });
    }

    const result = await query(
      `INSERT INTO service_requests (requested_by, service_type, description, preferred_date)
       VALUES ($1, $2, $3, $4)
       RETURNING request_id, status, created_at`,
      [req.user.user_id, serviceType, description || null, preferredDate || null]
    );

    await logAction({ userId: req.user.user_id, action: 'CREATE_SERVICE_REQUEST', entityType: 'service_request', entityId: result.rows[0].request_id, ipAddress: req.ip });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/service-requests?status=&page=&limit=
async function listServiceRequests(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (req.user.role_name === 'resident') {
      params.push(req.user.user_id);
      conditions.push(`sr.requested_by = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`sr.status = $${params.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT sr.request_id, sr.service_type, sr.description, sr.preferred_date, sr.status,
              sr.created_at, u.full_name AS requested_by_name, p.full_name AS processed_by_name
       FROM service_requests sr
       JOIN users u ON sr.requested_by = u.user_id
       LEFT JOIN users p ON sr.processed_by = p.user_id
       ${whereClause}
       ORDER BY sr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/service-requests/:id/status  (admin/committee approve/reject/complete)
async function updateServiceRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'approved', 'rejected', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of ${allowed.join(', ')}` });
    }

    const result = await query(
      `UPDATE service_requests SET status = $1, processed_by = $2
       WHERE request_id = $3 RETURNING request_id, status`,
      [status, req.user.user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    await logAction({ userId: req.user.user_id, action: 'UPDATE_SERVICE_REQUEST', entityType: 'service_request', entityId: id, details: { status }, ipAddress: req.ip });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { createServiceRequest, listServiceRequests, updateServiceRequestStatus };
