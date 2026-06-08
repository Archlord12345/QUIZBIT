import React from 'react';

export function CrudModal({ busy, modal, onClose, onSave, setJson }) {
  const title =
    modal.mode === 'create'
      ? 'Creer un enregistrement'
      : `Modifier ${modal.id || ''}`;
  return (
    <div className="crud-overlay" role="dialog" aria-modal="true">
      <section className="crud-modal glass-panel">
        <div className="details-head">
          <h2>{title}</h2>
          <button className="btn small ghost" disabled={busy} onClick={onClose}>
            Fermer
          </button>
        </div>
        <p className="crud-hint">
          Edite le document JSON (sans le champ <code>id</code> — il est gere
          automatiquement).
        </p>
        <textarea
          className="crud-json"
          disabled={busy}
          onChange={event => setJson(event.target.value)}
          rows={18}
          spellCheck={false}
          value={modal.json}
        />
        {modal.error ? <p className="crud-error">{modal.error}</p> : null}
        <div className="crud-actions">
          <button className="btn ghost" disabled={busy} onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" disabled={busy} onClick={onSave}>
            {busy ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </section>
    </div>
  );
}
