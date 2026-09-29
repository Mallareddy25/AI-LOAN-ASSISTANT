/** Shimmering placeholder used while knowledge lists load. */
export default function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return (
    <div
      className={`relative overflow-hidden bg-ink-800/70 ${rounded} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)] bg-[length:200%_100%]" />
    </div>
  );
}
