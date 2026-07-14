import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';

export default function Announcements() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', isUrgent: false });
  const canPost = user.role_name === 'admin' || user.role_name === 'committee';

  const load = () => api.get('/announcements').then(({ data }) => setItems(data.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements', form);
      setForm({ title: '', content: '', isUrgent: false });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not publish notice.');
    }
  };

  const remove = async (id) => {
    await api.delete(`/announcements/${id}`);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader
        eyebrow="Community"
        title="Notices"
        action={
          canPost && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Post a notice'}
            </button>
          )
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-8 space-y-4">
          <div>
            <label className="block text-sm text-slate mb-1">Title</label>
            <input required className="input-field" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Content</label>
            <textarea required rows={4} className="input-field" value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate">
            <input type="checkbox" checked={form.isUrgent}
              onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })} />
            Mark as urgent
          </label>
          <button type="submit" className="btn-primary">Publish</button>
        </form>
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.announcement_id} className={`card p-5 ${a.is_urgent ? 'border-l-4 border-l-bad' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {a.is_urgent && <span className="badge bg-bad/10 text-bad">Urgent</span>}
                  <h3 className="text-ink font-medium font-display text-lg">{a.title}</h3>
                </div>
                <p className="text-sm text-slate mt-1">{a.content}</p>
                <p className="text-xs text-slate mt-2">
                  {a.posted_by_name} · {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              {user.role_name === 'admin' && (
                <button onClick={() => remove(a.announcement_id)} className="text-xs text-bad hover:underline">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-slate text-sm">No notices posted yet.</p>}
      </div>
    </div>
  );
}
