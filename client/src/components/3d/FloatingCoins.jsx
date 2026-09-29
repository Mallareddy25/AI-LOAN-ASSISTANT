/**
 * Floating 3D coins — the recurring "money" visual language.
 *
 * Design rules baked in:
 *  • Slow, damped, purposeful motion. No chaotic rain, no constant fast spin.
 *  • Each coin has a home position and orbits it gently; scroll velocity nudges
 *    it, pointer parallax shifts the whole group.
 *  • Density comes from the device tier so phones stay smooth.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { coinTexture } from './textures';
import { scrollState, density, damp } from '../../utils/scrollEngine';

const GOLD_SYMBOLS = ['₹', '₹', '₹', '₹', '₹', '₹'];
const LABEL_SYMBOLS = ['EMI', 'LOAN', 'CREDIT'];
const TONES = ['gold', 'gold', 'gold', 'silver', 'brand'];

/** Deterministic pseudo-random so the layout is stable across renders. */
function seeded(index, salt = 0) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Coin({ position, symbol, tone, scale, speed, phase, drift }) {
  const group = useRef(null);
  const texture = useMemo(() => coinTexture(symbol, { tone }), [symbol, tone]);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Slow rotation on two different axes reads as "tumbling", not spinning.
    node.rotation.y += dt * speed;
    node.rotation.x = Math.sin(t * 0.22 + phase) * 0.32;
    node.rotation.z = Math.cos(t * 0.17 + phase) * 0.14;

    // Gentle vertical bob + slow horizontal orbit around its home position.
    const bob = Math.sin(t * 0.55 + phase) * drift;
    const orbitX = Math.cos(t * 0.19 + phase) * drift * 0.7;

    // Scroll velocity pushes coins slightly upward, then springs back.
    const velocityLift = scrollState.velocity * 0.9;

    node.position.set(
      position[0] + orbitX + scrollState.pointer.x * 0.22,
      position[1] + bob + velocityLift,
      position[2] - scrollState.pointer.y * 0.12,
    );
  });

  const thickness = 0.055 * scale;

  return (
    <group ref={group} position={position}>
      {/* Body: gives real thickness and a metallic rim. */}
      <mesh castShadow>
        <cylinderGeometry args={[scale, scale, thickness, 40]} />
        <meshStandardMaterial
          color={tone === 'silver' ? '#B9C1CE' : tone === 'brand' ? '#5B8CFF' : '#C9A227'}
          metalness={0.95}
          roughness={tone === 'silver' ? 0.28 : 0.34}
          envMapIntensity={0.7}
        />
      </mesh>

      {/* Both faces get the symbol so the coin never reads mirrored. */}
      <mesh position={[0, 0, thickness / 2 + 0.002]}>
        <circleGeometry args={[scale * 0.99, 40]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -thickness / 2 - 0.002]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[scale * 0.99, 40]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function FloatingCoins({ enabled = true }) {
  const group = useRef(null);

  const coins = useMemo(() => {
    if (!enabled) return [];
    const count = density().coins;
    const symbols = [...GOLD_SYMBOLS, ...LABEL_SYMBOLS];

    return Array.from({ length: count }, (_, i) => {
      const angle = seeded(i, 1) * Math.PI * 2;
      const radiusX = 2.6 + seeded(i, 2) * 3.4;
      const radiusY = 1.5 + seeded(i, 3) * 2.2;
      const isLabel = seeded(i, 4) > 0.72;
      const scale = isLabel ? 0.34 : 0.2 + seeded(i, 5) * 0.26;

      return {
        id: i,
        position: [
          Math.cos(angle) * radiusX,
          Math.sin(angle) * radiusY,
          -1.5 + seeded(i, 6) * 3.2,
        ],
        symbol: isLabel ? symbols[6 + (i % 3)] : symbols[i % 6],
        tone: TONES[i % TONES.length],
        scale,
        // Deliberately slow: 0.05–0.14 rad/s.
        speed: 0.05 + seeded(i, 7) * 0.09,
        phase: seeded(i, 8) * Math.PI * 2,
        drift: 0.06 + seeded(i, 9) * 0.13,
      };
    });
  }, [enabled]);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    // Whole-field parallax. Reduced motion freezes this at rest.
    const targetX = scrollState.reduced ? 0 : scrollState.pointer.x * 0.5;
    const targetY = scrollState.reduced ? 0 : scrollState.pointer.y * 0.3;
    const dt = Math.min(delta, 0.05);

    node.position.x = damp(node.position.x, targetX, 3, dt);
    node.position.y = damp(node.position.y, targetY, 3, dt);

    // Scatter outward as the story progresses so it never blocks content.
    const spread = 1 + scrollState.progress * 0.55;
    node.scale.setScalar(damp(node.scale.x, spread, 2.4, dt));

    // Slow global drift keeps the scene alive even when the user is still.
    if (!scrollState.reduced) {
      node.rotation.y = Math.sin(state.clock.elapsedTime * 0.06) * 0.12;
    }
  });

  if (!coins.length) return null;

  return (
    <group ref={group} position={[0, 0, -1]}>
      {coins.map((coin) => (
        <Coin key={coin.id} {...coin} />
      ))}
    </group>
  );
}

export { Coin };
