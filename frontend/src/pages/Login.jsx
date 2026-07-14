import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch {
      // error already set in context
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-gold font-medium mb-2">Greenview Residents' Society</div>
          <h1 className="text-3xl text-ink">Society Office</h1>
          <p className="text-slate text-sm mt-2">Sign in to manage your residence</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <div className="text-sm text-bad bg-bad/10 rounded-sm px-3 py-2">{error}</div>}

          <div>
            <label className="block text-sm text-slate mb-1">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@society.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate mb-1">Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-slate">
            Resident? <Link to="/register" className="text-ink underline">Create an account</Link>
          </p>
        </form>

        <p className="text-center text-xs text-slate mt-6">
          Demo: admin@society.com / Admin@123 &nbsp;·&nbsp; resident@society.com / Resident@123
        </p>
      </div>
    </div>
  );
}
