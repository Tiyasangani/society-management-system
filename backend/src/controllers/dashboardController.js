const { query } = require('../config/db');

// GET /api/dashboard/summary  (role-aware summary)
async function getSummary(req, res, next) {
  try {
    if (req.user.role_name === 'resident') {
      const [bills, complaints, requests] = await Promise.all([
        query(
          `SELECT COUNT(*) FILTER (WHERE status != 'paid') AS unpaid_bills,
                  COALESCE(SUM(amount) FILTER (WHERE status != 'paid'), 0) AS due_amount
           FROM maintenance_bills WHERE flat_id = $1`,
          [req.user.flat_id]
        ),
        query(
          `SELECT COUNT(*) FILTER (WHERE status = 'open') AS open_complaints,
                  COUNT(*) AS total_complaints
           FROM complaints WHERE raised_by = $1`,
          [req.user.user_id]
        ),
        query(
          `SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending_requests
           FROM service_requests WHERE requested_by = $1`,
          [req.user.user_id]
        ),
      ]);

      return res.json({
        success: true,
        data: {
          unpaidBills: Number(bills.rows[0].unpaid_bills),
          dueAmount: Number(bills.rows[0].due_amount),
          openComplaints: Number(complaints.rows[0].open_complaints),
          totalComplaints: Number(complaints.rows[0].total_complaints),
          pendingServiceRequests: Number(requests.rows[0].pending_requests),
        },
      });
    }

    // admin / committee summary
    const [residents, complaints, requests, billing] = await Promise.all([
      query(`SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role_name = 'resident' AND u.is_active = TRUE`),
      query(`SELECT status, COUNT(*) FROM complaints GROUP BY status`),
      query(`SELECT status, COUNT(*) FROM service_requests GROUP BY status`),
      query(`SELECT COALESCE(SUM(amount), 0) AS total_billed,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_collected
             FROM maintenance_bills
             WHERE billing_month >= date_trunc('month', CURRENT_DATE)`),
    ]);

    res.json({
      success: true,
      data: {
        activeResidents: Number(residents.rows[0].count),
        complaintsByStatus: complaints.rows,
        serviceRequestsByStatus: requests.rows,
        currentMonth: {
          totalBilled: Number(billing.rows[0].total_billed),
          totalCollected: Number(billing.rows[0].total_collected),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/audit-logs  (admin only)
async function getAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT l.log_id, l.action, l.entity_type, l.entity_id, l.details, l.ip_address, l.created_at,
              u.full_name AS user_name
       FROM audit_logs l
       LEFT JOIN users u ON l.user_id = u.user_id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getAuditLogs };
