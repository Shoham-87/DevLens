import React, { useEffect, useMemo, useRef } from 'react';
import { highlightLines, languageForPath } from './highlight.js';

export default function CodeViewer({ file, highlight, isLoading, error, repoUrl, defaultBranch }) {
  const bodyRef = useRef(null);

  const lines = useMemo(
    () => (typeof file?.content === 'string'
      ? highlightLines(file.content.replace(/\r\n/g, '\n'), languageForPath(file.path))
      : []),
    [file?.content, file?.path]
  );

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (!highlight) {
      body.scrollTop = 0;
      return;
    }
    const target = body.querySelector(`[data-line="${highlight.start}"]`);
    if (target) {
      body.scrollTop = Math.max(target.offsetTop - body.clientHeight / 3, 0);
    }
  }, [highlight, lines]);

  const githubLink = file && repoUrl
    ? `${repoUrl}/blob/${defaultBranch || 'HEAD'}/${file.path}${highlight ? `#L${highlight.start}-L${highlight.end}` : ''}`
    : null;

  const isHighlighted = (n) => highlight && n >= highlight.start && n <= highlight.end;

  return (
    <section className="rc-pane rc-pane--code" aria-label="Code viewer">
      <header className="rc-pane__head">
        {file ? (
          <>
            <span className="cv-path" title={file.path}>
              {file.path.split('/').map((part, i, arr) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="cv-path__sep">/</span>}
                  <span className={i === arr.length - 1 ? 'cv-path__file' : ''}>{part}</span>
                </React.Fragment>
              ))}
            </span>
            <span className="rc-pane__actions">
              {highlight && (
                <span className="rc-pane__meta">L{highlight.start}{highlight.end !== highlight.start ? `–${highlight.end}` : ''}</span>
              )}
              {githubLink && (
                <a className="cv-link" href={githubLink} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
              )}
            </span>
          </>
        ) : (
          <span className="rc-pane__title">Code</span>
        )}
      </header>

      <div className="rc-pane__body cv-body" ref={bodyRef}>
        {!file && !isLoading && (
          <div className="cv-empty">
            <p>Pick a file on the left, or click a file reference in a chat answer to jump to it.</p>
          </div>
        )}

        {isLoading && <p className="rc-muted cv-pad">Loading…</p>}
        {error && !isLoading && <p className="rc-error-text cv-pad">{error}</p>}
        {file?.notice && !isLoading && <p className="rc-muted cv-pad">{file.notice}</p>}

        {!isLoading && !error && typeof file?.content === 'string' && (
          <table className="cv-table">
            <tbody>
              {lines.map((line, i) => {
                const n = i + 1;
                return (
                  <tr key={n} data-line={n} className={isHighlighted(n) ? 'cv-line--hl' : undefined}>
                    <td className="cv-gutter">{n}</td>
                    <td className="cv-code syn" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
