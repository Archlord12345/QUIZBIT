import React from 'react';

export function Banner({ children, tone = 'warn' }) {
  return <div className={`banner ${tone}`}>{children}</div>;
}

export function Panel({ children, className = '', title }) {
  return (
    <section className={`panel glass-panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function EmptyState({ label }) {
  return <span className="empty-state">{label}</span>;
}

export function ModePill({ label, mode }) {
  const text =
    label ||
    (mode === 'battle_royale'
      ? 'battle'
      : mode === 'open'
      ? 'ouverte'
      : mode === 'mcq'
      ? 'qcm'
      : 'solo');
  return <span className={`pill ${mode || 'solo'}`}>{text}</span>;
}
