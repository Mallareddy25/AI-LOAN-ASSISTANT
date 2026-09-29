/**
 * React bindings for the shared scroll engine.
 *
 * These deliberately expose *imperative refs and throttled snapshots* rather
 * than per-frame React state. Components that need to move on scroll write
 * transforms in a rAF loop; components that need a discrete value (e.g. a
 * section class name) subscribe to a throttled version.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  scrollState,
  sectionProgress,
  sectionFocus,
  density,
} from '../utils/scrollEngine';

/** Current tier + density, re-rendered only when the value actually changes. */
export function useRenderTier() {
  const [tier, setTier] = useState(scrollState.tier);

  useEffect(() => {
    const id = setInterval(() => {
      setTier((current) => (current === scrollState.tier ? current : scrollState.tier));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { tier, density: density(), reduced: scrollState.reduced };
}

/** True when the visitor asked for reduced motion (live-updating). */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(scrollState.reduced);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

/** True on coarse-pointer (touch) devices. */
export function useIsTouch() {
  const [touch, setTouch] = useState(
    () => window.matchMedia?.('(pointer: coarse)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(pointer: coarse)');
    if (!query) return undefined;
    const onChange = () => setTouch(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  return touch;
}

/**
 * Run a callback every animation frame while `enabled` is true.
 * The callback receives `{ dt, elapsed }` in seconds.
 */
export function useAnimationFrame(callback, enabled = true) {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;
    let id = null;
    let start = 0;

    const loop = (now) => {
      if (!start) start = now;
      ref.current?.({ dt: Math.min((now - start) / 1000, 0.05), elapsed: (now - start) / 1000 });
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [enabled]);
}

/**
 * Element visibility via IntersectionObserver — used to pause expensive
 * animation when a section scrolls out of view.
 */
export function useInView(options = { rootMargin: '120px' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setInView(entry.isIntersecting));
    }, options);

    observer.observe(element);
    return () => observer.disconnect();
  }, [options.rootMargin]); // eslint-disable-line react-hooks/exhaustive-deps

  return [ref, inView];
}

/**
 * Write a transform to a DOM node on every frame from the shared engine.
 * `compute(elapsed, state)` returns a CSS transform string.
 */
export function useScrollTransform(compute, enabled = true) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return undefined;
    let id = null;

    const loop = () => {
      const transform = compute?.(scrollState);
      if (transform) element.style.transform = transform;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => {
      if (id) cancelAnimationFrame(id);
      if (element) element.style.transform = '';
    };
  }, [compute, enabled]);

  return ref;
}

/** Throttled scroll progress (0 → 1) for components that must re-render. */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let last = -1;
    const loop = () => {
      const value = Math.round(scrollState.progress * 400) / 400;
      if (value !== last) {
        last = value;
        setProgress(value);
      }
      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  return progress;
}

/** Progress of a registered section, throttled to ~30 updates per second. */
export function useSectionProgress(id) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!id) return undefined;
    let last = -1;
    let id2 = null;
    const loop = () => {
      const next = Math.round(sectionProgress(id) * 100) / 100;
      if (next !== last) {
        last = next;
        setValue(next);
      }
      id2 = requestAnimationFrame(loop);
    };
    id2 = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id2);
  }, [id]);

  return value;
}

/** Combined section progress + focus, throttled. */
export function useSectionFocus(id) {
  const [state, setState] = useState({ progress: 0, focus: 0 });

  useEffect(() => {
    if (!id) return undefined;
    let lastP = -1;
    let lastF = -1;
    let raf = null;
    const loop = () => {
      const p = Math.round(sectionProgress(id) * 50) / 50;
      const f = Math.round(sectionFocus(id) * 50) / 50;
      if (p !== lastP || f !== lastF) {
        lastP = p;
        lastF = f;
        setState((current) =>
          current.progress === p && current.focus === f ? current : { progress: p, focus: f },
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id]);

  return state;
}

/** Imperative accessors, for use inside rAF callbacks. */
export const useScrollState = () => scrollState;
export { sectionProgress, sectionFocus };

/**
 * Pointer parallax applied to an element.
 * `strength` is in pixels; respects reduced motion and coarse pointers.
 */
export function usePointerParallax(strength = 12, enabled = true) {
  const ref = useRef(null);
  const touch = useIsTouch();
  const reduced = usePrefersReducedMotion();
  const active = enabled && !touch && !reduced;

  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return undefined;
    let raf = null;
    let x = 0;
    let y = 0;

    const loop = () => {
      const tx = scrollState.pointer.x * strength;
      const ty = scrollState.pointer.y * strength * 0.7;
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (element) element.style.transform = '';
    };
  }, [strength, active]);

  return ref;
}

/** Cursor-driven 3D tilt for cards. Returns a ref and handlers. */
export function useTilt({ max = 8, scale = 1.015, perspective = 1100 } = {}) {
  const ref = useRef(null);
  const touch = useIsTouch();
  const reduced = usePrefersReducedMotion();
  const enabled = !touch && !reduced;
  const frame = useRef(null);
  const target = useRef({ rx: 0, ry: 0, s: 1 });

  const apply = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const { rx, ry, s } = target.current;
    element.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${s.toFixed(3)})`;
  }, []);

  const onPointerMove = useCallback(
    (event) => {
      if (!enabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      target.current.ry = (px - 0.5) * max * 2;
      target.current.rx = -(py - 0.5) * max * 2;
      target.current.s = scale;
      if (!frame.current) frame.current = requestAnimationFrame(apply);
    },
    [enabled, max, scale, apply],
  );

  const onPointerLeave = useCallback(() => {
    target.current = { rx: 0, ry: 0, s: 1 };
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    apply();
  }, [apply]);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return {
    ref,
    style: { perspective: `${perspective}px` },
    handlers: enabled
      ? { onPointerMove, onPointerLeave, onPointerCancel: onPointerLeave }
      : {},
  };
}
