import React from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import useDashboard from './useDashboard.js';
import { REPO_STATUS } from '../../constants/index.js';
import './DashboardPage.css';

const STATUS_CLASS = {
  [REPO_STATUS.PENDING]:  'pending',
  [REPO_STATUS.INDEXING]: 'indexing',
  [REPO_STATUS.READY]:    'ready',
  [REPO_STATUS.FAILED]:   'failed',
};

function RepoCard({ repo, onClick }) {
  const statusKey = STATUS_CLASS[repo.status] || 'pending';

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <article
      className="dash-card"
      onClick={() => onClick(repo.id)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${repo.name}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick(repo.id)}
    >
      <div className="dash-card__top">
        <span className="dash-card__name">{repo.name}</span>
        <span className={`dash-card__status-badge dash-card__status-badge--${statusKey}`}>
          {repo.status === REPO_STATUS.INDEXING && (
            <span className="dash-card__pulse-dot" aria-hidden="true" />
          )}
          {repo.status}
        </span>
      </div>
      <div className="dash-card__meta">
        <span className="dash-card__lang-badge">{repo.language || 'Unknown'}</span>
        <span className="dash-card__date">{formatDate(repo.connectedAt)}</span>
      </div>
    </article>
  );
}

function EmptyState({ onConnect }) {
  return (
    <div className="dash-empty dl-fu-3">
      <div className="dash-empty__icon" aria-hidden="true">⊡</div>
      <h2 className="dash-empty__title">No repositories connected</h2>
      <p className="dash-empty__sub">
        Connect a GitHub repository to start chatting with your code and getting AI-powered insights.
      </p>
      <button className="btn btn-primary dash-empty__btn" onClick={onConnect}>
        Connect a repository
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { connectedRepos, isLoading, error, handleConnectRepo, handleRepoClick } = useDashboard();

  return (
    <AppLayout connectedRepos={connectedRepos}>
      <div className="dash-page">
        <div className="dash-header dl-fu-1">
          <h1 className="dash-header__title">Dashboard</h1>
          <p className="dash-header__subtitle">Your connected repositories</p>
        </div>

        {isLoading && (
          <div className="d-flex align-items-center gap-2 dl-fu-2">
            <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />
            <span className="visually-hidden">Loading…</span>
            <span style={{ color: 'var(--dl-text-muted)', fontSize: '0.875rem' }}>Loading repositories…</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="dash-error dl-fu-2" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {!isLoading && !error && connectedRepos.length === 0 && (
          <EmptyState onConnect={handleConnectRepo} />
        )}

        {!isLoading && !error && connectedRepos.length > 0 && (
          <div className="dash-grid dl-fu-2">
            {connectedRepos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} onClick={handleRepoClick} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
