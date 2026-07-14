import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';

export default function Profile() {
  const { updateUser } = useAuth();
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setDetails(data.data);
      setForm({ fullName: data.data.full_name || '', phone: data.data.phone || '' });
    });
  }, []);

  const handleInfoSave = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg('');
    try {
      const { data } = await api.patch('/auth/me', { fullName: form.fullName, phone: form.phone });
      setDetails((d) => ({ ...d, ...data.data }));
      updateUser({ full_name: data.data.full_name, phone: data.data.phone });
      setInfoMsg('Profile updated.');
    } catch (err) {
      setInfoMsg(err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSavingInfo(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg('New password and confirmation do not match.');
      return;
    }
    setSavingPw(true);
    try {
      await api.patch('/auth/me', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwMsg('Password changed successfully.');
    } catch (err) {
      setPwMsg(err.response?.data?.message || 'Could not change password.');
    } finally {
      setSavingPw(false);
    }
  };

  if (!details) return <div className="max-w-3xl mx-auto px-6 py-10 text-slate text-sm">Loading profile…</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <PageHeader eyebrow="Account" title="My Profile" />

      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate mb-5">
          <span><span className="text-ink font-medium">{details.email}</span></span>
          <span className="badge bg-ink/5 text-ink capitalize">{details.role_name}</span>
          {details.flat_id && <span>Flat #{details.flat_id}</span>}
        </div>

        <form onSubmit={handleInfoSave} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate mb-1">Full name</label>
            <input required className="input-field" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Phone</label>
            <input className="input-field" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={savingInfo}>
              {savingInfo ? 'Saving…' : 'Save changes'}
            </button>
            {infoMsg && <span className="text-sm text-slate">{infoMsg}</span>}
          </div>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-lg text-ink font-display mb-4">Change password</h2>
        <form onSubmit={handlePasswordChange} className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate mb-1">Current password</label>
            <input required type="password" className="input-field" value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">New password</label>
            <input required type="password" minLength={6} className="input-field" value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1">Confirm new password</label>
            <input required type="password" minLength={6} className="input-field" value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex items-center gap-3">
            <button type="submit" className="btn-secondary" disabled={savingPw}>
              {savingPw ? 'Updating…' : 'Update password'}
            </button>
            {pwMsg && <span className="text-sm text-slate">{pwMsg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
