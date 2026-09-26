import { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Splits a raw SSE byte buffer into complete events, keeping any
// trailing partial event in `remainder` until more bytes arrive.
// Spring's SseEmitter writes fields as "event:<name>\n" / "data:<value>\n"
// (no space after the colon) with a blank line terminating each event.
function parseSseBuffer(buffer) {
  const events = [];
  let rest = buffer;
  let splitIndex = rest.indexOf('\n\n');

  while (splitIndex !== -1) {
    const rawEvent = rest.slice(0, splitIndex);
    rest = rest.slice(splitIndex + 2);

    let eventName = 'message';
    const dataLines = [];
    for (const line of rawEvent.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5));
      }
    }

    events.push({ event: eventName, data: dataLines.join('\n') });
    splitIndex = rest.indexOf('\n\n');
  }

  return { events, remainder: rest };
}

export default function useChatPanel() {
  const { repoId } = useParams();
  const { token } = useAuth();

  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const appendToLastAssistantMessage = useCallback((text) => {
    setMessages((prev) => {
      const next = [...prev];
      const lastIndex = next.length - 1;
      next[lastIndex] = { ...next[lastIndex], content: next[lastIndex].content + text };
      return next;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    const question = currentInput.trim();
    if (!question || isStreaming) return;

    const history = messages.map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '' },
    ]);
    setCurrentInput('');
    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/devlens/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          connectedRepoId: repoId,
          question,
          conversationHistory: history,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = parseSseBuffer(buffer);
        buffer = remainder;

        for (const evt of events) {
          // eslint-disable-next-line no-console
          console.log('[chat sse]', evt.event, JSON.stringify(evt.data));

          if (evt.event === 'error') {
            throw new Error(evt.data || 'Chat stream reported an error');
          }
          if (evt.data) {
            appendToLastAssistantMessage(evt.data);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // eslint-disable-next-line no-console
        console.error('Chat stream failed:', err);
        setError('Something went wrong while getting a response.');
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [currentInput, isStreaming, messages, repoId, token, appendToLastAssistantMessage]);

  const cancelStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    currentInput,
    setCurrentInput,
    isStreaming,
    error,
    sendMessage,
    cancelStreaming,
  };
}
