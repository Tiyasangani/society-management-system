import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linksByRole = {
  admin: [
    ['/dashboard', 'Dashboard'],
    ['/residents', 'Residents'],
    ['/committee', 'Committee'],
    ['/flats', 'Flats'],
    ['/complaints', 'Complaints'],
    ['/service-requests', 'Service Requests'],
    ['/billing', 'Billing'],
    ['/announcements', 'Notices'],
    ['/audit-logs', 'Audit Log'],
  ],
  committee: [
    ['/dashboard', 'Dashboard'],
    ['/residents', 'Residents'],
    ['/complaints', 'Complaints'],
    ['/service-requests', 'Service Requests'],
    ['/announcements', 'Notices'],
  ],
  resident: [
    ['/dashboard', 'Dashboard'],
    ['/complaints', 'Complaints'],
    ['/service-requests', 'Service Requests'],
    ['/billing', 'Billing'],
    ['/announcements', 'Notices'],
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;
  const links = linksByRole[user.role_name] || [];

  return (
    <header className="bg-ink text-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 border-b border-white/10">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg tracking-tight">Greenview</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold/40 rounded-sm px-1.5 py-0.5">
              Society Office
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm">
            {links.map(([path, label]) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-sm transition-colors ${
                  location.pathname === path ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/profile" className="text-right hidden sm:block hover:opacity-80 transition-opacity">
              <div className="text-sm leading-tight">{user.full_name}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/50">{user.role_name}</div>
            </Link>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="md:hidden flex gap-1 overflow-x-auto py-2 text-sm">
          {links.map(([path, label]) => (
            <Link key={path} to={path} className="px-3 py-1.5 whitespace-nowrap rounded-sm bg-white/5 text-white/80">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
