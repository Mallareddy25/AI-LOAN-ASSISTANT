/**
 * Shared scroll + pointer engine.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * Scroll-driven 3D and parallax usually get implemented with React state,
 * which re-renders the tree on every scroll frame and janks. Instead this
 * module keeps a single mutable state object that is written by ONE
 * `requestAnimationFrame` loop and read directly inside R3F's `useFrame` or
 * DOM refs. React never re-renders because of scrolling.
 *
 * Values exposed:
 *   progress   0 → 1 across the whole document
 *   velocity   signed scroll speed, damped toward 0 (good for momentum FX)
 *   direction  -1 up, 1 down
 *   pointer    normalised -1 → 1 on both axes (0,0 on touch devices)
 *   pointerRaw clientX/clientY
 *   scrollY    px
 *   sections   { id, top, height, center } for every registered section
 *   reduced    user prefers reduced motion
 *   tier       'high' | 'medium' | 'low' — drives 3D density
 *   visible    whether the shared canvas is on screen (pause rAF when not)
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

/** Frame-rate independent damping (Lerp smoothing). */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const scrollState = {
  progress: 0,
  velocity: 0,
  rawVelocity: 0,
  direction: 1,
  scrollY: 0,
  viewportHeight: typeof window === 'undefined' ? 800 : window.innerHeight,
  viewportWidth: typeof window === 'undefined' ? 1280 : window.innerWidth,
  documentHeight: 1,
  pointer: { x: 0, y: 0 },
  pointerRaw: { x: 0, y: 0 },
  pointerActive: false,
  sections: new Map(),
  reduced: false,
  coarse: false,
  tier: 'high',
  visible: true,
  // Section currently dominating the viewport, for storytelling transitions.
  activeSection: '',
  lastFrame: 0,
};

const pointerTarget = { x: 0, y: 0 };
const pointerSmooth = { x: 0, y: 0 };
let sectionElements = new Map();
let rafId = null;
let lastScrollY = 0;
let lastTime = 0;
let running = false;

/* ── Device tier ──────────────────────────────────────────────────────
   Drives how many coins/particles/shadows we create. Measured once per
   resize rather than per frame. */
function computeTier() {
  const w = scrollState.viewportWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;

  if (scrollState.reduced) return 'low';
  if (scrollState.coarse || w < 768) return 'low';
  if (w < 1280 || cores <= 4 || mem <= 4) return 'medium';
  return 'high';
}

const TIER_DENSITY = {
  high: { coins: 16, particles: 260, labels: 8, shadows: true, docCards: 5 },
  medium: { coins: 10, particles: 140, labels: 6, shadows: true, docCards: 4 },
  low: { coins: 5, particles: 0, labels: 4, shadows: false, docCards: 3 },
};

export const density = () => TIER_DENSITY[scrollState.tier] || TIER_DENSITY.high;

/* ── Reduced motion ─────────────────────────────────────────────────── */
function readReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyMotionPreference() {
  scrollState.reduced = readReducedMotion();
  scrollState.coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  scrollState.tier = computeTier();
  document.documentElement.dataset.reducedMotion = String(scrollState.reduced);
  document.documentElement.dataset.tier = scrollState.tier;
}

/* ── Section registry ────────────────────────────────────────────────
   Sections register a DOM id. Each frame we store their geometry so the
   3D layer can respond to "which part of the story are we in". */
export function registerSection(id, element) {
  if (!id || !element) return () => {};
  sectionElements.set(id, element);
  scrollState.sections.set(id, { id, top: 0, height: 0, center: 0 });
  return () => {
    sectionElements.delete(id);
    scrollState.sections.delete(id);
  };
}

function measureSections() {
  scrollState.viewportHeight = window.innerHeight;
  const scrollY = window.scrollY || window.pageYOffset || 0;

  // The page grows as lazy chunks, images and API data arrive, so the scroll
  // denominator has to be re-read here. Without this, progress saturates at
  // 100% partway down a page that was still short when the engine started.
  const nextHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (nextHeight > 0 && nextHeight !== scrollState.documentHeight) {
    scrollState.documentHeight = nextHeight;
  }

  sectionElements.forEach((element, id) => {
    const rect = element.getBoundingClientRect();
    const top = rect.top + scrollY;
    const entry = scrollState.sections.get(id) || { id };
    entry.top = top;
    entry.height = rect.height;
    entry.center = top + rect.height / 2;
    scrollState.sections.set(id, entry);
  });

  // Whichever section's centre is nearest the viewport centre is "active".
  const focus = scrollY + scrollState.viewportHeight * 0.45;
  let best = '';
  let bestDistance = Infinity;
  scrollState.sections.forEach((entry) => {
    const distance = Math.abs(entry.center - focus);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry.id;
    }
  });
  scrollState.activeSection = best;
}

