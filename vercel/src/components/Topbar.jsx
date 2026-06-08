import React from 'react';
import { Download, Plus } from 'lucide-react';

export function Topbar({
  loading,
  onCreate,
  onExportCsv,
  onExportJson,
  onRefresh,
  page,
  showCreate,
  title,
}) {
  const isOfflineStudio = page === 'offline-studio';
  const showExport = page !== 'settings' && !isOfflineStudio;
  const showRefresh = !isOfflineStudio;
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">
          {isOfflineStudio ? 'QuizBit · Studio offline' : 'QuizBit control center'}
        </p>
        <h1>{title}</h1>
      </div>
      {showExport || showRefresh || showCreate ? (
        <div className="topbar-actions">
          {showCreate ? (
            <button className="btn ghost" onClick={onCreate}>
              <Plus size={16} /> Nouveau
            </button>
          ) : null}
          {showExport ? (
            <button className="btn ghost" onClick={onExportCsv}>
              <Download size={16} /> CSV
            </button>
          ) : null}
          {showExport ? (
            <button className="btn ghost" onClick={onExportJson}>
              JSON
            </button>
          ) : null}
          {showRefresh ? (
            <button className="btn primary" disabled={loading} onClick={onRefresh}>
              {loading ? 'Chargement...' : 'Rafraichir'}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
