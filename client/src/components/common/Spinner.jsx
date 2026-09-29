import Loader from './Loader';

/** Full-panel loading state with an accessible live region. */
export default function Spinner({ label = 'Loading', className = '' }) {
  return (
    <div className={`grid place-items-center gap-3 py-16 ${className}`} role="status" aria-live="polite">
      <Loader size={26} className="text-gold-400" />
      <span className="text-sm text-mist-400">{label}</span>
    </div>
  );
}
