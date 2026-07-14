import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';

export default function Residents() {
  const { user } = useAuth();
  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState('');
  const [flats, setFlats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', flatId: '' });
  const isAdmin = user.role_name === 'admin';

  const load = () => api.get('/residents', { params: { search } }).then(({ data }) => setResidents(data.data));
  useEffect(() => { load(); }, [search]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/flats').then(({ data }) => setFlats(data.data)).catch(() => setFlats([]));
    }
  }, [isAdmin]);

  const toggleActive = async (id, isActive) => {
    try {
      if (isActive) {
        await api.delete(`/residents/${id}`);
      } else {
        await api.put(`/residents/${id}`, { isActive: true });
      }
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update resident.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/residents', form);
      setForm({ fullName: '', email: '', phone: '', password: '', flatId: '' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not add resident.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader
        eyebrow="Members"
        title="Residents"
        action={
          isAdmin && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Add resident'}
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
            <label className="block text-sm text-slate mb-1">Flat</label>
            <select required className="input-field" value={form.flatId}
              onChange={(e) => setForm({ ...form, flatId: e.target.value })}>
              <option value="">Select a flat</option>
              {flats.map((f) => (
                <option key={f.flat_id} value={f.flat_id}>
                  {f.building_name} — {f.flat_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Temporary password</label>
            <input required type="password" minLength={6} className="input-field" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary md:col-span-2 w-fit">Add resident</button>
        </form>
      )}

      <input
        className="input-field max-w-xs mb-4"
        placeholder="Search by name, email, or flat…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-slate uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Flat</th>
              <th className="text-left px-4 py-3">Status</th>
              {isAdmin && <th className="text-left px-4 py-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {residents.map((r) => (
              <tr key={r.user_id} className="border-t border-line">
                <td className="px-4 py-3">{r.full_name}</td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">{r.building_name} - {r.flat_number}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${r.is_active ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'}`}>
                    {r.is_active ? 'active' : 'inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <button className="text-xs text-ink underline" onClick={() => toggleActive(r.user_id, r.is_active)}>
                      {r.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {residents.length === 0 && <p className="text-slate text-sm p-4">No residents found.</p>}
      </div>
    </div>
  );
}
