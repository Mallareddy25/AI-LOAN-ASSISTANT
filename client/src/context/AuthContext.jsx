/**
 * Authentication context.
 *
 * Holds the signed-in user + tokens, exposes `login`/`register`/`logout`, and
 * re-hydrates the session on first mount by calling `/auth/me`. It also
 * subscribes to the API layer's session-expired signal so a failed refresh
 * logs the user out everywhere at once.
 */
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, tokenStore, onSessionExpired } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Rehydrate an existing session.
  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      if (!tokenStore.access && !tokenStore.refresh) {
        setStatus('anonymous');
        return;
      }
      try {
        const me = await authApi.me();
        if (cancelled) return;
        setUser(me.user || me);
        setStatus('authenticated');
      } catch {
        // Token is stale or invalid — the interceptor already tried a refresh.
        if (cancelled) return;
        tokenStore.clear();
        setUser(null);
        setStatus('anonymous');
      }
    }

    rehydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Global "session gone" handler.
  useEffect(
    () =>
      onSessionExpired(() => {
        if (!mounted.current) return;
        setUser(null);
        setStatus('anonymous');
      }),
    [],
  );

  const applySession = useCallback((payload) => {
    tokenStore.set(payload);
    setUser(payload.user);
    setStatus('authenticated');
    setError(null);
  }, []);

  const login = useCallback(
    async (credentials) => {
      setError(null);
      const payload = await authApi.login(credentials);
      applySession(payload);
      return payload.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (details) => {
      setError(null);
      const payload = await authApi.register(details);
      applySession(payload);
      return payload.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the call fails, the local session must end.
    }
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const refreshUser = useCallback(async () => {
    // `/auth/me` returns the user object itself (with `stats`), not a wrapper.
    const me = await authApi.me();
    const resolved = me?.user || me;
    setUser(resolved);
    return resolved;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const updated = await authApi.updateProfile(payload);
    setUser((current) => ({ ...current, ...(updated.user || updated) }));
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      setError,
      isAuthenticated: status === 'authenticated',
      isAdmin: user?.role === 'ADMIN',
      isLoading: status === 'loading',
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
    }),
    [user, status, error, login, register, logout, refreshUser, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export default AuthContext;
