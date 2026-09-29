/**
 * Procedurally generated textures.
 *
 * Everything is drawn with the Canvas 2D API at runtime — no external font,
 * image or CDN request. That keeps the app fully functional offline and means
 * the browser console stays clean.
 *
 * Textures are cached by key and disposed by `disposeTextureCache()` when the
 * app unmounts, so GPU memory is not leaked across route changes.
 */
import * as THREE from 'three';

const cache = new Map();

function canvas(size, height = size) {
  const element = document.createElement('canvas');
  element.width = size;
  element.height = height;
  return element;
}

/** Soft round particle with a feathered edge. */
export function particleTexture() {
  if (cache.has('particle')) return cache.get('particle');

  const size = 128;
  const element = canvas(size);
  const ctx = element.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set('particle', texture);
  return texture;
}

/**
 * Metallic coin face: brushed gold disc with a raised rim and a symbol.
 * @param {string} symbol  Typically a currency sign or a short label
 * @param {object} options
 */
export function coinTexture(symbol = '₹', { tone = 'gold', size = 256 } = {}) {
  const key = `coin:${symbol}:${tone}:${size}`;
  if (cache.has(key)) return cache.get(key);

  const element = canvas(size);
  const ctx = element.getContext('2d');
  const c = size / 2;

  const palettes = {
    gold: { hi: '#FBF3DE', mid: '#D8B84A', low: '#8A6F1C', rim: '#C9A227' },
    silver: { hi: '#F4F6F9', mid: '#C3CAD6', low: '#6E7787', rim: '#AEB7C5' },
    brand: { hi: '#DDE7FF', mid: '#7C9FFF', low: '#2C54B4', rim: '#5B8CFF' },
  };
  const palette = palettes[tone] || palettes.gold;

  // Base disc with a diagonal metallic gradient.
  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, palette.hi);
  base.addColorStop(0.35, palette.mid);
  base.addColorStop(0.62, palette.low);
  base.addColorStop(0.85, palette.mid);
  base.addColorStop(1, palette.hi);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.94, 0, Math.PI * 2);
  ctx.fill();

  // Brushed radial streaks for a cast-metal feel.
  ctx.save();
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 90; i += 1) {
    const angle = (i / 90) * Math.PI * 2;
    ctx.strokeStyle = i % 2 ? '#ffffff' : '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(angle) * c * 0.2, c + Math.sin(angle) * c * 0.2);
    ctx.lineTo(c + Math.cos(angle) * c * 0.9, c + Math.sin(angle) * c * 0.9);
    ctx.stroke();
  }
  ctx.restore();

  // Raised rim.
  ctx.strokeStyle = palette.rim;
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.86, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  // Symbol.
  const isLong = symbol.length > 2;
  ctx.fillStyle = 'rgba(58,44,8,0.82)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${isLong ? 600 : 700} ${size * (isLong ? 0.2 : 0.5)}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.shadowColor = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur = size * 0.03;
  ctx.shadowOffsetY = -size * 0.012;
  ctx.fillText(symbol, c, c + size * 0.02);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

/** Frosted panel used by the floating document cards. */
export function documentTexture() {
  if (cache.has('document')) return cache.get('document');

  const w = 256;
  const h = 320;
  const element = canvas(w, h);
  const ctx = element.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, 'rgba(255,255,255,0.10)');
  bg.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Faux document lines so the card reads as a document, not a blank plane.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let i = 0; i < 9; i += 1) {
    const y = 54 + i * 22;
    const width = i === 0 ? w * 0.5 : w * (0.32 + ((i * 37) % 30) / 100);
    ctx.fillRect(24, y, width, 8);
  }
  ctx.fillStyle = 'rgba(201,162,39,0.5)';
  ctx.fillRect(24, 26, 46, 10);

  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set('document', texture);
  return texture;
}

/** Radial glow sprite for the orb halo and light bloom. */
export function glowTexture() {
  if (cache.has('glow')) return cache.get('glow');

  const size = 256;
  const element = canvas(size);
  const ctx = element.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.18, 'rgba(255,236,190,0.55)');
  gradient.addColorStop(0.45, 'rgba(201,162,39,0.18)');
  gradient.addColorStop(1, 'rgba(201,162,39,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set('glow', texture);
  return texture;
}

/** Vertical gradient for the scene background fog plane. */
export function backdropTexture() {
  if (cache.has('backdrop')) return cache.get('backdrop');

  const w = 8;
  const h = 256;
  const element = canvas(w, h);
  const ctx = element.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, h);

  gradient.addColorStop(0, '#0B1020');
  gradient.addColorStop(0.45, '#080A11');
  gradient.addColorStop(1, '#05060A');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set('backdrop', texture);
  return texture;
}

/** Release every cached GPU texture. */
export function disposeTextureCache() {
  cache.forEach((texture) => texture.dispose());
  cache.clear();
}
