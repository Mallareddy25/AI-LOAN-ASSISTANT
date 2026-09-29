/**
 * The glowing financial core / AI orb.
 *
 * A single icosahedron with a custom fresnel shader plus an additive halo
 * sprite. Used in two places:
 *  • the hero, as the scene's focal point
 *  • the chat panel, as the assistant's visual identity (via `AIOrb`)
 *
 * It is cheap: one low-poly mesh, one sprite, one shader. No post-processing
 * pass, so it works on the low tier without downgrading the whole app.
 */
import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { glowTexture } from './textures';
import { scrollState, damp } from '../../utils/scrollEngine';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;

  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;

  // Cheap value noise — enough to make the surface breathe organically
  // without the cost of a real simplex implementation.
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);

    vec3 displaced = position;
    float n = noise(normal * uFrequency + vec3(uTime * 0.28));
    vDisplacement = n;
    displaced += normal * n * uAmplitude;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;

  uniform float uTime;
  uniform vec3  uCoreColor;
  uniform vec3  uEdgeColor;
  uniform float uIntensity;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - clamp(dot(viewDir, normalize(vNormal)), 0.0, 1.0), 2.1);

    // Gentle scan band travelling up the sphere.
    float band = sin(vDisplacement * 8.0 - uTime * 0.9) * 0.5 + 0.5;

    vec3 color = mix(uCoreColor, uEdgeColor, fresnel);
    color += uEdgeColor * fresnel * 0.55;
    color += uCoreColor * band * 0.12;

    float alpha = clamp(0.30 + fresnel * 0.72 + band * 0.06, 0.0, 1.0);

    gl_FragColor = vec4(color * uIntensity, alpha);
  }
`;

const FinancialOrb = forwardRef(function FinancialOrb(
  {
    position = [0, 0, 0],
    radius = 1,
    intensity = 1,
    /** External pulse, e.g. 1 while the assistant is "thinking". */
    pulseRef = null,
    followPointer = true,
    parallaxStrength = 0.6,
    reduced = false,
  },
  ref,
) {
  const mesh = useRef(null);
  const halo = useRef(null);
  const group = useRef(null);
  const glow = useMemo(() => glowTexture(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmplitude: { value: 0.09 },
      uFrequency: { value: 1.9 },
      uIntensity: { value: intensity },
      uCoreColor: { value: new THREE.Color('#1B2A4A') },
      uEdgeColor: { value: new THREE.Color('#C9A227') },
    }),
    [intensity],
  );

  useImperativeHandle(ref, () => mesh.current, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;

    const node = group.current;
    if (!node) return;

    // External pulse (assistant thinking) layered on top of the idle breath.
    const external = pulseRef?.current ?? 0;
    const breathe = reduced ? 1 : 1 + Math.sin(t * 0.7) * 0.022;
    const target = breathe * (1 + external * 0.14);
    node.scale.setScalar(damp(node.scale.x || 1, target, 7, dt));

    // Halo follows the breathing scale, and flares when thinking.
    if (halo.current) {
      const haloScale = 2.9 * node.scale.x * (1 + external * 0.22);
      halo.current.scale.setScalar(damp(halo.current.scale.x, haloScale, 6, dt));
      halo.current.material.opacity = damp(
        halo.current.material.opacity,
        (reduced ? 0.18 : 0.26) + external * 0.3,
        6,
        dt,
      );
    }

    if (mesh.current) {
      mesh.current.rotation.y += dt * (reduced ? 0 : 0.09);
      mesh.current.rotation.x += dt * (reduced ? 0 : 0.035);
    }

    if (!reduced) {
      const px = followPointer ? scrollState.pointer.x * parallaxStrength : 0;
      const py = followPointer ? scrollState.pointer.y * parallaxStrength * 0.6 : 0;
      node.position.x = damp(node.position.x, position[0] + px, 3.2, dt);
      node.position.y = damp(node.position.y, position[1] + py, 3.2, dt);
      node.position.z = damp(node.position.z, position[2], 3.2, dt);
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[radius, reduced ? 2 : 4]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Additive halo — reads as light bloom without a post pass. */}
      <sprite ref={halo} scale={radius * 2.9}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.26}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
});

export default FinancialOrb;
