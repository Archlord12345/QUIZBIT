import React from 'react';
import logoUrl from '../assets/logo.png';
import { NAV_ITEMS } from '../constants.js';

export function Sidebar({ currentPage, onPage }) {
  return (
    <aside className="sidebar glass-panel">
      <div className="brand">
        <div className="brand-logo">
          <img src={logoUrl} alt="QuizBit logo" />
        </div>
        <div>
          <strong>QuizBit</strong>
          <span>Panel cloud</span>
        </div>
      </div>
      <nav className="nav-list">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onPage(item.id)}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-note">
        Palette alignee sur le logo (bleu electrique #2563eb, ciel #38bdf8, blanc).
      </div>
    </aside>
  );
}
