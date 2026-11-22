import React, { useEffect, useRef } from 'react';
import useChatPanel from './useChatPanel.js';
import { highlightCode } from './highlight.js';
import './ChatPanel.css';

const CITATION = /`([^`\n]+)`\s*\(lines?\s+(\d+)(?:\s*[-–]\s*(\d+))?\)/g;
const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;

function renderInline(text, keyPrefix, resolvePath, onCitation) {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
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

const FENCE_ALIASES = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', yml: 'yaml', html: 'xml', kt: 'kotlin', cs: 'csharp' };

function MessageBody({ content, resolvePath, onCitation }) {
  const segments = content.split(/```([^\n`]*)\n?/);
  const out = [];
  for (let i = 0; i < segments.length; i += 3) {
    out.push(
      <React.Fragment key={`p${i}`}>{renderProse(segments[i], `s${i}`, resolvePath, onCitation)}</React.Fragment>
    );
    if (i + 2 < segments.length) {
      const lang = segments[i + 1].trim().toLowerCase();
      const html = highlightCode(segments[i + 2].replace(/\n$/, ''), FENCE_ALIASES[lang] ?? lang);
      out.push(<pre key={`c${i}`} className="cp-block syn" dangerouslySetInnerHTML={{ __html: html }} />);
    }
  }
  return out;
}

function ChatMessage({ role, content, resolvePath, onCitation }) {
  const isUser = role === 'user';
  return (
    <div className={`cp-message ${isUser ? 'cp-message--user' : 'cp-message--assistant'}`}>
      <div className="cp-message__who">{isUser ? 'You' : 'DevLens'}</div>
      <div className="cp-message__body">
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
