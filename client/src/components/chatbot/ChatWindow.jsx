/**
 * The assistant chat panel.
 *
 * Works for guests (no history is persisted) and signed-in users (full
 * conversation history, rename, delete, per-answer feedback).
 *
 * Behaviour notes:
 *  • Auto-scrolls to the newest message, but yields to the user if they have
 *    scrolled up to read history.
 *  • Sends are rate-limited client-side too, so a fast double-submit cannot
 *    burn a server-side attempt.
 *  • Every error surfaces the server's own message rather than a generic one.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Trash2, Plus, LogIn, History, PanelLeftClose, PanelLeft } from 'lucide-react';

import { chatApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage, ConversationItem, ThinkingDots } from './ChatMessage';
import SuggestedQuestions from './SuggestedQuestions';
import AIOrb from './AIOrb';
import Disclaimer from '../common/Disclaimer';
import Loader from '../common/Loader';

const GREETING = {
  role: 'assistant',
  content: [
    'Hello — I am your **AI Loan Information Assistant**.',
    '',
    'I can explain loan terminology, the factors behind eligibility, the documents lenders usually ask for, and how repayment works.',
    '',
    'I also have an EMI calculator and a document checklist. Ask me anything, or pick one of the suggestions below.',
  ].join('\n'),
  source: 'offline_knowledge',
};

const MAX_LENGTH = 1500;

export default function ChatWindow({ embedded = false, initialConversationId, initialQuestion }) {
  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(initialConversationId ?? null);
  const [showHistory, setShowHistory] = useState(!embedded);
  const [feedback, setFeedback] = useState({});

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottom = useRef(true);

  /* ── Load suggestions once ─────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    chatApi
      .suggestions()
      .then((data) => {
        if (!cancelled) setSuggestions(data?.suggestions || null);
      })
      .catch(() => {
        /* suggestions are cosmetic — stay quiet on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Load history for signed-in users ──────────────────────────── */
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await chatApi.conversations({ limit: 30 });
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      /* history is not critical */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /* ── Scroll management ─────────────────────────────────────────── */
  const onScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottom.current = distance < 90;
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !stickToBottom.current) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  /* ── Send ──────────────────────────────────────────────────────── */
  const send = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || busy) return;

      setError(null);
      setBusy(true);
      setInput('');

      const userMessage = { role: 'user', content: text, id: `local-${Date.now()}` };
      const pendingId = `pending-${Date.now()}`;
      setMessages((current) => [
        ...current,
        userMessage,
        { role: 'assistant', content: '', pending: true, id: pendingId },
      ]);

      try {
        const reply = await chatApi.send({
          message: text,
          conversationId: activeId || undefined,
        });

        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId
              ? {
                  role: 'assistant',
                  content: reply.reply,
                  source: reply.source,
                  confidence: reply.confidence,
                  latencyMs: reply.latencyMs,
                  creditCost: reply.creditCost,
                  followUps: reply.followUps,
                  offlineNotice: reply.offlineNotice,
                  degraded: reply.degraded,
                  id: `assistant-${reply.messageId || pendingId}`,
                  // The persisted row id. `null` for guests, who cannot be rated.
                  dbId: reply.messageId ?? null,
                  onFollowUp: send,
                }
              : message,
          ),
        );

        if (reply.conversationId) setActiveId(reply.conversationId);
        if (isAuthenticated) loadConversations();
      } catch (err) {
        setMessages((current) => current.filter((message) => message.id !== pendingId));
        setError(err.message || 'Could not reach the assistant. Please try again.');
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [activeId, busy, isAuthenticated, loadConversations],
  );

  /* ── Deep-linked question (?q=…) is asked once, after mount ─────── */
  const autoAsked = useRef(false);
  useEffect(() => {
    if (autoAsked.current || !initialQuestion) return;
    autoAsked.current = true;
    const id = setTimeout(() => send(initialQuestion), 280);
    return () => clearTimeout(id);
  }, [initialQuestion, send]);

  /* ── History actions ───────────────────────────────────────────── */
  const openConversation = useCallback(async (id) => {
    setError(null);
    try {
      const data = await chatApi.conversation(id);
      const history = (data.messages || [])
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          role: message.role,
          content: message.content,
          source: message.source === 'openai' ? 'openai' : 'offline_knowledge',
          latencyMs: message.latencyMs,
          id: `msg-${message.id}`,
          dbId: message.role === 'assistant' ? message.id : null,
        }));

      setMessages([
        GREETING,
        ...history.map((message) =>
          message.role === 'assistant' ? { ...message, onFollowUp: send } : message,
        ),
      ]);
      setActiveId(id);
      stickToBottom.current = true;
    } catch (err) {
      setError(err.message || 'Could not open that conversation.');
    }
  }, [send]);

  /*
   * A saved conversation can be linked directly (?c=<id>). Following a second
   * conversation link while this component is already mounted changes the prop
   * without remounting, so switch over instead of keeping the first selection.
   * Declared after `openConversation` because the dependency is read while
   * rendering, before the hook below would otherwise exist.
   */
  useEffect(() => {
    if (!initialConversationId || initialConversationId === activeId) return;
    openConversation(initialConversationId);
  }, [initialConversationId, openConversation, activeId]);

  const deleteConversation = useCallback(
    async (id) => {
      try {
        await chatApi.remove(id);
        setConversations((current) => current.filter((item) => item.id !== id));
        if (id === activeId) {
          setActiveId(null);
          setMessages([GREETING]);
        }
      } catch (err) {
        setError(err.message || 'Could not delete that conversation.');
      }
    },
    [activeId],
  );

  const newConversation = useCallback(() => {
    setActiveId(null);
    setMessages([GREETING]);
    setError(null);
    inputRef.current?.focus();
  }, []);

  /**
   * Feedback is keyed on the persisted assistant message id. Guest answers and
   * still-pending answers have no database row, so they are not rateable.
   */
  const sendFeedback = useCallback(async (messageId, rating) => {
    if (!isAuthenticated || !messageId) return;
    setFeedback((current) => ({ ...current, [messageId]: rating }));
    try {
      await chatApi.feedback(messageId, { rating });
    } catch {
      /* feedback is best-effort */
    }
  }, [isAuthenticated]);

  /* ── Render ────────────────────────────────────────────────────── */
  const offlineNotice = messages.find(
    (message) => message.role === 'assistant' && message.offlineNotice,
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-tint/[0.08] bg-ink-900/70 backdrop-blur-xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-tint/[0.07] px-4 py-3">
        <AIOrb thinking={busy} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-mist-50">AI Loan Assistant</p>
          <p className="flex items-center gap-1.5 text-2xs text-mist-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                busy ? 'animate-pulse bg-gold-300' : 'bg-positive'
              }`}
            />
            {busy ? 'Thinking…' : 'Ready'}
          </p>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={newConversation}
              title="New conversation"
              className="rounded-lg p-2 text-mist-400 transition-colors hover:bg-tint/[0.06] hover:text-mist-100"
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={() => setShowHistory((value) => !value)}
              title={showHistory ? 'Hide history' : 'Show history'}
              className="rounded-lg p-2 text-mist-400 transition-colors hover:bg-tint/[0.06] hover:text-mist-100"
            >
              {showHistory ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── History sidebar ── */}
        {isAuthenticated && showHistory && (
          <aside className="hidden w-60 shrink-0 flex-col border-r border-tint/[0.07] lg:flex">
            <p className="px-4 pb-2 pt-4 text-2xs font-semibold uppercase tracking-wide3 text-mist-500">
              <History size={10} className="mr-1 inline" strokeWidth={2.4} />
              History
            </p>
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
              {conversations.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-mist-600">
                  No saved conversations yet.
                </p>
              )}
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === activeId}
                  onSelect={openConversation}
                  onDelete={deleteConversation}
                />
              ))}
            </div>
          </aside>
        )}

        {/* ── Conversation ── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5"
            role="log"
            aria-live="polite"
            aria-label="Conversation"
          >
            {messages.length === 1 ? (
              <div className="grid gap-6 pt-2">
                <div className="flex flex-col items-center gap-3 text-center">
                  <AIOrb size={132} />
                  <div>
                    <p className="text-sm font-semibold text-mist-100">
                      What would you like to understand?
                    </p>
                    <p className="mt-1 text-xs text-mist-500">
                      Educational answers, grounded in the curated knowledge base.
                    </p>
                  </div>
                </div>
                <SuggestedQuestions
                  suggestions={suggestions}
                  onSelect={(question) => send(question)}
                />
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessage
                  key={message.id || `${message.role}-${index}`}
                  message={message}
                  onFeedback={isAuthenticated ? sendFeedback : undefined}
                  feedbackGiven={feedback[message.dbId]}
                />
              ))
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-mist-200"
              >
                {error}
              </div>
            )}

            {offlineNotice && messages.length > 1 && (
              <p className="pt-1 text-center text-2xs text-mist-600">
                Running on the built-in knowledge base — set an OpenAI key on the server to enable
                model-generated answers.
              </p>
            )}
          </div>

          {/* ── Composer ── */}
          <div className="border-t border-tint/[0.07] px-4 py-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor="chat-input" className="sr-only">
                Ask a question about loans
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={MAX_LENGTH}
                disabled={busy}
                placeholder={
                  isAuthenticated
                    ? 'Ask about EMI, eligibility, documents, prepayment…'
                    : 'Ask about EMI, eligibility, documents… (sign in to save history)'
                }
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  // Enter sends; Shift+Enter makes a new line.
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
                className="field max-h-32 min-h-[2.75rem] flex-1 resize-none py-2.5"
                style={{ scrollBehavior: 'auto' }}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="btn-primary h-11 w-11 shrink-0 px-0"
                aria-label="Send message"
              >
                {busy ? <Loader size={16} /> : <Send size={16} />}
              </button>
            </form>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Disclaimer />
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-2xs font-semibold text-brand-300 transition-colors hover:text-brand-200"
                >
                  <LogIn size={11} />
                  Sign in to save history
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { GREETING as chatGreeting, ThinkingDots };
