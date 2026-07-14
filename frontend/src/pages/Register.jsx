import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();
  const [flats, setFlats] = useState([]);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', flatId: '' });

  useEffect(() => {
    api.get('/flats').then(({ data }) => setFlats(data.data)).catch(() => setFlats([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      navigate('/dashboard');
    } catch {
      // error already set in context
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-gold font-medium mb-2">Greenview Residents' Society</div>
          <h1 className="text-3xl text-ink">Resident Sign-up</h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <div className="text-sm text-bad bg-bad/10 rounded-sm px-3 py-2">{error}</div>}

          <div>
            <label className="block text-sm text-slate mb-1">Full name</label>
            <input required className="input-field" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Email</label>
            <input type="email" required className="input-field" value={form.email}
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
              <option value="">Select your flat</option>
              {flats.map((f) => (
                <option key={f.flat_id} value={f.flat_id}>
                  {f.building_name} — {f.flat_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Password</label>
            <input type="password" required minLength={6} className="input-field" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-slate">
            Already registered? <Link to="/login" className="text-ink underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
