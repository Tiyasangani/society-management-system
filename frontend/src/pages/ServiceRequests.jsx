import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function ServiceRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ serviceType: '', description: '', preferredDate: '' });
  const canManage = user.role_name === 'admin' || user.role_name === 'committee';

  const load = () => api.get('/service-requests').then(({ data }) => setRequests(data.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/service-requests', form);
      setForm({ serviceType: '', description: '', preferredDate: '' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not submit request.');
    }
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/service-requests/${id}/status`, { status });
    load();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader
        eyebrow="Facilities"
        title="Service Requests"
        action={
          user.role_name === 'resident' && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'New request'}
            </button>
          )
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-8 space-y-4">
          <div>
            <label className="block text-sm text-slate mb-1">Service type</label>
            <input required className="input-field" placeholder="e.g. Plumber visit, Pest control"
              value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Description</label>
            <textarea rows={3} className="input-field" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Preferred date</label>
            <input type="date" className="input-field" value={form.preferredDate}
              onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">Submit request</button>
        </form>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.request_id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-ink font-medium">{r.service_type}</h3>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm text-slate">{r.description}</p>
              <p className="text-xs text-slate mt-1">
                {canManage && `${r.requested_by_name} · `}
                {r.preferred_date ? `Preferred: ${new Date(r.preferred_date).toLocaleDateString()}` : ''}
              </p>
            </div>
            {canManage && (
              <select className="input-field w-auto text-xs" value={r.status}
                onChange={(e) => updateStatus(r.request_id, e.target.value)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-slate text-sm">No service requests found.</p>}
      </div>
    </div>
  );
}
