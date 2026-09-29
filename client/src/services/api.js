/**
 * Central HTTP client.
 *
 * Responsibilities
 *  • One place that knows the API base URL and the response envelope shape.
 *  • Attaches the access token to every request.
 *  • On a 401, transparently refreshes once and replays the original request.
 *    Concurrent 401s share a single refresh (no refresh stampede).
 *  • Normalises server errors into a predictable `ApiError` for the UI.
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const ACCESS_KEY = 'lia.accessToken';
const REFRESH_KEY = 'lia.refreshToken';

/* ── Token storage ─────────────────────────────────────────────────────
   localStorage survives reloads, which keeps the demo pleasant. It is a
   deliberate trade-off: for a production deployment of a *real* lending
   product the tokens should be httpOnly cookies instead. */
export const tokenStore = {
  get access() {
    try {
      return localStorage.getItem(ACCESS_KEY);
    } catch {
      return null;
    }
  },
  get refresh() {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set({ accessToken, refreshToken }) {
    try {
      if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    } catch {
      /* private mode — session simply won't persist */
    }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* no-op */
    }
  },
};

/** Error shape the UI can rely on. */
export class ApiError extends Error {
  constructor(message, { status, code, details, fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.fields = fields;
  }

  /** Map server-side field errors into `{ fieldName: message }`. */
  get fieldErrors() {
    if (this.fields && typeof this.fields === 'object') return this.fields;
    const out = {};
    (this.details || []).forEach((detail) => {
      if (detail && detail.field) out[detail.field] = detail.message;
    });
    return out;
  }
}

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((cfg) => {
  const token = tokenStore.access;
  if (token && !cfg.skipAuth) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set the multipart boundary itself.
  if (cfg.data instanceof FormData) {
    delete cfg.headers['Content-Type'];
  }
  return cfg;
});

/* ── Single-flight refresh ─────────────────────────────────────────── */
let refreshInFlight = null;
const listeners = new Set();

/** Notified when the session is definitively gone, so AuthContext can log out. */
export function onSessionExpired(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitSessionExpired() {
  tokenStore.clear();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* a bad listener must not break the interceptor chain */
    }
  });
}

async function refreshTokens() {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { Accept: 'application/json' } },
  );

  const payload = data && data.success ? data.data : null;
  if (!payload || !payload.accessToken) throw new Error('Refresh rejected');
  tokenStore.set(payload);
  return payload.accessToken;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Never try to refresh a refresh, and only once per request.
    const isAuthRoute = original?.url?.includes('/auth/refresh');
    if (status === 401 && original && !original.skipAuth && !isAuthRoute && !original._retried) {
      original._retried = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshTokens().finally(() => {
            refreshInFlight = null;
          });
        }
        const accessToken = await refreshInFlight;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return http(original);
      } catch {
        emitSessionExpired();
      }
    }

    const payload = error.response?.data;
    const err = payload && typeof payload === 'object' && 'error' in payload ? payload.error : null;

    return Promise.reject(
      new ApiError(
        err?.message || error.message || 'Something went wrong. Please try again.',
        {
          status,
          code: err?.code,
          details: err?.details,
          fields: err?.fields,
        },
      ),
    );
  },
);

/** Unwrap the `{ success, data }` envelope. */
async function unwrap(promise) {
  const response = await promise;
  return response.data && 'data' in response.data ? response.data.data : response.data;
}

/**
 * Unwrap but keep the sibling `pagination` / `meta` fields.
 * List endpoints return `{ success, data, pagination, meta }`, so the plain
 * `unwrap` would silently discard paging information.
 */
async function unwrapList(promise) {
  const response = await promise;
  const body = response.data || {};
  return {
    data: 'data' in body ? body.data : body,
    pagination: body.pagination || null,
    meta: body.meta || null,
  };
}

const qs = (params) => {
  const clean = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      clean[key] = value;
    }
  });
  return { params: clean };
};

