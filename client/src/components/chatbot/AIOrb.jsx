/**
 * The assistant's visual identity.
 *
 * Deliberately built from layered CSS/SVG 3D rather than a second WebGL
 * context: a second `<canvas>` would cost a full GL context on every page that
 * shows the assistant, for an object that is ~140px wide. The result is a
 * layered orb with a rotating conic ring and glyphs orbiting in real 3D
 * transform space, which animates smoothly and costs nothing.
 *
 * States: idle (slow breath), thinking (faster pulse + faster orbit).
 */
import { useRef, useEffect } from 'react';
import { usePrefersReducedMotion } from '../../hooks';

const GLYPHS = ['₹', 'EMI', '₹', 'CREDIT', '₹', 'LOAN'];

export default function AIOrb({
  thinking = false,
  size = 148,
  className = '',
  label = 'AI Loan Assistant',
}) {
  const ringRef = useRef(null);
  const glyphRefs = useRef([]);
  const reduced = usePrefersReducedMotion();

  // Drive the orbit imperatively so thinking state changes never re-render.
  useEffect(() => {
    if (reduced) return undefined;
    const ring = ringRef.current;
    const glyphs = glyphRefs.current.filter(Boolean);
    if (!ring && !glyphs.length) return undefined;

    let raf = null;
    let t = 0;
    let speed = 0.35;

    const loop = () => {
      // Ease toward the faster "thinking" orbit rather than snapping.
      speed += ((thinking ? 1.5 : 0.35) - speed) * 0.06;
      t += speed * 0.016;

      if (ring.current) {
        ring.current.style.transform = `rotate(${t * 57.3}deg)`;
      }

      glyphs.forEach((node, index) => {
        const angle = t * 0.9 + (index / glyphs.length) * Math.PI * 2;
        const radius = size * 0.46;
        const x = Math.cos(angle) * radius;
        // Tilt the orbit plane so it reads as an ellipse in perspective.
        const y = Math.sin(angle) * radius * 0.42;
        const z = Math.sin(angle) * 26;
        const scale = 0.78 + (z / 26) * 0.22;
        const opacity = 0.3 + ((z + 26) / 52) * 0.7;

        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        node.style.opacity = opacity.toFixed(2);
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [thinking, reduced, size]);

  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      {/* Outer bloom */}
      <div
        className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-700"
        style={{
          background:
            'radial-gradient(circle, rgb(var(--orb-bloom-gold) / var(--orb-bloom-alpha)) 0%, ' +
            'rgb(var(--orb-bloom-blue) / calc(var(--orb-bloom-alpha) * 0.45)) 45%, transparent 70%)',
          opacity: thinking ? 0.95 : 0.6,
        }}
        aria-hidden="true"
      />

      {/* Orbiting glyphs, in a 3D perspective container */}
      <div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d', perspective: '420px' }}
        aria-hidden="true"
      >
        {GLYPHS.map((glyph, index) => (
          <span
            key={`${glyph}-${index}`}
            ref={(node) => {
              glyphRefs.current[index] = node;
            }}
            className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md bg-ink-850/80 text-[0.5rem] font-bold text-mist-200 backdrop-blur-sm will-change-transform"
            style={{
              border: '1px solid var(--orb-glyph-line)',
              width: index % 2 ? 30 : 22,
              height: index % 2 ? 20 : 22,
              marginLeft: index % 2 ? -15 : -11,
              marginTop: index % 2 ? -10 : -11,
              fontSize: index % 2 ? 7 : 10,
            }}
          >
            {glyph}
          </span>
        ))}
      </div>

      {/* Rotating conic ring */}
      <div
        ref={ringRef}
        className="absolute rounded-full"
        style={{
          width: size * 0.78,
          height: size * 0.78,
          background:
            'conic-gradient(from 0deg, transparent 0deg, ' +
            'rgb(var(--orb-ring-gold) / 0.85) 40deg, transparent 110deg, transparent 200deg, ' +
            'rgb(var(--orb-ring-blue) / 0.6) 250deg, transparent 330deg)',
          mask: 'radial-gradient(circle, transparent 58%, #000 60%, #000 68%, transparent 70%)',
          WebkitMask:
            'radial-gradient(circle, transparent 58%, #000 60%, #000 68%, transparent 70%)',
          animation: reduced ? 'none' : undefined,
        }}
        aria-hidden="true"
      />

      {/* Core */}
      <div
        className="relative rounded-full transition-transform duration-700 ease-premium"
        style={{
          width: size * 0.52,
          height: size * 0.52,
          transform: `scale(${thinking ? 1.07 : 1})`,
          background:
            'radial-gradient(circle at 34% 30%, #FFF6E2 0%, #E3C15F 22%, #C9A227 46%, #7E6715 74%, #3A2F0B 100%)',
          boxShadow: thinking
            ? `0 0 44px 6px rgb(var(--orb-bloom-gold) / calc(var(--orb-glow-alpha) * 1.7)), inset 0 -6px 14px rgba(0,0,0,0.45)`
            : `0 0 26px 2px rgb(var(--orb-bloom-gold) / var(--orb-glow-alpha)), inset 0 -6px 14px rgba(0,0,0,0.45)`,
        }}
        aria-hidden="true"
      >
        {/* Specular highlight */}
        <span
          className="absolute left-[20%] top-[16%] h-[26%] w-[36%] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.85), transparent 70%)' }}
        />
        {/* ₹ engraved on the core */}
        <span
          className="absolute inset-0 grid place-items-center font-bold text-ink-950/70"
          style={{ fontSize: size * 0.2 }}
          aria-hidden="true"
        >
          ₹
        </span>
      </div>

      {/* Thinking pulse ring */}
      {thinking && !reduced && (
        <span
          className="absolute inset-[8%] animate-ping rounded-full border border-gold-300/40"
          style={{ animationDuration: '1.6s' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/** Compact inline variant for headers. */
export function AIOrbMini({ thinking = false, size = 34 }) {
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 rounded-full blur-md transition-opacity"
        style={{
          background:
            'radial-gradient(circle, rgb(var(--orb-bloom-gold) / var(--orb-bloom-alpha)) 0%, transparent 70%)',
          opacity: thinking ? 1 : 0.6,
        }}
      />
      <span
        className="relative rounded-full transition-transform duration-500"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          transform: `scale(${thinking ? 1.1 : 1})`,
          background:
            'radial-gradient(circle at 34% 30%, #FFF6E2, #C9A227 52%, #6A5611 100%)',
          boxShadow: 'inset 0 -3px 7px rgba(0,0,0,0.5)',
        }}
      />
    </span>
  );
}
