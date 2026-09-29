import { Compass } from 'lucide-react';

/** Shown when a filtered list legitimately has no results. */
export default function EmptyState({ title, description, action, icon: Icon = Compass }) {
  return (
    <div className="glass glass-edge flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-tint/10 bg-tint/[0.04] text-gold-300">
        <Icon size={20} strokeWidth={1.6} />
      </div>
      <h3 className="text-base font-semibold text-mist-50">{title}</h3>
      {description && <p className="max-w-md text-sm leading-relaxed text-mist-400">{description}</p>}
      {action}
    </div>
  );
}
