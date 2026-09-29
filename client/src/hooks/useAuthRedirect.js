/**
 * Where to send a user after they sign in.
 *
 * Prefers an explicit `?next=` target, but only for same-site paths, so an
 * attacker cannot bounce someone to another origin via the login link.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const BACKSLASH = 92;
const SPACE = 32;
const DELETE_CHAR = 127;

/**
 * Reject characters that let a path stop being a path: a backslash, or any
 * control character (including tab and newline) that a lenient parser might
 * strip and then re-parse differently. Ordinary spaces are fine — they show up
 * inside query strings — and are deliberately not rejected.
 *
 * @param {string} value
 * @returns {boolean} true when the value contains an unsafe character
 */
function hasUnsafeCharacter(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === BACKSLASH || code === DELETE_CHAR) return true;
    if (code < SPACE) return true;
  }
  return false;
}

/**
 * Accept a `?next=` value only when it is unambiguously a path on this origin.
 *
 * The subtlety is the backslash: browsers normalise `\` to `/` in URLs, so
 * `/\evil.example` is really a protocol-relative URL in disguise. Testing for
 * a leading `//` on its own does not keep the redirect on this site.
 *
 * @param {unknown} value raw `?next=` value
 * @returns {string|null} the path, or null when it is missing or unsafe
 */
export function safeInternalPath(value) {
  if (typeof value !== 'string' || value === '') return null;
  if (hasUnsafeCharacter(value)) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  return value;
}

export function useAuthRedirect() {
  const [params] = useSearchParams();

  return useMemo(() => safeInternalPath(params.get('next')), [params]);
}

export default useAuthRedirect;
