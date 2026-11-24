import React, { useEffect, useRef, useState } from 'react';
import useChatPanel from './useChatPanel.js';
import { highlightCode } from './highlight.js';
import './ChatPanel.css';

const CITATION = /`([^`\n]+)`\s*\(lines?\s+(\d+)(?:\s*[-–]\s*(\d+))?\)/g;
const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\[[^\]\n]+\]\([^)\s]+\)|(?<![*\w])\*[^*\s][^*\n]*\*(?![*\w])|(?<![_\w])_[^_\s][^_\n]*_(?![_\w]))/g;
const LINK = /^\[([^\]\n]+)\]\(([^)\s]+)\)$/;
const SAFE_URL = /^(https?:|mailto:)/i;

function renderInline(text, keyPrefix, resolvePath, onCitation) {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if ((part.startsWith('**') && part.endsWith('**') && part.length > 4) || (part.startsWith('__') && part.endsWith('__') && part.length > 4)) {
      return <strong key={key}>{renderInline(part.slice(2, -2), key, resolvePath, onCitation)}</strong>;
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return <del key={key}>{renderInline(part.slice(2, -2), key, resolvePath, onCitation)}</del>;
    }
    const link = part.match(LINK);
    if (link) {
      const [, label, href] = link;
      if (resolvePath(href)) {
        return (
          <button key={key} type="button" className="cp-ref" onClick={() => onCitation(href)}>
            {label}
          </button>
        );
      }
      if (SAFE_URL.test(href)) {
        return <a key={key} className="cp-link" href={href} target="_blank" rel="noopener noreferrer">{label}</a>;
      }
      return <React.Fragment key={key}>{label}</React.Fragment>;
    }
    if (part.length > 2 && ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))) {
      return <em key={key}>{renderInline(part.slice(1, -1), key, resolvePath, onCitation)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const value = part.slice(1, -1);
      if (resolvePath(value)) {
        return (
          <button key={key} type="button" className="cp-ref" onClick={() => onCitation(value)}>
            {value}
          </button>
        );
      }
      return <code key={key} className="cp-code">{value}</code>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function renderProse(text, keyPrefix, resolvePath, onCitation) {
  const out = [];
  let last = 0;
  let match;
  CITATION.lastIndex = 0;
  while ((match = CITATION.exec(text)) !== null) {
    if (match.index > last) {
      out.push(...renderInline(text.slice(last, match.index), `${keyPrefix}-t${last}`, resolvePath, onCitation));
    }
    const [, path, start, end] = match;
    const resolvable = resolvePath(path);
    const label = `${path.replace(/\\/g, '/').split('/').pop()}:${start}${end && end !== start ? `–${end}` : ''}`;
    out.push(
      resolvable ? (
        <button
          key={`${keyPrefix}-c${match.index}`}
          type="button"
          className="cp-ref"
          title={`${path} (lines ${start}${end ? `-${end}` : ''})`}
          onClick={() => onCitation(path, Number(start), end ? Number(end) : Number(start))}
        >
          {label}
        </button>
      ) : (
        <code key={`${keyPrefix}-c${match.index}`} className="cp-code">{match[0]}</code>
      )
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    out.push(...renderInline(text.slice(last), `${keyPrefix}-t${last}`, resolvePath, onCitation));
  }
  return out;
}

const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function indentOf(line) {
  return line.match(/^\s*/)[0].replace(/\t/g, '    ').length;
}

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  const cells = [];
  let cell = '';
  let inCode = false;
  for (let i = 0; i < row.length; i += 1) {
    const ch = row[i];
    if (ch === '\\' && row[i + 1] === '|') {
      cell += '|';
      i += 1;
    } else if (ch === '`') {
      inCode = !inCode;
      cell += ch;
    } else if (ch === '|' && !inCode) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function isTableStart(lines, i) {
  return lines[i].includes('|') && i + 1 < lines.length && lines[i + 1].includes('|') && TABLE_DIVIDER.test(lines[i + 1]);
}

function startsBlock(lines, i) {
  const line = lines[i];
  return HEADING.test(line) || RULE.test(line) || LIST_ITEM.test(line) || QUOTE.test(line) || isTableStart(lines, i);
}

