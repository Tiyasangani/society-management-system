import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

const CATEGORIES = [
  { id: 1, name: 'Plumbing' }, { id: 2, name: 'Electrical' }, { id: 3, name: 'Security' },
  { id: 4, name: 'Cleanliness' }, { id: 5, name: 'Parking' }, { id: 6, name: 'Noise' },
  { id: 7, name: 'Lift/Elevator' }, { id: 8, name: 'Other' },
];

export default function Complaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ categoryId: '1', title: '', description: '', priority: 'medium' });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api.get('/complaints', { params: filter ? { status: filter } : {} })
      .then(({ data }) => setComplaints(data.data));
  };

  useEffect(() => { load(); }, [filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach((img) => fd.append('images', img));
      await api.post('/complaints', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setForm({ categoryId: '1', title: '', description: '', priority: 'medium' });
      setImages([]);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/complaints/${id}/status`, { status });
    load();
  };

  const canManage = user.role_name === 'admin' || user.role_name === 'committee';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader
        eyebrow="Maintenance & Upkeep"
        title="Complaints"
        action={
          user.role_name === 'resident' && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Raise a complaint'}
            </button>
          )
        }
      />

      {!canManage && showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-8 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate mb-1">Category</label>
              <select className="input-field" value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate mb-1">Priority</label>
              <select className="input-field" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Title</label>
            <input required className="input-field" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Description</label>
            <textarea required rows={3} className="input-field" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Photos (optional, up to 5)</label>
            <input type="file" accept="image/*" multiple className="text-sm"
              onChange={(e) => setImages(Array.from(e.target.files).slice(0, 5))} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Submitting…' : 'Submit complaint'}
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-4 text-sm">
        {['', 'open', 'in_progress', 'resolved', 'rejected'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-sm border ${filter === s ? 'bg-ink text-white border-ink' : 'border-line text-slate'}`}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {complaints.map((c) => (
          <div key={c.complaint_id} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wider text-slate">{c.category}</span>
                  <StatusBadge status={c.status} />
                  {c.priority === 'high' && <span className="badge bg-bad/10 text-bad">high priority</span>}
                </div>
                <h3 className="text-ink font-medium">{c.title}</h3>
                <p className="text-sm text-slate mt-1">{c.description}</p>
                {canManage && <p className="text-xs text-slate mt-2">Raised by {c.raised_by_name}</p>}
                {c.images?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {c.images.map((img, i) => (
                      <img key={i} src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${img}`}
                        alt="complaint" className="w-16 h-16 object-cover rounded-sm border border-line" />
                    ))}
                  </div>
                )}
              </div>
              {canManage && (
                <select
                  className="input-field w-auto text-xs"
                  value={c.status}
                  onChange={(e) => updateStatus(c.complaint_id, e.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}
            </div>
          </div>
        ))}
        {complaints.length === 0 && <p className="text-slate text-sm">No complaints found.</p>}
      </div>
    </div>
  );
}
