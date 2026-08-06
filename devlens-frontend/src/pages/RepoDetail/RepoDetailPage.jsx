import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import useRepoDetail from './useRepoDetail.js';
import { REPO_STATUS, ROUTES } from '../../constants/index.js';
import './RepoDetailPage.css';

function IndexingProgressCard({ status }) {
  const pct = status?.progressPercent ?? 0;
  return (
    <div className="rd-progress-card dl-fu-3" aria-live="polite" aria-label="Indexing progress">
      <div className="rd-progress-card__header">
        <span className="rd-progress-card__icon" aria-hidden="true">🗄</span>
        <h2 className="rd-progress-card__title">Indexing progress</h2>
      </div>
      <p className="rd-progress-card__sub">Scanning files and generating embeddings…</p>
      <div className="rd-progress-card__bar-wrap">
        <div className="progress" style={{ height: '8px' }}>
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            style={{ width: `${pct}%` }}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
      <div className="rd-progress-card__bar-meta">
        <span>
          {status?.filesProcessed ?? 0} / {status?.totalFiles ?? 0} files processed
        </span>
        <span>~2 min remaining</span>
      </div>
    </div>
  );
}

function StatsRow({ repo, status }) {
  return (
    <div className="rd-stats dl-fu-4">
      <div className="rd-stat-box">
        <div className="rd-stat-box__label">Files</div>
        <div className="rd-stat-box__value">{status?.totalFiles ?? '—'}</div>
      </div>
      <div className="rd-stat-box">
        <div className="rd-stat-box__label">Language</div>
        <div className="rd-stat-box__value">{repo?.language ?? '—'}</div>
      </div>
      <div className="rd-stat-box">
        <div className="rd-stat-box__label">Chunks</div>
        <div className="rd-stat-box__value">{status?.chunksCreated ?? '—'}</div>
      </div>
      <div className="rd-stat-box">
        <div className="rd-stat-box__label">Status</div>
        <div className="rd-stat-box__value" style={{ fontSize: '0.85rem' }}>{status?.status ?? '—'}</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, enabled }) {
  return (
    <div
      className={`rd-feature-card ${enabled ? 'rd-feature-card--unlocked' : 'rd-feature-card--locked'}`}
      role={enabled ? 'button' : undefined}
      tabIndex={enabled ? 0 : undefined}
      aria-disabled={!enabled}
    >
      <div className="rd-feature-card__icon" aria-hidden="true">{icon}</div>
      <div className="rd-feature-card__title">{title}</div>
      <div className="rd-feature-card__desc">
        {enabled ? desc : 'Available after indexing'}
      </div>
    </div>
  );
}

export default function RepoDetailPage() {
  const { repo, status, isLoading, error, toast, handleDisconnect } = useRepoDetail();

  const isIndexing =
    status?.status === REPO_STATUS.PENDING ||
    status?.status === REPO_STATUS.INDEXING;

  const features = repo?.features ?? {};

  return (
    <AppLayout connectedRepos={[]}>
      <div className="rd-page">
        {/* Breadcrumb */}
        <nav className="rd-breadcrumb dl-fu-1" aria-label="Breadcrumb">
          <Link to={ROUTES.DASHBOARD} className="rd-breadcrumb__link">Dashboard</Link>
          <span className="rd-breadcrumb__sep" aria-hidden="true">›</span>
          <span className="rd-breadcrumb__current">{repo?.name ?? '…'}</span>
        </nav>

        {isLoading && (
          <div className="d-flex align-items-center gap-2">
            <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />
            <span className="visually-hidden">Loading…</span>
            <span style={{ color: 'var(--dl-text-muted)', fontSize: '0.875rem' }}>Loading…</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="rd-error" role="alert" aria-live="assertive">{error}</div>
        )}

        {!isLoading && !error && repo && (
          <>
            {/* Repo header */}
            <div className="rd-repo-header dl-fu-2">
              <div className="rd-repo-header__left">
                <h1 className="rd-repo-header__name">{repo.name}</h1>
                <div className="rd-repo-header__badges">
                  {repo.language && (
                    <span className="rd-badge rd-badge--lang">{repo.language}</span>
                  )}
                  <span className={`rd-badge ${repo.isPrivate ? 'rd-badge--private' : 'rd-badge--public'}`}>
                    {repo.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
              </div>
              <div className="d-flex gap-2">
                <a
                  href={repo.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rd-github-btn"
                  aria-label={`View ${repo.name} on GitHub`}
                >
                  ↗ View on GitHub
                </a>
                <button
                  className="rd-github-btn"
                  onClick={handleDisconnect}
                  aria-label="Disconnect repository"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Indexing progress */}
            {isIndexing && <IndexingProgressCard status={status} />}

            {/* Stats row */}
            <StatsRow repo={repo} status={status} />

            {/* Feature panels */}
            <div className="rd-features dl-fu-5">
              <FeatureCard
                icon="💬"
                title="Chat with codebase"
                desc="Ask questions about your code in natural language."
                enabled={features.chatEnabled}
              />
              <FeatureCard
                icon="✨"
                title="Library recommendations"
                desc="AI suggests better libraries based on your stack."
                enabled={features.recsEnabled}
              />
              <FeatureCard
                icon="🔀"
                title="PR auto-review"
                desc="DevLens posts an AI review comment on new PRs."
                enabled={features.prReviewEnabled}
              />
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="rd-toast" role="status" aria-live="polite">{toast}</div>
      )}
    </AppLayout>
  );
}
