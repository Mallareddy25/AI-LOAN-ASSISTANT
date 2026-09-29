/**
 * Eligibility visualization.
 *
 * The spec's story beat is: Income + Credit History + Existing Debt +
 * Employment → Eligibility Factors. This renders that literally as a
 * network: four input nodes on the left, animated connectors, and a result
 * hub on the right.
 *
 * Scroll drives the connectors (dash offset) and the node lift, so the
 * network visibly *assembles* as the section is scrolled through. SVG keeps
 * it crisp, accessible and cheap.
 */
import { useEffect, useRef } from 'react';
import { sectionFocus } from '../../utils/scrollEngine';
import { usePrefersReducedMotion } from '../../hooks';

const INPUTS = [
  { key: 'income', label: 'Income', icon: '₹', accent: '#C9A227' },
  { key: 'credit', label: 'Credit history', icon: '◎', accent: '#A78BFA' },
  { key: 'debt', label: 'Existing debt', icon: '≈', accent: '#E0A93B' },
  { key: 'employment', label: 'Employment', icon: '▣', accent: '#5B8CFF' },
];

export default function EligibilityVisualization({ impactCounts }) {
  const root = useRef(null);
  const pathRefs = useRef([]);
  const nodeRefs = useRef([]);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !root.current) return undefined;
    let raf = null;

    const loop = () => {
      const focus = sectionFocus('eligibility');
      // Connectors draw in from 0 → 1 as the section gains focus.
      pathRefs.current.forEach((path, index) => {
        if (!path) return;
        const delay = index * 0.12;
        const local = Math.max(0, Math.min(1, (focus - delay) / Math.max(0.001, 1 - delay)));
        const length = path.getTotalLength?.() || 200;
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length * (1 - local));
        path.style.opacity = String(0.15 + local * 0.85);
      });

      // Nodes drift slightly toward the hub as focus increases.
      nodeRefs.current.forEach((node) => {
        if (node) node.style.setProperty('--lift', (focus * 10).toFixed(2));
      });

      root.current.style.setProperty('--focus', focus.toFixed(3));
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const hub = { x: 320, y: 150 };
  const nodePositions = INPUTS.map((_, index) => ({
    x: 30,
    y: 40 + index * 62,
  }));

  return (
    <div
      ref={root}
      className="glass glass-edge relative overflow-hidden p-5 sm:p-7"
      style={{ ['--focus']: 0 }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-mist-50">How eligibility is assessed</h3>
        <p className="text-xs text-mist-500">
          No single rule — lenders weigh these together
        </p>
      </div>

      <svg
        viewBox="0 0 640 260"
        className="w-full"
        role="img"
        aria-label="Income, credit history, existing debt and employment combine to form eligibility factors"
      >
        <defs>
          <linearGradient id="eligConnector" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C9A227" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#5B8CFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3FB984" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="eligHub" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#3FB984" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3FB984" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connectors */}
        {nodePositions.map((position, index) => (
          <path
            key={INPUTS[index].key}
            ref={(node) => {
              pathRefs.current[index] = node;
            }}
            d={`M ${position.x + 16} ${position.y} C ${position.x + 120} ${position.y}, ${hub.x - 150} ${hub.y}, ${hub.x - 62} ${hub.y}`}
            fill="none"
            stroke="url(#eligConnector)"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.15"
          />
        ))}

        {/* Result hub glow */}
        <circle cx={hub.x} cy={hub.y} r="86" fill="url(#eligHub)" opacity="0.5" />
        <circle
          cx={hub.x}
          cy={hub.y}
          r="52"
          fill="rgba(63,185,132,0.08)"
          stroke="rgba(63,185,132,0.35)"
          strokeWidth="1"
        />
        <text
          x={hub.x}
          y={hub.y - 6}
          textAnchor="middle"
          className="fill-mist-50"
          style={{ fontSize: 15, fontWeight: 700 }}
        >
          Eligibility
        </text>
        <text
          x={hub.x}
          y={hub.y + 14}
          textAnchor="middle"
          className="fill-mist-400"
          style={{ fontSize: 11 }}
        >
          factors
        </text>

        {/* Input nodes */}
        {INPUTS.map((input, index) => {
          const position = nodePositions[index];
          return (
            <g
              key={input.key}
              ref={(node) => {
                nodeRefs.current[index] = node;
              }}
              style={{ ['--lift']: 0, transition: 'transform 0.4s ease' }}
              transform={`translate(0, ${-Number(0)})`}
            >
              <rect
                x={position.x}
                y={position.y - 17}
                width="150"
                height="34"
                rx="10"
                fill="rgba(255,255,255,0.035)"
                stroke={`${input.accent}44`}
                strokeWidth="1"
              />
              <circle cx={position.x + 20} cy={position.y} r="11" fill={`${input.accent}22`} />
              <text
                x={position.x + 20}
                y={position.y + 4}
                textAnchor="middle"
                style={{ fontSize: 12, fill: input.accent, fontWeight: 700 }}
              >
                {input.icon}
              </text>
              <text
                x={position.x + 40}
                y={position.y + 4}
                style={{ fontSize: 12.5, fill: '#C7CEDB', fontWeight: 500 }}
              >
                {input.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Impact legend, driven by the real seeded data counts. */}
      {impactCounts && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-tint/[0.06] pt-4">
          {impactCounts.map((impact) => (
            <span
              key={impact.value}
              className="inline-flex items-center gap-2 rounded-lg border border-tint/[0.07] bg-tint/[0.02] px-2.5 py-1.5 text-xs text-mist-300"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background:
                    impact.value === 'high' ? '#E5484D' : impact.value === 'medium' ? '#E0A93B' : '#3FB984',
                }}
              />
              {impact.label}
              <span className="tnum text-mist-500">{impact.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
