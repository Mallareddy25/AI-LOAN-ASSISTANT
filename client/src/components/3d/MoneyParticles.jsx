/**
 * Subtle money-particles — a single Points object, never a per-particle mesh.
 *
 * One buffer geometry + one Points draw call keeps this cheap regardless of
 * count. Motion is slow drift plus a gentle reaction to scroll velocity, and
 * the whole system is skipped entirely on the low tier.
 */
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { particleTexture } from './textures';
import { scrollState, density, damp } from '../../utils/scrollEngine';

function seeded(index, salt = 0) {
  const x = Math.sin(index * 91.7 + salt * 47.3) * 24634.6345;
  return x - Math.floor(x);
}

export default function MoneyParticles({ enabled = true, count: countProp }) {
  const points = useRef(null);
  const material = useRef(null);
  const texture = useMemo(() => particleTexture(), []);

  const count = countProp ?? density().particles;

  const { positions, speeds, sizes, phases } = useMemo(() => {
    const total = Math.max(count, 0);
    const pos = new Float32Array(total * 3);
    const spd = new Float32Array(total);
    const siz = new Float32Array(total);
    const pha = new Float32Array(total);

    for (let i = 0; i < total; i += 1) {
      pos[i * 3] = (seeded(i, 1) - 0.5) * 16;
      pos[i * 3 + 1] = (seeded(i, 2) - 0.5) * 11;
      pos[i * 3 + 2] = -5 + seeded(i, 3) * 7;
      spd[i] = 0.05 + seeded(i, 4) * 0.12;
      siz[i] = 0.02 + seeded(i, 5) * 0.05;
      pha[i] = seeded(i, 6) * Math.PI * 2;
    }
    return { positions: pos, speeds: spd, sizes: siz, phases: pha };
  }, [count]);

  // Upload once; the buffer is never reallocated per frame.
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, sizes]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const node = points.current;
    if (!node || !enabled) return;

    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    const attribute = geometry.getAttribute('position');
    const array = attribute.array;

    for (let i = 0; i < speeds.length; i += 1) {
      const idx = i * 3;
      // Rise slowly, wrap around when off-screen.
      array[idx + 1] += speeds[i] * dt;
      if (array[idx + 1] > 5.5) array[idx + 1] = -5.5;

      // Horizontal sway, phase-offset per particle.
      array[idx] += Math.sin(t * 0.3 + phases[i]) * dt * 0.06;
    }
    attribute.needsUpdate = true;

    // Subtle push on scroll so the field feels connected to the story.
    if (!scrollState.reduced) {
      node.position.y = damp(node.position.y, -scrollState.pointer.y * 0.3, 3, dt);
      node.position.x = damp(node.position.x, scrollState.pointer.x * 0.4, 3, dt);
    }

    if (material.current) {
      // Particles fade as the user scrolls deep into the content.
      const fade = 1 - Math.min(scrollState.progress * 1.5, 0.7);
      material.current.opacity = damp(material.current.opacity, fade, 2, dt);
    }
  });

  if (!enabled || count === 0) return null;

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        ref={material}
        map={texture}
        size={0.055}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        color="#E7D3A0"
      />
    </points>
  );
}