/* ══ Public / knowledge API ═══════════════════════════════════════════ */
export const api = {
  health: () => unwrap(http.get('/health')),

  loans: () => unwrap(http.get('/loans')),
  loan: (idOrSlug) => unwrap(http.get(`/loans/${idOrSlug}`)),

  termCategories: () => unwrap(http.get('/terms/categories')),
  terms: (params) => unwrapList(http.get('/terms', qs(params))),
  term: (idOrSlug) => unwrap(http.get(`/terms/${idOrSlug}`)),

  documentCategories: () => unwrap(http.get('/documents/categories')),
  documents: (params) => unwrapList(http.get('/documents', qs(params))),

  eligibilityCategories: () => unwrap(http.get('/eligibility/categories')),
  eligibility: (params) => unwrapList(http.get('/eligibility', qs(params))),

  faqCategories: () => unwrap(http.get('/faqs/categories')),
  faqs: (params) => unwrapList(http.get('/faqs', qs(params))),
};

/* ══ Auth ════════════════════════════════════════════════════════════ */
export const authApi = {
  register: (payload) => unwrap(http.post('/auth/register', payload)),
  login: (payload) => unwrap(http.post('/auth/login', payload)),
  logout: () => unwrap(http.post('/auth/logout', { refreshToken: tokenStore.refresh })),
  me: () => unwrap(http.get('/auth/me')),
  updateProfile: (payload) => unwrap(http.patch('/auth/me', payload)),
  changePassword: (payload) => unwrap(http.post('/auth/change-password', payload)),
};

/* ══ Chat ════════════════════════════════════════════════════════════ */
export const chatApi = {
  suggestions: () => unwrap(http.get('/chat/suggestions')),
  send: (payload) => unwrap(http.post('/chat', payload)),
  conversations: (params) => unwrap(http.get('/chat/conversations', qs(params))),
  conversation: (id) => unwrap(http.get(`/chat/conversations/${id}`)),
  rename: (id, title) => unwrap(http.patch(`/chat/conversations/${id}`, { title })),
  archive: (id, isArchived) =>
    unwrap(http.patch(`/chat/conversations/${id}/archive`, { isArchived })),
  remove: (id) => unwrap(http.delete(`/chat/conversations/${id}`)),
  /** `id` is the assistant MESSAGE id, not the conversation id. */
  feedback: (messageId, payload) => unwrap(http.post(`/chat/messages/${messageId}/feedback`, payload)),
};

/* ══ Calculators ══════════════════════════════════════════════════════ */
export const calculatorApi = {
  emi: (payload) => unwrap(http.post('/calculator/emi', payload)),
  emiGet: (params) => unwrap(http.get('/calculator/emi', qs(params))),
  prepayment: (payload) => unwrap(http.post('/calculator/prepayment', payload)),
  estimate: (payload) => unwrap(http.post('/calculator/eligibility/estimate', payload)),
};

/* ══ Admin (ADMIN role only) ══════════════════════════════════════════ */
export const adminApi = {
  stats: () => unwrap(http.get('/admin/stats')),
  activity: (params) => unwrap(http.get('/admin/activity', qs(params))),
  topics: () => unwrap(http.get('/admin/topics')),

  users: (params) => unwrapList(http.get('/admin/users', qs(params))),
  setUserRole: (id, role) => unwrap(http.patch(`/admin/users/${id}/role`, { role })),
  setUserStatus: (id, isActive) =>
    unwrap(http.patch(`/admin/users/${id}/status`, { isActive })),

  // Generic CRUD for each knowledge collection.
  collection: (name) => ({
    list: (params) => unwrapList(http.get(`/admin/${name}`, qs(params))),
    get: (id) => unwrap(http.get(`/admin/${name}/${id}`)),
    create: (payload) => unwrap(http.post(`/admin/${name}`, payload)),
    update: (id, payload) => unwrap(http.put(`/admin/${name}/${id}`, payload)),
    remove: (id) => unwrap(http.delete(`/admin/${name}/${id}`)),
  }),
};

export default http;
