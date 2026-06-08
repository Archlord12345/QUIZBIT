import React from 'react';
import logoUrl from '../assets/logo.png';

/**
 * Ecran de chargement plein ecran du panel cloud : fond bleu nuit,
 * halos en spirale, logo pulsant, anneau rotatif et points animes.
 */
export function PanelSplash({ message = 'Connexion au cloud QuizBit...' }) {
  return (
    <div className="panel-splash" role="status" aria-live="polite">
      <div className="panel-splash__glow panel-splash__glow--top" />
      <div className="panel-splash__glow panel-splash__glow--bottom" />
      <span className="panel-splash__cube panel-splash__cube--a" />
      <span className="panel-splash__cube panel-splash__cube--b" />
      <span className="panel-splash__cube panel-splash__cube--c" />

      <div className="panel-splash__center">
        <div className="panel-splash__stage">
          <span className="panel-splash__halo" />
          <span className="panel-splash__ring" />
          <span className="panel-splash__ring panel-splash__ring--inner" />
          <img
            className="panel-splash__logo"
            src={logoUrl}
            alt="QuizBit logo"
          />
        </div>
        <strong className="panel-splash__title">QuizBit</strong>
        <span className="panel-splash__subtitle">Panel cloud</span>
        <div className="panel-splash__dots">
          <span />
          <span />
          <span />
        </div>
        <span className="panel-splash__message">{message}</span>
      </div>
    </div>
  );
}
