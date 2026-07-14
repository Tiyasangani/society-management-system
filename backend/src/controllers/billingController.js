const { query } = require('../config/db');
const { logAction } = require('../utils/auditLogger');

// POST /api/bills  (admin creates a maintenance bill for a flat)
async function createBill(req, res, next) {
  try {
    const { flatId, billingMonth, amount, dueDate } = req.body;
    if (!flatId || !billingMonth || !amount || !dueDate) {
      return res.status(400).json({ success: false, message: 'flatId, billingMonth, amount, dueDate required' });
    }

    const result = await query(
      `INSERT INTO maintenance_bills (flat_id, billing_month, amount, due_date, generated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING bill_id, billing_month, amount, due_date, status`,
      [flatId, billingMonth, amount, dueDate, req.user.user_id]
    );

    await logAction({ userId: req.user.user_id, action: 'CREATE_BILL', entityType: 'bill', entityId: result.rows[0].bill_id, ipAddress: req.ip });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // unique_violation (flat_id, billing_month)
      return res.status(409).json({ success: false, message: 'A bill for this flat and month already exists' });
    }
    next(err);
  }
}

// POST /api/bills/bulk  (admin generates the same bill for every flat, e.g. monthly maintenance run)
async function bulkGenerateBills(req, res, next) {
  try {
    const { billingMonth, amount, dueDate } = req.body;
    if (!billingMonth || !amount || !dueDate) {
      return res.status(400).json({ success: false, message: 'billingMonth, amount, dueDate required' });
    }

    const result = await query(
      `INSERT INTO maintenance_bills (flat_id, billing_month, amount, due_date, generated_by)
       SELECT flat_id, $1, $2, $3, $4 FROM flats
       ON CONFLICT (flat_id, billing_month) DO NOTHING
       RETURNING bill_id, flat_id`,
      [billingMonth, amount, dueDate, req.user.user_id]
    );

    await logAction({ userId: req.user.user_id, action: 'BULK_GENERATE_BILLS', entityType: 'bill', details: { billingMonth, count: result.rows.length }, ipAddress: req.ip });
    res.status(201).json({ success: true, message: `${result.rows.length} bills generated`, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/bills?status=&flatId=&page=&limit=
async function listBills(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (req.user.role_name === 'resident') {
      params.push(req.user.flat_id);
      conditions.push(`b.flat_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT b.bill_id, b.billing_month, b.amount, b.due_date, b.status,
              f.flat_number, bld.name AS building_name,
              COALESCE(SUM(p.amount_paid), 0) AS amount_paid
       FROM maintenance_bills b
       JOIN flats f ON b.flat_id = f.flat_id
       JOIN buildings bld ON f.building_id = bld.building_id
       LEFT JOIN payments p ON p.bill_id = b.bill_id
       ${whereClause}
       GROUP BY b.bill_id, f.flat_number, bld.name
       ORDER BY b.billing_month DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBill, bulkGenerateBills, listBills };
