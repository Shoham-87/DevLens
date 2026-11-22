import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES, REPO_STATUS } from '../../constants/index.js';
import './Sidebar.css';

const STATUS_DOT_COLOR = {
  [REPO_STATUS.PENDING]:  'var(--dl-status-pending)',
  [REPO_STATUS.INDEXING]: 'var(--dl-status-indexing)',
  [REPO_STATUS.READY]:    'var(--dl-status-ready)',
  [REPO_STATUS.FAILED]:   'var(--dl-status-failed)',
};

const STORAGE_KEY = 'dl.sidebar.collapsed';

function readCollapsed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function CollapseIcon({ collapsed }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d={collapsed ? 'M9 6l2 2-2 2' : 'M11 6L9 8l2 2'}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar({ connectedRepos = [], activeRoute }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        return next;
      }
      return next;
    });
  }

  const navClass = ({ isActive }) =>
    'dl-sidebar__nav-item' + (isActive ? ' dl-sidebar__nav-item--active' : '');

  return (
    <aside className={`dl-sidebar d-flex flex-column ${collapsed ? 'dl-sidebar--collapsed' : ''}`}>
      <nav className="dl-sidebar__nav" aria-label="Main navigation">
        <NavLink to={ROUTES.DASHBOARD} className={navClass} title={collapsed ? 'Dashboard' : undefined}>
          <span className="dl-sidebar__nav-icon" aria-hidden="true">▣</span>
          <span className="dl-sidebar__label">Dashboard</span>
        </NavLink>
        <NavLink to={ROUTES.REPOS} className={navClass} title={collapsed ? 'Repositories' : undefined}>
          <span className="dl-sidebar__nav-icon" aria-hidden="true">⊞</span>
          <span className="dl-sidebar__label">Repositories</span>
        </NavLink>
        <a
          href="#"
          className="dl-sidebar__nav-item dl-sidebar__nav-item--disabled"
          aria-disabled="true"
          title={collapsed ? 'Settings' : undefined}
        >
          <span className="dl-sidebar__nav-icon" aria-hidden="true">⚙</span>
          <span className="dl-sidebar__label">Settings</span>
        </a>
      </nav>

      {connectedRepos.length > 0 && (
        <div className="dl-sidebar__repos">
          <p className="dl-sidebar__repos-label">Connected Repos</p>
          <ul className="dl-sidebar__repo-list list-unstyled mb-0">
            {connectedRepos.map((repo) => (
              <li key={repo.id}>
                <NavLink
                  to={ROUTES.REPO_DETAIL(repo.id)}
                  className={({ isActive }) =>
                    'dl-sidebar__repo-item' + (isActive ? ' dl-sidebar__repo-item--active' : '')
                  }
                  title={collapsed ? repo.name : undefined}
                >
                  <span
                    className="dl-sidebar__status-dot"
                    style={{ background: STATUS_DOT_COLOR[repo.status] || 'var(--dl-text-muted)' }}
                    aria-hidden="true"
                  />
                  <span className="dl-sidebar__repo-name">{repo.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="dl-sidebar__footer">
        <button
          type="button"
          className="dl-sidebar__nav-item dl-sidebar__toggle"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : undefined}
        >
          <span className="dl-sidebar__nav-icon" aria-hidden="true">
            <CollapseIcon collapsed={collapsed} />
          </span>
          <span className="dl-sidebar__label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}
