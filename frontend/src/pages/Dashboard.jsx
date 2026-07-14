import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';

function StatCard({ label, value, tone = 'ink' }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-slate mb-2">{label}</div>
      <div className={`text-3xl font-display text-${tone}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(({ data }) => setSummary(data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-10 text-slate">Loading dashboard…</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader eyebrow="Overview" title={`Welcome back, ${user.full_name.split(' ')[0]}`} />

      {user.role_name === 'resident' && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Unpaid bills" value={summary.unpaidBills} tone={summary.unpaidBills > 0 ? 'bad' : 'good'} />
          <StatCard label="Amount due" value={`₹${summary.dueAmount}`} />
          <StatCard label="Open complaints" value={summary.openComplaints} />
          <StatCard label="Pending service requests" value={summary.pendingServiceRequests} />
        </div>
      )}

      {(user.role_name === 'admin' || user.role_name === 'committee') && summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Active residents" value={summary.activeResidents} />
            <StatCard label="Billed this month" value={`₹${summary.currentMonth.totalBilled}`} />
            <StatCard label="Collected this month" value={`₹${summary.currentMonth.totalCollected}`} tone="good" />
            <StatCard
              label="Collection rate"
              value={
                summary.currentMonth.totalBilled > 0
                  ? `${Math.round((summary.currentMonth.totalCollected / summary.currentMonth.totalBilled) * 100)}%`
                  : '—'
              }
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-sm uppercase tracking-wider text-slate mb-3">Complaints by status</h3>
              <ul className="space-y-2">
                {summary.complaintsByStatus.map((row) => (
                  <li key={row.status} className="flex justify-between text-sm border-b border-line pb-2">
                    <span className="capitalize">{row.status.replace('_', ' ')}</span>
                    <span className="font-medium">{row.count}</span>
                  </li>
                ))}
                {summary.complaintsByStatus.length === 0 && <li className="text-sm text-slate">No complaints yet.</li>}
              </ul>
            </div>

            <div className="card p-5">
              <h3 className="text-sm uppercase tracking-wider text-slate mb-3">Service requests by status</h3>
              <ul className="space-y-2">
                {summary.serviceRequestsByStatus.map((row) => (
                  <li key={row.status} className="flex justify-between text-sm border-b border-line pb-2">
                    <span className="capitalize">{row.status.replace('_', ' ')}</span>
                    <span className="font-medium">{row.count}</span>
                  </li>
                ))}
                {summary.serviceRequestsByStatus.length === 0 && <li className="text-sm text-slate">No requests yet.</li>}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
