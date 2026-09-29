/**
 * A single chat turn.
 *
 * Renders assistant markdown with GFM, converts internal `/path` links into
 * router links, and shows the source/confidence metadata the API returns so
 * the user always knows whether an answer came from the model or the
 * curated offline knowledge base.
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, ThumbsDown, ThumbsUp, WifiOff, ShieldAlert, Sparkles } from 'lucide-react';
import { AIOrbMini } from './AIOrb';

const money = (value) =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

/** Rewrite internal markdown links to react-router links. */
function LinkRenderer({ href, children, ...props }) {
  if (href?.startsWith('/')) {
    return (
      <Link to={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
      {children}
    </a>
  );
}

const SOURCE_META = {
  openai: { label: 'AI generated', tone: 'brand', icon: Sparkles },
  offline_knowledge: { label: 'From knowledge base', tone: 'neutral', icon: WifiOff },
  guardrail: { label: 'Safety response', tone: 'caution', icon: ShieldAlert },
};

export const ChatMessage = memo(function ChatMessage({
  message,
  onFeedback,
  feedbackGiven,
}) {
  const isUser = message.role === 'user';
  const source = message.source || 'offline_knowledge';
  const meta = SOURCE_META[source] || SOURCE_META.offline_knowledge;
  const SourceIcon = meta.icon;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-tint/10 bg-tint/[0.05] text-mist-300">
            <User size={14} strokeWidth={2} />
          </span>
        ) : (
          <AIOrbMini thinking={message.pending} size={32} />
        )}
      </div>

      <div className={`min-w-0 max-w-[min(46rem,88%)] ${isUser ? 'items-end' : ''} flex flex-col gap-1.5`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'rounded-tr-sm border border-brand-400/25 bg-brand-500/12 text-mist-100'
              : 'glass glass-edge rounded-tl-sm text-mist-200'
          }`}
        >
          {message.pending ? (
            <ThinkingDots />
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{message.content}</p>
          ) : (
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: LinkRenderer }}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Meta row — only for assistant messages that have finished. */}
        {!isUser && !message.pending && (
          <div className="flex flex-wrap items-center gap-2 pl-1">
            <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-mist-500">
              <SourceIcon size={11} strokeWidth={2} />
              {meta.label}
            </span>

            {typeof message.latencyMs === 'number' && message.latencyMs > 0 && (
              <span className="text-2xs text-mist-600 tnum">{message.latencyMs} ms</span>
            )}

            {message.creditCost ? (
              <span className="text-2xs text-mist-600 tnum">
                {message.creditCost} credit{message.creditCost === 1 ? '' : 's'}
              </span>
            ) : null}

            {onFeedback && message.dbId && (
              <span className="ml-1 inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onFeedback(message.dbId, 'up')}
                  aria-label="Mark this answer helpful"
                  className={`rounded-md p-1 transition-colors ${
                    feedbackGiven === 'up'
                      ? 'text-positive'
                      : 'text-mist-600 hover:text-mist-300'
                  }`}
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(message.dbId, 'down')}
                  aria-label="Mark this answer unhelpful"
                  className={`rounded-md p-1 transition-colors ${
                    feedbackGiven === 'down'
                      ? 'text-negative'
                      : 'text-mist-600 hover:text-mist-300'
                  }`}
                >
                  <ThumbsDown size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Follow-up suggestions returned by the API. */}
        {!isUser && !message.pending && message.followUps?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5 pl-1">
            {message.followUps.slice(0, 4).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => message.onFollowUp?.(question)}
                className="rounded-lg border border-tint/10 bg-tint/[0.03] px-2.5 py-1.5 text-2xs text-mist-300 transition-colors hover:border-gold-400/30 hover:text-gold-200"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

/** "Thinking" indicator — three damped dots, not a spinner. */
export function ThinkingDots() {
  return (
    <span className="flex items-center gap-1.5 py-1" role="status" aria-label="Assistant is thinking">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-gold-300"
          style={{
            animation: `orb-pulse 1.1s ${index * 0.16}s ease-in-out infinite`,
            opacity: 0.5,
          }}
        />
      ))}
      <span className="ml-1.5 text-xs text-mist-500">Reading the knowledge base…</span>
    </span>
  );
}

/** Compact conversation card used in the history sidebar. */
export const ConversationItem = memo(function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
}) {
  return (
    <div
      className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
        active
          ? 'border-brand-400/35 bg-brand-400/10'
          : 'border-transparent hover:border-tint/10 hover:bg-tint/[0.03]'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-[0.8125rem] font-medium text-mist-100">
          {conversation.title || 'Untitled conversation'}
        </p>
        <p className="mt-0.5 text-2xs text-mist-500 tnum">
          {conversation.messageCount ?? 0} messages
          {conversation.updatedAt && (
            <span className="ml-1.5">{new Date(conversation.updatedAt).toLocaleDateString()}</span>
          )}
        </p>
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(conversation.id)}
          aria-label={`Delete conversation ${conversation.title || ''}`}
          className="shrink-0 rounded-md p-1 text-mist-600 opacity-0 transition-all hover:text-negative focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
});

export { money as formatMoney };
export { Bot };
