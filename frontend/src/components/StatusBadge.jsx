import React from 'react';

const styles = {
  open: 'bg-bad/10 text-bad',
  pending: 'bg-warn/10 text-warn',
  in_progress: 'bg-warn/10 text-warn',
  approved: 'bg-good/10 text-good',
  resolved: 'bg-good/10 text-good',
  completed: 'bg-good/10 text-good',
  paid: 'bg-good/10 text-good',
  rejected: 'bg-bad/10 text-bad',
  unpaid: 'bg-bad/10 text-bad',
  overdue: 'bg-bad/10 text-bad',
  partial: 'bg-warn/10 text-warn',
};

export default function StatusBadge({ status }) {
  const cls = styles[status] || 'bg-slate/10 text-slate';
  return <span className={`badge ${cls}`}>{status.replace('_', ' ')}</span>;
}
