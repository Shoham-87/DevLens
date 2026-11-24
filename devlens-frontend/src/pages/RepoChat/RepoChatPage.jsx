import React, { useCallback, useRef, useState } from 'react';
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

const CHAT_WIDTH_KEY = 'devlens.chatWidth';
const CHAT_MIN_WIDTH = 280;
const CODE_MIN_WIDTH = 320;

function readChatWidth() {
  try {
    const stored = Number(localStorage.getItem(CHAT_WIDTH_KEY));
    return stored >= CHAT_MIN_WIDTH ? stored : null;
  } catch {
    return null;
  }
}

function saveChatWidth(width) {
  try {
    if (width) localStorage.setItem(CHAT_WIDTH_KEY, String(Math.round(width)));
    else localStorage.removeItem(CHAT_WIDTH_KEY);
  } catch {
    return;
  }
}

function useChatResize() {
  const workspaceRef = useRef(null);
  const [chatWidth, setChatWidth] = useState(readChatWidth);
  const [isResizing, setIsResizing] = useState(false);

  const clamp = useCallback((width) => {
    const el = workspaceRef.current;
    if (!el) return width;
    const treeWidth = el.firstElementChild?.getBoundingClientRect().width ?? 0;
    const max = Math.max(CHAT_MIN_WIDTH, el.getBoundingClientRect().width - treeWidth - CODE_MIN_WIDTH);
    return Math.min(Math.max(width, CHAT_MIN_WIDTH), max);
  }, []);

  const onPointerDown = useCallback((e) => {
    const el = workspaceRef.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    setIsResizing(true);
    let latest = null;
    function onMove(ev) {
      latest = clamp(el.getBoundingClientRect().right - ev.clientX);
      setChatWidth(latest);
    }
    function onUp() {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      setIsResizing(false);
      if (latest) saveChatWidth(latest);
    }
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }, [clamp]);

  const onKeyDown = useCallback((e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const current = workspaceRef.current?.lastElementChild?.getBoundingClientRect().width ?? CHAT_MIN_WIDTH;
    const next = clamp(current + (e.key === 'ArrowLeft' ? 24 : -24));
    setChatWidth(next);
    saveChatWidth(next);
  }, [clamp]);

  const reset = useCallback(() => {
    setChatWidth(null);
    saveChatWidth(null);
  }, []);

  return { workspaceRef, chatWidth, isResizing, onPointerDown, onKeyDown, reset };
}

export default function RepoChatPage() {
  const { repo, status, isLoading, error } = useRepoDetail();
  const workspace = useRepoChat();
  const resize = useChatResize();

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

        <div
          className={`rc-workspace${resize.isResizing ? ' rc-workspace--resizing' : ''}`}
          ref={resize.workspaceRef}
          style={resize.chatWidth ? { '--rc-chat-width': `${resize.chatWidth}px` } : undefined}
        >
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
          <div
            className="rc-resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
            tabIndex={0}
            title="Drag to resize, double-click to reset"
            onPointerDown={resize.onPointerDown}
            onKeyDown={resize.onKeyDown}
            onDoubleClick={resize.reset}
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