let resizeTimer = null;
function onResize() {
  scrollState.viewportWidth = window.innerWidth;
  scrollState.viewportHeight = window.innerHeight;
  scrollState.documentHeight =
    document.documentElement.scrollHeight - window.innerHeight || 1;
  applyMotionPreference();
  measureSections();

  clearTimeout(resizeTimer);
  // Re-measure once the resize settles: section geometry and the scroll
  // progress denominator are both stale until it does.
  resizeTimer = setTimeout(() => {
    scrollState.documentHeight =
      document.documentElement.scrollHeight - window.innerHeight || 1;
    measureSections();
  }, 120);
}

/* ── Pointer ────────────────────────────────────────────────────────
   Touch devices never fire pointermove for a hover, so we only track
   fine pointers and let touch rely on scroll instead. */
function onPointerMove(event) {
  if (event.pointerType && event.pointerType !== 'mouse') return;
  pointerTarget.x = (event.clientX / scrollState.viewportWidth) * 2 - 1;
  pointerTarget.y = (event.clientY / scrollState.viewportHeight) * 2 - 1;
  scrollState.pointerRaw.x = event.clientX;
  scrollState.pointerRaw.y = event.clientY;
  scrollState.pointerActive = true;
}

function onPointerLeave() {
  pointerTarget.x = 0;
  pointerTarget.y = 0;
  scrollState.pointerActive = false;
}

/* ── Visibility: stop work in a background tab ─────────────────────── */
function onVisibilityChange() {
  const hidden = document.visibilityState === 'hidden';
  scrollState.visible = !hidden;
  if (hidden) stop();
  else start();
}

/* ── The single rAF loop ──────────────────────────────────────────── */
function frame(now) {
  if (!running) return;
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
  lastTime = now;

  const scrollY = window.scrollY || window.pageYOffset || 0;
  const maxScroll = scrollState.documentHeight;
  const delta = scrollY - lastScrollY;
  lastScrollY = scrollY;

  scrollState.scrollY = scrollY;
  scrollState.direction = delta >= 0 ? 1 : -1;
  scrollState.progress = clamp(scrollY / Math.max(maxScroll, 1), 0, 1);

  // Velocity in px/frame, damped so motion settles instead of jittering.
  scrollState.rawVelocity = delta;
  scrollState.velocity = damp(scrollState.velocity, delta, 9, dt);

  // Pointer smoothing — subtle parallax must never feel jittery.
  if (!scrollState.reduced) {
    pointerSmooth.x = damp(pointerSmooth.x, pointerTarget.x, 4.5, dt);
    pointerSmooth.y = damp(pointerSmooth.y, pointerTarget.y, 4.5, dt);
  } else {
    pointerSmooth.x = 0;
    pointerSmooth.y = 0;
  }
  scrollState.pointer.x = pointerSmooth.x;
  scrollState.pointer.y = pointerSmooth.y;

  scrollState.lastFrame = now;
  rafId = requestAnimationFrame(frame);
}

export function start() {
  if (running || typeof window === 'undefined') return;
  running = true;
  lastTime = 0;
  rafId = requestAnimationFrame(frame);
}

export function stop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

/** Wire up listeners. Returns a teardown function. */
export function initScrollEngine() {
  if (typeof window === 'undefined') return () => {};

  scrollState.viewportWidth = window.innerWidth;
  scrollState.viewportHeight = window.innerHeight;
  scrollState.documentHeight =
    document.documentElement.scrollHeight - window.innerHeight || 1;
  applyMotionPreference();
  measureSections();

  window.addEventListener('scroll', measureSections, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  /*
   * Content that arrives without a scroll or resize — a lazy route chunk, an
   * API response rendering more cards, a late web font — changes the page
   * height. Observe the body so section geometry and progress stay correct.
   */
  let contentObserver = null;
  if (typeof ResizeObserver !== 'undefined' && document.body) {
    contentObserver = new ResizeObserver(() => measureSections());
    contentObserver.observe(document.body);
  }

  // `matchMedia` can change while the tab is open.
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const onMotionChange = () => {
    applyMotionPreference();
    if (scrollState.reduced) {
      scrollState.velocity = 0;
      scrollState.pointer.x = 0;
      scrollState.pointer.y = 0;
    }
  };
  motionQuery?.addEventListener?.('change', onMotionChange);

  start();

  return () => {
    stop();
    window.removeEventListener('scroll', measureSections);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    motionQuery?.removeEventListener?.('change', onMotionChange);
    contentObserver?.disconnect();
    clearTimeout(resizeTimer);
  };
}

/** Normalised progress of a section through the viewport, 0 → 1. */
export function sectionProgress(id) {
  const entry = scrollState.sections.get(id);
  if (!entry) return 0;
  const start = entry.top - scrollState.viewportHeight;
  const total = entry.height + scrollState.viewportHeight;
  return clamp((scrollState.scrollY - start) / Math.max(total, 1), 0, 1);
}

/** How centred a section is, 0 (off-screen) → 1 (dead centre). */
export function sectionFocus(id) {
  const entry = scrollState.sections.get(id);
  if (!entry) return 0;
  const distance = Math.abs(entry.center - (scrollState.scrollY + scrollState.viewportHeight / 2));
  const range = scrollState.viewportHeight * 0.9;
  return clamp(1 - distance / range, 0, 1);
}

export const scroll = scrollState;