function renderTable(lines, keyPrefix, resolvePath, onCitation) {
  const header = splitRow(lines[0]);
  const align = splitRow(lines[1]).map((spec) => {
    if (spec.startsWith(':') && spec.endsWith(':')) return 'center';
    if (spec.endsWith(':')) return 'right';
    return undefined;
  });
  const rows = lines.slice(2).map(splitRow);
  return (
    <div key={keyPrefix} className="cp-table-wrap">
      <table className="cp-table">
        <thead>
          <tr>
            {header.map((cell, c) => (
              <th key={c} style={{ textAlign: align[c] }}>{renderProse(cell, `${keyPrefix}-h${c}`, resolvePath, onCitation)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {header.map((unused, c) => (
                <td key={c} style={{ textAlign: align[c] }}>{renderProse(row[c] ?? '', `${keyPrefix}-r${r}c${c}`, resolvePath, onCitation)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderList(lines, start, keyPrefix, resolvePath, onCitation) {
  const first = lines[start].match(LIST_ITEM);
  const baseIndent = indentOf(lines[start]);
  const ordered = /\d/.test(first[2]);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const match = lines[i].match(LIST_ITEM);
    if (!match || indentOf(lines[i]) !== baseIndent || /\d/.test(match[2]) !== ordered) break;
    const body = [match[3]];
    i += 1;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        const next = lines.slice(i + 1).find((l) => l.trim());
        if (next !== undefined && indentOf(next) > baseIndent) {
          body.push('');
          i += 1;
          continue;
        }
        break;
      }
      if (indentOf(line) > baseIndent) {
        body.push(line);
        i += 1;
        continue;
      }
      if (startsBlock(lines, i)) break;
      body.push(line);
      i += 1;
    }
    const children = body.slice(1);
    const childIndent = Math.min(...children.filter((l) => l.trim()).map(indentOf));
    const rest = Number.isFinite(childIndent) ? children.map((l) => l.slice(Math.min(childIndent, indentOf(l)))) : children;
    items.push({ text: body[0], rest });
    while (i < lines.length && !lines[i].trim()) {
      const next = lines.slice(i + 1).find((l) => l.trim());
      if (next && LIST_ITEM.test(next) && indentOf(next) === baseIndent) i += 1;
      else break;
    }
  }
  const Tag = ordered ? 'ol' : 'ul';
  const startNumber = ordered ? parseInt(first[2], 10) : 1;
  const element = (
    <Tag key={keyPrefix} className="cp-list" start={startNumber !== 1 ? startNumber : undefined}>
      {items.map((item, n) => (
        <li key={n}>
          {renderProse(item.text, `${keyPrefix}-i${n}`, resolvePath, onCitation)}
          {item.rest.some((l) => l.trim()) && renderBlocks(item.rest.join('\n'), `${keyPrefix}-i${n}b`, resolvePath, onCitation)}
        </li>
      ))}
    </Tag>
  );
  return { element, next: i };
}

function renderBlocks(text, keyPrefix, resolvePath, onCitation) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `${keyPrefix}-b${i}`;
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      const Tag = `h${Math.min(level + 2, 6)}`;
      out.push(<Tag key={key} className={`cp-h cp-h${level}`}>{renderProse(heading[2], key, resolvePath, onCitation)}</Tag>);
      i += 1;
      continue;
    }
    if (RULE.test(line)) {
      out.push(<hr key={key} className="cp-rule" />);
      i += 1;
      continue;
    }
    if (isTableStart(lines, i)) {
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(tableLines, key, resolvePath, onCitation));
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(lines[i].match(QUOTE)[1]);
        i += 1;
      }
      out.push(<blockquote key={key} className="cp-quote">{renderBlocks(quoted.join('\n'), key, resolvePath, onCitation)}</blockquote>);
      continue;
    }
    if (LIST_ITEM.test(line)) {
      const { element, next } = renderList(lines, i, key, resolvePath, onCitation);
      out.push(element);
      i = next;
      continue;
    }
    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    out.push(<p key={key} className="cp-p">{renderProse(paragraph.join('\n'), key, resolvePath, onCitation)}</p>);
  }
  return out;
}

const FENCE_ALIASES = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', yml: 'yaml', html: 'xml', kt: 'kotlin', cs: 'csharp' };

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (!ok) throw new Error('Copy failed');
}

function CodeBlock({ code, lang }) {
  const [copyState, setCopyState] = useState('idle');
  const timerRef = useRef(null);
  const html = highlightCode(code, FENCE_ALIASES[lang] ?? lang);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function handleCopy() {
    try {
      await copyText(code);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState('idle'), 1800);
  }

  const label = copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy';

  return (
    <div className="cp-codeblock">
      <div className="cp-codeblock__bar">
        <span className="cp-codeblock__lang">{lang || 'code'}</span>
        <button
          type="button"
          className={`cp-codeblock__copy${copyState === 'copied' ? ' cp-codeblock__copy--done' : ''}`}
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
        >
          {label}
        </button>
      </div>
      <pre className="cp-block syn" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function MessageBody({ content, resolvePath, onCitation }) {
  const segments = content.split(/```([^\n`]*)\n?/);
  const out = [];
  for (let i = 0; i < segments.length; i += 3) {
    out.push(
      <React.Fragment key={`p${i}`}>{renderBlocks(segments[i], `s${i}`, resolvePath, onCitation)}</React.Fragment>
    );
    if (i + 2 < segments.length) {
      const lang = segments[i + 1].trim().toLowerCase();
      out.push(<CodeBlock key={`c${i}`} code={segments[i + 2].replace(/\n$/, '')} lang={lang} />);
    }
  }
  return out;
}

function ChatMessage({ role, content, resolvePath, onCitation }) {
  const isUser = role === 'user';
  return (
    <div className={`cp-message ${isUser ? 'cp-message--user' : 'cp-message--assistant'}`}>
      <div className="cp-message__who">{isUser ? 'You' : 'DevLens'}</div>
      <div className={`cp-message__body${isUser ? '' : ' cp-md'}`}>
        {!content && <span className="cp-message__typing" aria-label="Waiting for answer" />}
        {content && (isUser ? content : <MessageBody content={content} resolvePath={resolvePath} onCitation={onCitation} />)}
      </div>
    </div>
  );
}

export default function ChatPanel({ disabledReason, resolvePath = () => null, onCitation = () => {} }) {
  const {
    messages,
    currentInput,
    setCurrentInput,
    isStreaming,
    error,
    sendMessage,
    cancelStreaming,
    clearMessages,
  } = useChatPanel();

  const historyRef = useRef(null);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isDisabled = Boolean(disabledReason);

  return (
    <section className="rc-pane rc-pane--chat cp-panel" aria-label="Chat with codebase">
      <header className="rc-pane__head">
        <span className="rc-pane__title">Chat</span>
        {messages.length > 0 && !isStreaming && (
          <button type="button" className="cp-clear" onClick={clearMessages}>Clear</button>
        )}
      </header>

      <div className="cp-panel__history" ref={historyRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="cp-panel__empty">
            {isDisabled ? disabledReason : (
              <>
                <p>Ask where something lives or how a piece of code works.</p>
                <p className="cp-panel__hint">File references in answers open in the code view.</p>
              </>
            )}
          </div>
        )}
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
            resolvePath={resolvePath}
            onCitation={onCitation}
          />
        ))}
      </div>

      {error && (
        <div className="cp-panel__error" role="alert">{error}</div>
      )}

      <form className="cp-panel__composer" onSubmit={handleSubmit}>
        <textarea
          className="cp-panel__input"
          rows={2}
          placeholder={isDisabled ? 'Chat unlocks once indexing finishes' : 'Ask about this repo…'}
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming || isDisabled}
          aria-label="Chat message"
        />
        {isStreaming ? (
          <button type="button" className="cp-panel__send cp-panel__send--stop" onClick={cancelStreaming}>
            Stop
          </button>
        ) : (
          <button type="submit" className="cp-panel__send" disabled={!currentInput.trim() || isDisabled}>
            Send
          </button>
        )}
      </form>
    </section>
  );
}
