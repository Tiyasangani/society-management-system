import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function Billing() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ billingMonth: '', amount: '', dueDate: '' });
  const [recordingBillId, setRecordingBillId] = useState(null);
  const [recordForm, setRecordForm] = useState({ amountPaid: '', paymentMethod: 'cash', transactionRef: '' });
  const [recording, setRecording] = useState(false);
  const isAdmin = user.role_name === 'admin';

  const load = () => api.get('/bills').then(({ data }) => setBills(data.data));
  useEffect(() => { load(); }, []);

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bills/bulk', form);
      setForm({ billingMonth: '', amount: '', dueDate: '' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not generate bills.');
    }
  };

  const payNow = async (billId) => {
    try {
      const { data } = await api.post('/payments/create-order', { billId });
      const { orderId, amount, currency, keyId } = data.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Greenview Residents' Society",
        description: 'Maintenance bill payment',
        prefill: { name: user.full_name, email: user.email },
        theme: { color: '#3762c0' },
        handler: async (response) => {
          // Step 3: send the payment result back to the backend to verify + record it
          await api.post('/payments/verify', {
            billId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          load();
        },
      });
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.message || 'Payment could not be started. Please try again.');
    }
  };

  // Admin-only: record a payment directly (cash / cheque / UPI / bank transfer)
  // without going through Razorpay. Useful when online payment keys aren't
  // configured, or when a resident paid outside the app.
  const openRecordForm = (bill) => {
    setRecordingBillId(bill.bill_id);
    setRecordForm({ amountPaid: String(bill.amount - bill.amount_paid), paymentMethod: 'cash', transactionRef: '' });
  };

  const closeRecordForm = () => {
    setRecordingBillId(null);
    setRecordForm({ amountPaid: '', paymentMethod: 'cash', transactionRef: '' });
  };

  const submitRecordPayment = async (e) => {
    e.preventDefault();
    setRecording(true);
    try {
      await api.post('/payments', {
        billId: recordingBillId,
        amountPaid: Number(recordForm.amountPaid),
        paymentMethod: recordForm.paymentMethod,
        transactionRef: recordForm.transactionRef || undefined,
      });
      closeRecordForm();
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not record payment.');
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader
        eyebrow="Finance"
        title="Maintenance Billing"
        action={
          isAdmin && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Generate monthly bills'}
            </button>
          )
        }
      />

      {showForm && (
        <form onSubmit={handleBulkGenerate} className="card p-5 mb-8 grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm text-slate mb-1">Billing month</label>
            <input type="date" required className="input-field" value={form.billingMonth}
              onChange={(e) => setForm({ ...form, billingMonth: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Amount (₹) per flat</label>
            <input type="number" required min="0" className="input-field" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Due date</label>
            <input type="date" required className="input-field" value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary md:col-span-3 w-fit">Generate for all flats</button>
        </form>
      )}

      {recordingBillId && (
        <form onSubmit={submitRecordPayment} className="card p-5 mb-8 grid md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-4 text-sm text-slate">
            Recording a manual payment for bill #{recordingBillId} — use this instead of online checkout
            (e.g. resident paid by cash or bank transfer).
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Amount paid (₹)</label>
            <input type="number" required min="0.01" step="0.01" className="input-field"
              value={recordForm.amountPaid}
              onChange={(e) => setRecordForm({ ...recordForm, amountPaid: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Method</label>
            <select className="input-field" value={recordForm.paymentMethod}
              onChange={(e) => setRecordForm({ ...recordForm, paymentMethod: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
              <option value="online">Online (other)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Reference (optional)</label>
            <input className="input-field" placeholder="Cheque no. / UTR"
              value={recordForm.transactionRef}
              onChange={(e) => setRecordForm({ ...recordForm, transactionRef: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={recording} className="btn-primary">
              {recording ? 'Saving…' : 'Save payment'}
            </button>
            <button type="button" className="btn-secondary" onClick={closeRecordForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-slate uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Month</th>
              {user.role_name !== 'resident' && <th className="text-left px-4 py-3">Flat</th>}
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Paid</th>
              <th className="text-left px-4 py-3">Due date</th>
              <th className="text-left px-4 py-3">Status</th>
              {(user.role_name === 'resident' || isAdmin) && <th className="text-left px-4 py-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.bill_id} className="border-t border-line">
                <td className="px-4 py-3">{new Date(b.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</td>
                {user.role_name !== 'resident' && <td className="px-4 py-3">{b.building_name} - {b.flat_number}</td>}
                <td className="px-4 py-3">₹{b.amount}</td>
                <td className="px-4 py-3">₹{b.amount_paid}</td>
                <td className="px-4 py-3">{new Date(b.due_date).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                {user.role_name === 'resident' && (
                  <td className="px-4 py-3">
                    {b.status !== 'paid' && (
                      <button className="btn-secondary text-xs" onClick={() => payNow(b.bill_id)}>
                        Pay ₹{b.amount - b.amount_paid}
                      </button>
                    )}
                  </td>
                )}
                {isAdmin && (
                  <td className="px-4 py-3">
                    {b.status !== 'paid' && (
                      <button className="text-xs text-ink underline" onClick={() => openRecordForm(b)}>
                        Record payment
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {bills.length === 0 && <p className="text-slate text-sm p-4">No bills found.</p>}
      </div>
    </div>
  );
}