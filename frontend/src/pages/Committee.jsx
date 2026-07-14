import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';

export default function Committee() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', designation: '', canPublishNotices: false });

  const load = () => api.get('/committee').then(({ data }) => setMembers(data.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/committee', form);
      setForm({ fullName: '', email: '', phone: '', password: '', designation: '', canPublishNotices: false });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not appoint committee member.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader
        eyebrow="Members"
        title="Committee"
        action={
          user.role_name === 'admin' && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Appoint member'}
            </button>
          )
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-8 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate mb-1">Full name</label>
            <input required className="input-field" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Email</label>
            <input required type="email" className="input-field" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Phone</label>
            <input className="input-field" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Designation</label>
            <input className="input-field" placeholder="e.g. Secretary" value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Temporary password</label>
            <input required type="password" className="input-field" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate self-end">
            <input type="checkbox" checked={form.canPublishNotices}
              onChange={(e) => setForm({ ...form, canPublishNotices: e.target.checked })} />
            Can publish notices
          </label>
          <button type="submit" className="btn-primary md:col-span-2 w-fit">Appoint</button>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-slate uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Designation</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Can publish notices</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user_id} className="border-t border-line">
                <td className="px-4 py-3">{m.full_name}</td>
                <td className="px-4 py-3">{m.designation}</td>
                <td className="px-4 py-3">{m.email}</td>
                <td className="px-4 py-3">{m.can_publish_notices ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <p className="text-slate text-sm p-4">No committee members yet.</p>}
      </div>
    </div>
  );
}
