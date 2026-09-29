/**
 * Suggested questions shown when the chat is empty.
 * The labels come from the API (`/chat/suggestions`) so admin edits flow
 * through, with a static fallback so the panel is never empty.
 */
import { Sparkles } from 'lucide-react';

const FALLBACK = [
  { label: 'What is EMI?', hint: 'The basics of monthly repayment' },
  { label: 'What affects loan eligibility?', hint: 'The factors lenders weigh' },
  { label: 'What documents do I need?', hint: 'The usual checklist' },
  { label: 'Explain prepayment', hint: 'Paying a loan off early' },
];

export default function SuggestedQuestions({ suggestions, onSelect, title = 'Try asking' }) {
  const items = suggestions?.length ? suggestions : FALLBACK;

  return (
    <div>
      <p className="mb-3 inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide3 text-mist-500">
        <Sparkles size={11} strokeWidth={2} />
        {title}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.slice(0, 6).map((item) => {
          const label = item.label || item.question;
          const hint = item.hint;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(label)}
              className="glass glass-edge glass-hover group flex flex-col items-start gap-1 p-3.5 text-left"
            >
              <span className="text-[0.8125rem] font-semibold text-mist-100 transition-colors group-hover:text-gold-200">
                {label}
              </span>
              {hint && <span className="text-xs leading-relaxed text-mist-500">{hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { FALLBACK as fallbackSuggestions };
