import React, { useMemo, useState } from 'react';
import { fileColor } from './highlight.js';

function collectFiles(node, out = []) {
  for (const child of node.children) {
    if (child.type === 'file') out.push(child);
    else collectFiles(child, out);
  }
  return out;
}

function TreeNode({ node, depth, expanded, activePath, onToggle, onSelect }) {
  const isDir = node.type === 'dir';
  const isOpen = isDir && expanded.has(node.path);
  const isActive = !isDir && node.path === activePath;

  return (
    <li role="treeitem" aria-expanded={isDir ? isOpen : undefined} aria-selected={isActive}>
      <button
        type="button"
        className={`ft-row ${isDir ? 'ft-row--dir' : 'ft-row--file'} ${isActive ? 'ft-row--active' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px`, ...(isDir ? {} : { '--ft-color': fileColor(node.path) }) }}
        onClick={() => (isDir ? onToggle(node.path) : onSelect(node.path))}
        title={node.path}
      >
        <span className="ft-row__caret" aria-hidden="true">{isDir ? (isOpen ? '▾' : '▸') : ''}</span>
        <span className="ft-row__name">{node.name}</span>
      </button>
      {isOpen && node.children.length > 0 && (
        <ul className="ft-list" role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              activePath={activePath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FileTree({ tree, fileCount, isLoading, error, expanded, activePath, onToggle, onSelect }) {
  const [query, setQuery] = useState('');

  const allFiles = useMemo(() => collectFiles(tree), [tree]);
  const trimmed = query.trim().toLowerCase();
  const matches = useMemo(
    () => (trimmed ? allFiles.filter((f) => f.path.toLowerCase().includes(trimmed)).slice(0, 200) : []),
    [allFiles, trimmed]
  );

  return (
    <section className="rc-pane rc-pane--tree" aria-label="Files">
      <header className="rc-pane__head">
        <span className="rc-pane__title">Files</span>
        {!isLoading && !error && <span className="rc-pane__meta">{fileCount}</span>}
      </header>

      <div className="ft-search">
        <input
          type="search"
          className="ft-search__input"
          placeholder="Filter files"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter files"
        />
      </div>

      <div className="rc-pane__body ft-body">
        {isLoading && <p className="rc-muted">Loading files…</p>}
        {error && <p className="rc-error-text">{error}</p>}

        {!isLoading && !error && trimmed && (
          matches.length === 0 ? (
            <p className="rc-muted">No files match “{query.trim()}”.</p>
          ) : (
            <ul className="ft-list" role="listbox" aria-label="Matching files">
              {matches.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    className={`ft-row ft-row--file ft-row--match ${file.path === activePath ? 'ft-row--active' : ''}`}
                    onClick={() => onSelect(file.path)}
                    title={file.path}
                    style={{ '--ft-color': fileColor(file.path) }}
                  >
                    <span className="ft-row__name">{file.name}</span>
                    <span className="ft-row__dir">{file.path.slice(0, -file.name.length - 1)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {!isLoading && !error && !trimmed && (
          <ul className="ft-list" role="tree" aria-label="Repository files">
            {tree.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={0}
                expanded={expanded}
                activePath={activePath}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
