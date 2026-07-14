const crypto = require('crypto');
const { pool, query } = require('../config/db');
const { logAction } = require('../utils/auditLogger');
const razorpay = require('../config/razorpay');

// POST /api/payments/create-order  (resident starts an online payment for a bill)
async function createOrder(req, res, next) {
  try {
    const { billId } = req.body;
    if (!billId) {
      return res.status(400).json({ success: false, message: 'billId is required' });
    }

    const billResult = await query(
      `SELECT b.bill_id, b.amount, b.flat_id, b.status,
              COALESCE(SUM(p.amount_paid), 0) AS amount_paid
       FROM maintenance_bills b
       LEFT JOIN payments p ON p.bill_id = b.bill_id
       WHERE b.bill_id = $1
       GROUP BY b.bill_id`,
      [billId]
    );
    if (billResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    const bill = billResult.rows[0];
    if (bill.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Bill is already fully paid' });
    }

    const amountDue = Number(bill.amount) - Number(bill.amount_paid);
    // Razorpay expects the amount in the smallest currency unit (paise for INR)
    const amountInPaise = Math.round(amountDue * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `bill_${billId}_${Date.now()}`,
      notes: { billId: String(billId), userId: req.user.user_id },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        billId,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/verify  (called after Razorpay checkout succeeds on the frontend)
async function verifyPayment(req, res, next) {
  const { billId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!billId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
  }

  // Verify the signature Razorpay sent back matches one we can only produce
  // with our own key secret — this proves the payment wasn't tampered with.
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const billResult = await client.query(
      `SELECT bill_id, amount, flat_id FROM maintenance_bills WHERE bill_id = $1 FOR UPDATE`,
      [billId]
    );
    if (billResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    const bill = billResult.rows[0];

    // Fetch the actual captured amount from Razorpay rather than trusting the client
    const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    const amountPaid = Number(rzpPayment.amount) / 100;

    const paymentResult = await client.query(
      `INSERT INTO payments (bill_id, paid_by, amount_paid, payment_method, transaction_ref, razorpay_order_id)
       VALUES ($1, $2, $3, 'online', $4, $5)
       RETURNING payment_id, amount_paid, payment_method, paid_at`,
      [billId, req.user.user_id, amountPaid, razorpay_payment_id, razorpay_order_id]
    );

    const totalPaidResult = await client.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payments WHERE bill_id = $1`,
      [billId]
    );
    const totalPaid = Number(totalPaidResult.rows[0].total);

    let newStatus = 'partial';
    if (totalPaid >= Number(bill.amount)) newStatus = 'paid';

    await client.query(`UPDATE maintenance_bills SET status = $1 WHERE bill_id = $2`, [newStatus, billId]);

    await client.query('COMMIT');
    await logAction({
      userId: req.user.user_id,
      action: 'RAZORPAY_PAYMENT',
      entityType: 'payment',
      entityId: paymentResult.rows[0].payment_id,
      details: { billId, amountPaid, razorpay_payment_id },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: { ...paymentResult.rows[0], billStatus: newStatus } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// POST /api/payments  (resident pays a bill, or admin records a cash/cheque payment)
async function recordPayment(req, res, next) {
  const { billId, amountPaid, paymentMethod, transactionRef } = req.body;
  if (!billId || !amountPaid) {
    return res.status(400).json({ success: false, message: 'billId and amountPaid are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const billResult = await client.query(
      `SELECT bill_id, amount, flat_id FROM maintenance_bills WHERE bill_id = $1 FOR UPDATE`,
      [billId]
    );
    if (billResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    const bill = billResult.rows[0];

    const paymentResult = await client.query(
      `INSERT INTO payments (bill_id, paid_by, amount_paid, payment_method, transaction_ref, recorded_by)
       VALUES ($1, $2, $3, COALESCE($4, 'online'), $5, $6)
       RETURNING payment_id, amount_paid, payment_method, paid_at`,
      [billId, req.user.user_id, amountPaid, paymentMethod, transactionRef || null,
       req.user.role_name === 'admin' ? req.user.user_id : null]
    );

    const totalPaidResult = await client.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payments WHERE bill_id = $1`,
      [billId]
    );
    const totalPaid = Number(totalPaidResult.rows[0].total);

    let newStatus = 'partial';
    if (totalPaid >= Number(bill.amount)) newStatus = 'paid';

    await client.query(`UPDATE maintenance_bills SET status = $1 WHERE bill_id = $2`, [newStatus, billId]);

    await client.query('COMMIT');
    await logAction({ userId: req.user.user_id, action: 'RECORD_PAYMENT', entityType: 'payment', entityId: paymentResult.rows[0].payment_id, details: { billId, amountPaid }, ipAddress: req.ip });

    res.status(201).json({ success: true, data: { ...paymentResult.rows[0], billStatus: newStatus } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/payments?billId=&page=&limit=
async function listPayments(req, res, next) {
  try {
    const { billId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (req.user.role_name === 'resident') {
      params.push(req.user.user_id);
      conditions.push(`p.paid_by = $${params.length}`);
    }
    if (billId) {
      params.push(billId);
      conditions.push(`p.bill_id = $${params.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT p.payment_id, p.amount_paid, p.payment_method, p.transaction_ref, p.paid_at,
              b.bill_id, b.billing_month, f.flat_number, u.full_name AS paid_by_name
       FROM payments p
       JOIN maintenance_bills b ON p.bill_id = b.bill_id
       JOIN flats f ON b.flat_id = f.flat_id
       JOIN users u ON p.paid_by = u.user_id
       ${whereClause}
       ORDER BY p.paid_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { recordPayment, listPayments, createOrder, verifyPayment };
