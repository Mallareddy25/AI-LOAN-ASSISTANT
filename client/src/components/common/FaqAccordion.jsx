import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Single FAQ row: question button + collapsible answer.
 * Uses a button + region so it is keyboard and screen-reader accessible.
 */
export default function FaqAccordion({ faq, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `faq-panel-${faq.id}`;

  return (
    <div className="glass glass-edge overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-tint/[0.02]"
      >
        <span className="flex-1 text-sm font-medium leading-snug text-mist-100">{faq.question}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-mist-500 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          className="border-t border-tint/[0.06] px-4 py-3.5 text-[0.8125rem] leading-relaxed text-mist-300"
        >
          {faq.answer}
        </div>
      )}
    </div>
  );
}
