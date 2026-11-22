import useChatPanel from './useChatPanel.js';
import './ChatPanel.css';

function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`cp-message ${isUser ? 'cp-message--user' : 'cp-message--assistant'}`}>
      <div className="cp-message__avatar" aria-hidden="true">{isUser ? '🧑' : '💬'}</div>
      <div className="cp-message__bubble">
        {content ? content : <span className="cp-message__typing" aria-label="Assistant is typing" />}
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const {
    messages,
    currentInput,
    setCurrentInput,
    isStreaming,
    error,
    sendMessage,
    cancelStreaming,
  } = useChatPanel();

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

  return (
    <div className="cp-panel dl-fu-6" aria-label="Chat with codebase">
      <div className="cp-panel__history" aria-live="polite">
        {messages.length === 0 && (
          <div className="cp-panel__empty">
            Ask anything about this codebase — file locations, how a function works, or where something is implemented.
          </div>
        )}
        {messages.map((message, index) => (
          <ChatMessage key={index} role={message.role} content={message.content} />
        ))}
      </div>

      {error && (
        <div className="cp-panel__error" role="alert">{error}</div>
      )}

      <form className="cp-panel__composer" onSubmit={handleSubmit}>
        <input
          type="text"
          className="cp-panel__input"
          placeholder="Ask a question about this repo…"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          aria-label="Chat message"
        />
        {isStreaming ? (
          <button type="button" className="cp-panel__send cp-panel__send--stop" onClick={cancelStreaming}>
            Stop
          </button>
        ) : (
          <button type="submit" className="cp-panel__send" disabled={!currentInput.trim()}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}
