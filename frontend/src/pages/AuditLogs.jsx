import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/dashboard/audit-logs').then(({ data }) => setLogs(data.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <PageHeader eyebrow="Security" title="Audit Log" />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-slate uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">When</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Action</th>
              <th className="text-left px-4 py-3">Entity</th>
              <th className="text-left px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.log_id} className="border-t border-line">
                <td className="px-4 py-3">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">{l.user_name || '—'}</td>
                <td className="px-4 py-3">{l.action}</td>
                <td className="px-4 py-3">{l.entity_type ? `${l.entity_type} #${l.entity_id}` : '—'}</td>
                <td className="px-4 py-3">{l.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="text-slate text-sm p-4">No audit entries yet.</p>}
      </div>
    </div>
  );
}
