/**
 * Abstract 3D financial objects: glass blocks and floating document cards.
 *
 * These give the scene depth and storytelling anchors without competing with
 * the content. Counts and shadows follow the device tier.
 */
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { documentTexture } from './textures';
import { scrollState, density, damp } from '../../utils/scrollEngine';

function seeded(index, salt = 0) {
  const x = Math.sin(index * 57.3 + salt * 129.1) * 31415.9265;
  return x - Math.floor(x);
}

/* ── Glass financial block ─────────────────────────────────────────── */
function FinancialBlock({ position, scale, accent, speed, phase, reduced, shadows }) {
  const ref = useRef(null);
  const base = useRef(position);

  // Built once and disposed on unmount — never inside JSX.
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(scale, scale, scale)), [scale]);
  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  useFrame((state, delta) => {
    const node = ref.current;
    if (!node) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (reduced) return;

    node.rotation.y += dt * speed;
    node.position.y = base.current[1] + Math.sin(t * 0.42 + phase) * 0.12;
    node.position.x = damp(
      node.position.x,
      base.current[0] + scrollState.pointer.x * 0.28,
      3,
      dt,
    );
  });

  return (
    <group ref={ref} position={position}>
      <mesh castShadow={shadows} receiveShadow={shadows}>
        {/* Rounded box built from a low-segment box + bevel-ish scale. */}
        <boxGeometry args={[scale, scale, scale]} />
        <meshPhysicalMaterial
          color={accent}
          metalness={0.15}
          roughness={0.15}
          transmission={0.55}
          thickness={scale * 0.9}
          transparent
          opacity={0.5}
          ior={1.4}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
        />
      </mesh>

      {/* Thin gold edge to give it a premium, defined silhouette. */}
      <lineSegments geometry={edgeGeometry} scale={1.001}>
        <lineBasicMaterial color="#C9A227" transparent opacity={0.32} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

/* ── Floating document card ────────────────────────────────────────── */
function DocumentCard({ position, scale, rotation, phase, reduced, texture }) {
  const ref = useRef(null);
  const base = useRef(position);

  const edgeGeometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(scale, scale * 1.28)),
    [scale],
  );
  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  useFrame((state) => {
    const node = ref.current;
    if (!node) return;
    const t = state.clock.elapsedTime;
    if (reduced) return;

    node.position.y = base.current[1] + Math.sin(t * 0.36 + phase) * 0.16;
    node.rotation.z = rotation[2] + Math.sin(t * 0.28 + phase) * 0.06;
    node.rotation.y = rotation[1] + Math.cos(t * 0.22 + phase) * 0.1;
  });

  return (
    <group ref={ref} position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[scale, scale * 1.28]} />
        <meshPhysicalMaterial
          map={texture}
          transparent
          opacity={0.72}
          metalness={0.2}
          roughness={0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial color="#8AA9FF" transparent opacity={0.28} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

export default function Loan3DObjects({ enabled = true }) {
  const group = useRef(null);
  const texture = useMemo(() => documentTexture(), []);

  const { blocks, cards } = useMemo(() => {
    if (!enabled) return { blocks: [], cards: [] };
    const d = density();
    const accents = ['#5B8CFF', '#C9A227', '#3FB984', '#7C5CFF'];

    const b = Array.from({ length: Math.max(3, Math.round(d.coins * 0.4)) }, (_, i) => {
      const angle = seeded(i, 11) * Math.PI * 2;
      const radius = 4.2 + seeded(i, 12) * 3.2;
      return {
        id: i,
        position: [Math.cos(angle) * radius, (seeded(i, 13) - 0.5) * 5.2, -3.4 + seeded(i, 14) * 2.4],
        scale: 0.5 + seeded(i, 15) * 0.85,
        accent: accents[i % accents.length],
        speed: (seeded(i, 16) - 0.5) * 0.16,
        phase: seeded(i, 17) * Math.PI * 2,
      };
    });

    const c = Array.from({ length: d.docCards }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      return {
        id: i,
        position: [side * (3.6 + seeded(i, 21) * 1.6), 1.2 - i * 0.9 + seeded(i, 22), -2.2 + seeded(i, 23)],
        scale: 0.72 + seeded(i, 24) * 0.3,
        rotation: [(seeded(i, 25) - 0.5) * 0.5, side * (0.5 + seeded(i, 26) * 0.6), side * 0.12],
        phase: seeded(i, 27) * Math.PI * 2,
      };
    });

    return { blocks: b, cards: c };
  }, [enabled]);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    const dt = Math.min(delta, 0.05);

    if (scrollState.reduced) return;

    // Vertical parallax tied to the story position.
    const targetY = -scrollState.progress * 1.2;
    node.position.y = damp(node.position.y, targetY, 2.2, dt);
  });

  if (!enabled) return null;

  const shadows = density().shadows;
  const reduced = scrollState.reduced;

  return (
    <group ref={group}>
      {blocks.map((block) => (
        <FinancialBlock key={block.id} {...block} reduced={reduced} shadows={shadows} />
      ))}
      {cards.map((card) => (
        <DocumentCard
          key={card.id}
          {...card}
          reduced={reduced}
          texture={texture}
        />
      ))}
    </group>
  );
}
