import React from 'react';

export default function PageHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-6 pb-4 border-b border-line">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.15em] text-gold font-medium mb-1">{eyebrow}</div>
        )}
        <h1 className="text-2xl text-ink">{title}</h1>
      </div>
      {action}
    </div>
  );
}
