import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import Committee from './pages/Committee';
import Complaints from './pages/Complaints';
import ServiceRequests from './pages/ServiceRequests';
import Billing from './pages/Billing';
import Announcements from './pages/Announcements';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import Flats from './pages/Flats';

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/residents" element={<ProtectedRoute roles={['admin', 'committee']}><Residents /></ProtectedRoute>} />
        <Route path="/committee" element={<ProtectedRoute roles={['admin', 'committee']}><Committee /></ProtectedRoute>} />
        <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
        <Route path="/service-requests" element={<ProtectedRoute><ServiceRequests /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute roles={['admin', 'resident']}><Billing /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
        <Route path="/flats" element={<ProtectedRoute roles={['admin']}><Flats /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
      </Routes>
    </>
  );
}
