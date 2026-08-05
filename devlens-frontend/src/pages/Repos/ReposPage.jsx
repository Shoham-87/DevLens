import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import useRepos from './useRepos.js';
import { ROUTES } from '../../constants/index.js';
import './ReposPage.css';

const LANG_BADGE_CLASS = {
  Java:       'java',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python:     'python',
  Go:         'go',
  Rust:       'rust',
};

function LangBadge({ language }) {
  if (!language) return null;
  const key = LANG_BADGE_CLASS[language] || 'default';
  return (
    <span className={`repo-row__lang-badge repo-row__lang-badge--${key}`}>
      {language}
    </span>
  );
}

function RepoRow({ repo, isSelected, onSelect }) {
  const alreadyConnected = repo.alreadyConnected;

  function handleClick() {
    if (!alreadyConnected) onSelect(repo.id);
  }

  function handleKeyDown(e) {
    if (!alreadyConnected && e.key === 'Enter') onSelect(repo.id);
  }

  return (
    <div
      className={
        'repo-row' +
        (isSelected ? ' repo-row--selected' : '') +
        (alreadyConnected ? ' repo-row--already-connected' : '')
      }
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={alreadyConnected ? undefined : 'option'}
      aria-selected={isSelected}
      tabIndex={alreadyConnected ? undefined : 0}
    >
      <span className="repo-row__icon" aria-label={repo.isPrivate ? 'Private' : 'Public'}>
        {repo.isPrivate ? '🔒' : '🌐'}
      </span>

      <div className="repo-row__info">
        <div className="repo-row__name">{repo.name}</div>
        <div className="repo-row__meta">
          <LangBadge language={repo.language} />
          {repo.updatedAt && (
            <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {alreadyConnected && (
        <span className="repo-row__connected-badge">Connected</span>
      )}
    </div>
  );
}

export default function ReposPage() {
  const navigate = useNavigate();
  const {
    filteredRepos,
    availableLanguages,
    isLoading,
    isConnecting,
    error,
    selectedRepoId,
    searchQuery,
    languageFilter,
    handleSearch,
    handleLanguageFilter,
    handleSelectRepo,
    handleConnect,
  } = useRepos();

  return (
    <AppLayout connectedRepos={[]}>
      <div className="repo-page">
        <button
          className="repo-back-btn dl-fu-1"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          aria-label="Back to Dashboard"
        >
          ← Back
        </button>

        <div className="repo-header dl-fu-2">
          <h1 className="repo-header__title">Connect a repository</h1>
          <p className="repo-header__sub">
            Select a GitHub repository to connect and start indexing.
          </p>
        </div>

        <div className="repo-filters dl-fu-3">
          <input
            id="repo-search"
            type="text"
            className="form-control repo-filters__search"
            placeholder="Search repositories…"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search repositories"
          />
          <select
            id="repo-lang-filter"
            className="form-select repo-filters__lang"
            value={languageFilter}
            onChange={(e) => handleLanguageFilter(e.target.value)}
            aria-label="Filter by language"
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="repo-error" role="alert" aria-live="assertive">{error}</div>
        )}

        {isLoading ? (
          <div className="d-flex align-items-center gap-2 dl-fu-3">
            <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />
            <span className="visually-hidden">Loading…</span>
            <span style={{ color: 'var(--dl-text-muted)', fontSize: '0.875rem' }}>Loading repositories…</span>
          </div>
        ) : (
          <>
            <div
              className="repo-list dl-fu-4"
              role="listbox"
              aria-label="GitHub repositories"
            >
              {filteredRepos.length === 0 && (
                <div style={{ padding: 'var(--dl-space-lg)', color: 'var(--dl-text-muted)', textAlign: 'center', fontSize: '0.875rem' }}>
                  No repositories match your search.
                </div>
              )}
              {filteredRepos.map((repo) => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  isSelected={selectedRepoId === repo.id}
                  onSelect={handleSelectRepo}
                />
              ))}
            </div>

            <div className="repo-connect-bar dl-fu-5">
              <button
                className="btn btn-primary repo-connect-btn"
                onClick={handleConnect}
                disabled={!selectedRepoId || isConnecting}
                aria-label="Connect selected repository"
              >
                {isConnecting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    <span className="visually-hidden">Loading…</span>
                    Connecting…
                  </>
                ) : (
                  'Connect selected repo'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
