import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES, REPO_STATUS } from '../../constants/index.js';
import './Sidebar.css';

const STATUS_DOT_COLOR = {
  [REPO_STATUS.PENDING]:  'var(--dl-status-pending)',
  [REPO_STATUS.INDEXING]: 'var(--dl-status-indexing)',
  [REPO_STATUS.READY]:    'var(--dl-status-ready)',
  [REPO_STATUS.FAILED]:   'var(--dl-status-failed)',
};

export default function Sidebar({ connectedRepos = [], activeRoute }) {
  return (
    <aside className="dl-sidebar d-flex flex-column">
      <nav className="dl-sidebar__nav" aria-label="Main navigation">
        <NavLink
          to={ROUTES.DASHBOARD}
          className={({ isActive }) =>
            'dl-sidebar__nav-item' + (isActive ? ' dl-sidebar__nav-item--active' : '')
          }
        >
          <span className="dl-sidebar__nav-icon" aria-hidden="true">▣</span>
          Dashboard
        </NavLink>
        <NavLink
          to={ROUTES.REPOS}
          className={({ isActive }) =>
            'dl-sidebar__nav-item' + (isActive ? ' dl-sidebar__nav-item--active' : '')
          }
        >
          <span className="dl-sidebar__nav-icon" aria-hidden="true">⊞</span>
          Repositories
        </NavLink>
        <a href="#" className="dl-sidebar__nav-item dl-sidebar__nav-item--disabled" aria-disabled="true">
          <span className="dl-sidebar__nav-icon" aria-hidden="true">⚙</span>
          Settings
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
    </aside>
  );
}
