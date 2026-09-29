/**
 * Scroll-driven camera rig.
 *
 * Rather than animating objects one by one, the *camera* is mapped from scroll
 * progress with critical damping. Everything else then inherits motion for
 * free, which reads as a single continuous cinematic move.
 *
 * A "chapter" is a keyframe: { progress, position, lookAt, fov, orb }. As the
 * user scrolls through the story, the camera interpolates between chapters.
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState, damp } from '../../utils/scrollEngine';

/**
 * Keyframes for the homepage story. `progress` is document scroll progress,
 * not section progress, so they stay stable as section heights change.
 */
export const CHAPTERS = [
  { progress: 0.0, position: [0, 0, 9], lookAt: [0, 0, 0], fov: 42, orb: [0, 0, 0] },
  { progress: 0.18, position: [1.6, 0.9, 7.2], lookAt: [0.2, 0, 0], fov: 40, orb: [-0.6, 0.5, 0] },
  { progress: 0.36, position: [-1.4, -0.6, 8.0], lookAt: [0, 0.2, 0], fov: 44, orb: [0.8, -0.3, 0] },
  { progress: 0.56, position: [0.9, 1.4, 6.4], lookAt: [0, -0.4, 0], fov: 38, orb: [0, 0.6, 0] },
  { progress: 0.76, position: [-1.1, -1.0, 7.4], lookAt: [0, 0.3, 0], fov: 41, orb: [-0.5, -0.4, 0] },
  { progress: 0.92, position: [0, 0.2, 10.0], lookAt: [0, 0, 0], fov: 45, orb: [0, 0, 0] },
  { progress: 1.0, position: [0, 0.4, 11.5], lookAt: [0, 0, 0], fov: 47, orb: [0, 0, 0] },
];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Sample the chapter track at a given progress. */
function sampleChapters(progress) {
  const p = clamp01(progress);
  let from = CHAPTERS[0];
  let to = CHAPTERS[CHAPTERS.length - 1];

  for (let i = 0; i < CHAPTERS.length - 1; i += 1) {
    if (p >= CHAPTERS[i].progress && p <= CHAPTERS[i + 1].progress) {
      from = CHAPTERS[i];
      to = CHAPTERS[i + 1];
      break;
    }
  }

  const span = to.progress - from.progress || 1;
  // Smoothstep within the chapter for an ease-in-out feel.
  const raw = clamp01((p - from.progress) / span);
  const t = raw * raw * (3 - 2 * raw);

  return {
    position: [
      lerp(from.position[0], to.position[0], t),
      lerp(from.position[1], to.position[1], t),
      lerp(from.position[2], to.position[2], t),
    ],
    lookAt: [
      lerp(from.lookAt[0], to.lookAt[0], t),
      lerp(from.lookAt[1], to.lookAt[1], t),
      lerp(from.lookAt[2], to.lookAt[2], t),
    ],
    fov: lerp(from.fov, to.fov, t),
    orb: [
      lerp(from.orb[0], to.orb[0], t),
      lerp(from.orb[1], to.orb[1], t),
      lerp(from.orb[2], to.orb[2], t),
    ],
  };
}

/**
 * @param {object} props
 * @param {number} [props.intensity]  How strongly scroll moves the camera
 * @param {boolean} [props.enabled]   Disable on non-story routes
 * @param {React.Ref} [props.orbRef]   Orb group, positioned from the track
 */
export default function ScrollCamera({ intensity = 1, enabled = true, orbRef }) {
  const { camera, size } = useThree();
  const lookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const target = useRef({ x: 0, y: 0, z: 9, fx: 0, fy: 0, fz: 0, fov: 42 });

  useFrame((state, delta) => {
    if (!enabled) return;
    const dt = Math.min(delta, 0.05);

    const sample = sampleChapters(scrollState.progress);

    // Pointer parallax is deliberately small — a few tenths of a world unit.
    const px = scrollState.reduced ? 0 : scrollState.pointer.x * 0.42 * intensity;
    const py = scrollState.reduced ? 0 : scrollState.pointer.y * 0.28 * intensity;

    // Scroll velocity adds a small dolly kick, then springs back.
    const kick = scrollState.reduced ? 0 : scrollState.velocity * 0.06;

    const t = target.current;
    t.x = sample.position[0] + px;
    t.y = sample.position[1] + py;
    t.z = sample.position[2] + kick;
    t.fx = sample.lookAt[0] + px * 0.4;
    t.fy = sample.lookAt[1] + py * 0.4;
    t.fz = sample.lookAt[2];
    t.fov = sample.fov;

    // Damping: 2.6 is slow enough to feel cinematic, fast enough to keep up.
    camera.position.x = damp(camera.position.x, t.x, 2.6, dt);
    camera.position.y = damp(camera.position.y, t.y, 2.6, dt);
    camera.position.z = damp(camera.position.z, t.z, 2.6, dt);

    lookAt.set(
      damp(lookAt.x, t.fx, 2.6, dt),
      damp(lookAt.y, t.fy, 2.6, dt),
      damp(lookAt.z, t.fz, 2.6, dt),
    );
    camera.lookAt(lookAt);

    if (Math.abs(camera.fov - t.fov) > 0.01) {
      camera.fov = damp(camera.fov, t.fov, 2.6, dt);
      camera.updateProjectionMatrix();
    }

    // Position the orb from the same track so the two never fight.
    if (orbRef?.current) {
      const orb = orbRef.current;
      orb.position.x = damp(orb.position.x, sample.orb[0], 2.4, dt);
      orb.position.y = damp(orb.position.y, sample.orb[1], 2.4, dt);
      orb.position.z = damp(orb.position.z, sample.orb[2], 2.4, dt);
    }
  });

  // Keep the camera framing correct on resize / orientation change.
  useEffect(() => {
    camera.aspect = size.width / Math.max(size.height, 1);
    camera.updateProjectionMatrix();
  }, [size.width, size.height, camera]);

  return null;
}
