/**
 * The single shared WebGL scene.
 *
 * Architecture notes
 *  • ONE `<Canvas>` for the whole application, mounted in a fixed, full-viewport
 *    host. It is `pointer-events: none` so it never interferes with the UI.
 *  • `frameloop="demand"` is deliberately NOT used: the scene has continuous
 *    motion, so we keep the loop but pause it via IntersectionObserver +
 *    `visibilitychange` when the canvas is off-screen or the tab is hidden.
 *  • The whole canvas is lazy-loaded and behind `<Suspense>`, so content pages
 *    never pay the cost of the 3D runtime.
 *  • `dpr` is capped, and shadows are only enabled on the high tier.
 */
import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';

import FloatingCoins from './FloatingCoins';
import FinancialOrb from './FinancialOrb';
import MoneyParticles from './MoneyParticles';
import Loan3DObjects from './Loan3DObjects';
import ScrollCamera from './ScrollCamera';
import { disposeTextureCache } from './textures';
import { scrollState, density } from '../../utils/scrollEngine';
import { useTheme } from '../../context/ThemeContext';

/** True when the canvas host is on screen — used to stop the rAF loop. */
function useOnScreen(ref) {
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      setOnScreen(entries.some((entry) => entry.isIntersecting));
    }, { threshold: 0 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return onScreen;
}

/**
 * Lighting rig. Deliberately minimal: one key, one cool fill, one warm rim.
 * Fewer lights = cheaper fragment work.
 */
function Lights({ shadows }) {
  return (
    <>
      <ambientLight intensity={0.42} color="#8FA3C8" />
      <directionalLight
        position={[5, 7, 6]}
        intensity={1.15}
        color="#FFF3D6"
        castShadow={shadows}
        shadow-mapSize-width={shadows ? 1024 : 0}
        shadow-mapSize-height={shadows ? 1024 : 0}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0012}
      />
      <directionalLight position={[-6, -3, -4]} intensity={0.5} color="#5B8CFF" />
      <pointLight position={[0, 0, 3]} intensity={18} distance={14} decay={2} color="#C9A227" />
    </>
  );
}

/**
 * Scroll-reactive lighting. Intensity follows scroll velocity so fast
 * scrolling feels energetic, and the key light drifts with scroll progress.
 */
function ScrollLights() {
  const key = useRef(null);
  const rim = useRef(null);

  useFrame(() => {
    if (key.current && !scrollState.reduced) {
      const angle = scrollState.progress * Math.PI * 1.4;
      key.current.position.x = Math.cos(angle) * 7;
      key.current.position.y = 5 + Math.sin(angle * 1.3) * 3;
      key.current.intensity = 1.0 + Math.min(Math.abs(scrollState.velocity) * 0.05, 0.5);
    }
    if (rim.current && !scrollState.reduced) {
      rim.current.intensity = 0.4 + Math.abs(scrollState.pointer.x) * 0.3;
    }
  });

  return (
    <>
      <directionalLight ref={key} position={[5, 7, 6]} intensity={1.1} color="#FFF3D6" />
      <pointLight ref={rim} position={[-4, -2, 2]} intensity={0.5} distance={12} color="#5B8CFF" />
    </>
  );
}

/** Graceful fallback while the 3D chunk streams in. */
function SceneFallback() {
  return (
    <div className="canvas-host" aria-hidden="true">
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-gold-400/10 blur-3xl" />
    </div>
  );
}

export default function FinancialScene({ enabled = true, cameraActive = true }) {
  const host = useRef(null);
  const { isDark } = useTheme();
  const orbAnchor = useRef(null);
  const onScreen = useOnScreen(host);

  const d = density();
  const reduced = scrollState.reduced;
  const shadows = d.shadows && !reduced;

  // Free every cached texture when the scene unmounts (route change).
  useEffect(() => () => disposeTextureCache(), []);


  if (!enabled) return <SceneFallback />;

  return (
    <div ref={host} className="canvas-host" aria-hidden="true">
      <Canvas
        // Pause rendering when off-screen or when the tab is hidden.
        frameloop={onScreen && scrollState.visible ? 'always' : 'never'}
        dpr={reduced ? 1 : [1, d.tier === 'high' ? 1.75 : 1.35]}
        gl={{
          antialias: d.tier === 'high',
          alpha: true,
          powerPreference: 'high-performance',
          // Cap the device pixel ratio work; the scene is deliberately soft.
          stencil: false,
          depth: true,
        }}
        camera={{ fov: 42, near: 0.1, far: 60, position: [0, 0, 9] }}
        shadows={shadows}
        // Transparent canvas: the page gradient shows through.
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          // Never let Three.js log colour-management noise to the console.
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Suspense fallback={null}>
          {/*
            Fog colour tracks the page so distant geometry dissolves into the
            background instead of the opposite theme's tone. It is lighter and
            thinner on light, where a dense dark fog would grey out the copy.
          */}
          <fogExp2
            attach="fog"
            args={[isDark ? '#070910' : '#F4F6FA', isDark ? 0.045 : 0.028]}
          />
          <Lights shadows={shadows} />
          <ScrollLights />
          <ScrollCamera enabled={cameraActive} orbRef={orbAnchor} />

          {/* The orb lives in an anchor group the camera track can move. */}
          <group ref={orbAnchor}>
            <FinancialOrb
              radius={1.15}
              intensity={1}
              reduced={reduced}
              followPointer
              parallaxStrength={0.7}
            />
          </group>

          <FloatingCoins enabled={!reduced} />
          <MoneyParticles enabled={!reduced} />
          <Loan3DObjects enabled={!reduced} />

          <AdaptiveDpr pixelated={false} />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}

export { SceneFallback };
