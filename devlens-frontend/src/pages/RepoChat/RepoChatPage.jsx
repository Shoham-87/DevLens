import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import useRepoDetail from '../RepoDetail/useRepoDetail.js';
import useRepoChat from './useRepoChat.js';
import FileTree from './FileTree.jsx';
import CodeViewer from './CodeViewer.jsx';
import ChatPanel from './ChatPanel.jsx';
import { REPO_STATUS, ROUTES } from '../../constants/index.js';
import './RepoChatPage.css';

const STATUS_CLASS = {
  [REPO_STATUS.PENDING]:  'rc-status--pending',
  [REPO_STATUS.INDEXING]: 'rc-status--indexing',
  [REPO_STATUS.READY]:    'rc-status--ready',
  [REPO_STATUS.FAILED]:   'rc-status--failed',
};

export default function RepoChatPage() {
  const { repo, status, isLoading, error } = useRepoDetail();
  const workspace = useRepoChat();

  const repoStatus = status?.status ?? repo?.status;
  const chatReady = repoStatus === REPO_STATUS.READY || repo?.features?.chatEnabled;

  let disabledReason = null;
  if (!chatReady) {
    disabledReason = repoStatus === REPO_STATUS.FAILED
      ? 'Indexing failed for this repo, so chat is unavailable.'
      : 'This repo is still being indexed. Chat unlocks once it reaches READY.';
  }

  return (
    <AppLayout connectedRepos={[]} flush>
      <div className="rc-page">
        <div className="rc-topbar">
          <nav className="rc-crumbs" aria-label="Breadcrumb">
            <Link to={ROUTES.DASHBOARD} className="rc-crumbs__link">Dashboard</Link>
            <span className="rc-crumbs__sep" aria-hidden="true">›</span>
            {repo ? (
              <Link to={ROUTES.REPO_DETAIL(repo.id)} className="rc-crumbs__link rc-crumbs__repo">{repo.name}</Link>
            ) : (
              <span className="rc-crumbs__repo">…</span>
            )}
            <span className="rc-crumbs__sep" aria-hidden="true">›</span>
            <span className="rc-crumbs__current">Chat</span>
          </nav>
          {repoStatus && (
            <span className={`rc-status ${STATUS_CLASS[repoStatus] ?? ''}`}>{repoStatus.toLowerCase()}</span>
          )}
        </div>

        {error && !isLoading && <div className="rc-banner" role="alert">{error}</div>}

        <div className="rc-workspace">
          <FileTree
            tree={workspace.tree}
            fileCount={workspace.fileCount}
            isLoading={workspace.isTreeLoading}
            error={workspace.treeError}
            expanded={workspace.expanded}
            activePath={workspace.openFile?.path}
            onToggle={workspace.toggleDir}
            onSelect={(path) => workspace.selectFile(path)}
          />
          <CodeViewer
            file={workspace.openFile}
            highlight={workspace.highlight}
            isLoading={workspace.isFileLoading}
            error={workspace.fileError}
            repoUrl={repo?.repoUrl}
            defaultBranch={repo?.defaultBranch}
          />
          <ChatPanel
            disabledReason={disabledReason}
            resolvePath={workspace.resolvePath}
            onCitation={workspace.openCitation}
          />
        </div>
      </div>
    </AppLayout>
  );
}
