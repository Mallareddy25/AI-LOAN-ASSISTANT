/**
 * Admin console.
 *
 * Everything here is real operational data from `/api/admin/*`. The tabs are:
 *   Overview    — counts, knowledge base size, AI usage, 7-day activity chart
 *   Users       — list, change role, activate/deactivate
 *   Knowledge   — read + create/update/delete for each collection
 *
 * Write endpoints are plain validated CRUD, rate limited server-side by
 * `writeLimiter`; the ADMIN role is the only gate.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronRight,
  Database,
  Info,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { adminApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/animations/PageTransition';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Loader from '../components/common/Loader';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import Pagination from '../components/common/Pagination';
import Skeleton from '../components/common/Skeleton';
import SectionHeading from '../components/common/SectionHeading';
import FilterBar from '../components/common/FilterBar';

/* ── Collection definitions ────────────────────────────────────────────
   `fields` describes the editable attributes, mirroring each server-side Zod
   schema, so the form cannot submit an unknown key. */
const COLLECTIONS = {
  terms: {
    label: 'Glossary terms',
    singular: 'term',
    title: 'term',
    fields: [
      { key: 'term', label: 'Term', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', hint: 'auto' },
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'shortDefinition', label: 'Short definition', type: 'text', required: true },
      { key: 'detailedExplanation', label: 'Detailed explanation', type: 'textarea', required: true },
      { key: 'example', label: 'Example', type: 'textarea' },
      { key: 'whyItMatters', label: 'Why it matters', type: 'textarea' },
    ],
  },
  loans: {
    label: 'Loan types',
    singular: 'loan type',
    title: 'name',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', hint: 'auto' },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'whatItIs', label: 'What it is', type: 'textarea', required: true },
      { key: 'interestConcept', label: 'Interest concept', type: 'textarea' },
      { key: 'tenureConcept', label: 'Tenure concept', type: 'textarea' },
      { key: 'repaymentConcept', label: 'Repayment concept', type: 'textarea' },
      { key: 'commonPurpose', label: 'Common purpose', type: 'textarea' },
      { key: 'eligibilitySummary', label: 'Eligibility summary', type: 'textarea' },
    ],
  },
  documents: {
    label: 'Documents',
    singular: 'document',
    title: 'title',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'whyNeeded', label: 'Why it is needed', type: 'textarea' },
      { key: 'typicalFormats', label: 'Accepted formats', type: 'text' },
      { key: 'appliesTo', label: 'Applies to', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  eligibility: {
    label: 'Eligibility factors',
    singular: 'factor',
    title: 'factor',
    fields: [
      { key: 'factor', label: 'Factor', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'impact', label: 'Impact', type: 'select', options: ['low', 'medium', 'high'], required: true },
      { key: 'summary', label: 'Summary', type: 'textarea', required: true },
      { key: 'explanation', label: 'Explanation', type: 'textarea', required: true },
      { key: 'typicalConsideration', label: 'Typical consideration', type: 'textarea' },
    ],
  },
  faqs: {
    label: 'FAQs',
    singular: 'FAQ',
    title: 'question',
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'sortOrder', label: 'Display order', type: 'number' },
    ],
  },
};

/* ══ Overview ═══════════════════════════════════════════════════════════ */
function MetricTile({ label, value, hint, accent = '#C9A227' }) {
  return (
    <Card className="p-4">
      <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tnum" style={{ color: accent }}>
        {value ?? 0}
      </p>
      {hint && <p className="mt-0.5 text-[0.6875rem] text-mist-500">{hint}</p>}
    </Card>
  );
}

/** Bar chart of the last 7 days of real question volume. */
function ActivityChart({ activity = [] }) {
  const max = Math.max(1, ...activity.map((day) => day.questions));

  if (!activity.length) {
    return <p className="py-8 text-center text-sm text-mist-500">No questions recorded yet.</p>;
  }

  return (
    <div className="flex h-40 items-end gap-2">
      {activity.map((day) => {
        const height = Math.max(4, (day.questions / max) * 100);
        return (
          <div key={day.day} className="group flex flex-1 flex-col items-center gap-2">
            <span className="text-2xs tnum text-mist-500 opacity-0 transition-opacity group-hover:opacity-100">
              {day.questions}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-brand-400/40 to-gold-300/80 transition-[height] duration-500"
                style={{ height: `${height}%` }}
                title={`${day.day}: ${day.questions} questions`}
              />
            </div>
            <span className="text-[0.5625rem] tnum text-mist-600">
              {String(day.day).slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    adminApi
      .stats()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  if (error) return <EmptyState title="Could not load statistics" description={error} />;
  if (!data) return <Spinner label="Loading statistics" />;

  const breakdown = data.knowledgeBreakdown || {};
  const totalKnowledge = data.totalKnowledgeItems || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Registered users" value={data.totalUsers} hint={`${data.activeUsers} active`} />
        <MetricTile
          label="Questions today"
          value={data.questionsToday}
          accent="#5B8CFF"
          hint={`${data.totalMessages} messages all time`}
        />
        <MetricTile
          label="Conversations"
          value={data.totalConversations}
          accent="#3FB984"
        />
        <MetricTile
          label="Knowledge items"
          value={totalKnowledge}
          accent="#A78BFA"
          hint="Terms, loans, documents, factors, FAQs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
            <Activity size={15} className="text-gold-300" />
            Questions asked — last 7 days
          </h2>
          <div className="mt-5">
            <ActivityChart activity={data.activity} />
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
            <Database size={15} className="text-gold-300" />
            Answer engine usage
          </h2>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-mist-300">Online model</span>
              <span className="tnum text-mist-500">{data.aiUsage?.openai ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-mist-300">Knowledge base</span>
              <span className="tnum text-mist-500">{data.aiUsage?.offline_knowledge ?? 0}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-tint/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-gold-300"
                style={{
                  width: `${
                    (data.aiUsage?.openai ?? 0) /
                    Math.max(1, (data.aiUsage?.openai ?? 0) + (data.aiUsage?.offline_knowledge ?? 0)) *
                    100
                  }%`,
                }}
              />
            </div>
            <p className="flex items-start gap-2 pt-1 text-[0.6875rem] leading-relaxed text-mist-500">
              <Info size={11} className="mt-0.5 shrink-0" />
              {data.ai?.configured
                ? `Model-generated answers are enabled (${data.ai.model}). Answers that come from the knowledge base instead are counted separately above.`
                : 'No OpenAI key is configured, so every answer is generated from the curated knowledge base. Add a key on the server to enable model-generated answers.'}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
            <BookOpen size={15} className="text-gold-300" />
            Knowledge base breakdown
          </h2>
          <ul className="mt-4 space-y-2.5">
            {Object.entries(breakdown).map(([key, count]) => (
              <li key={key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs capitalize text-mist-400">{key}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-tint/[0.06]">
                  <span
                    className="block h-full rounded-full bg-brand-400/60"
                    style={{ width: `${((count || 0) / Math.max(1, totalKnowledge)) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-xs tnum text-mist-300">{count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
            <Activity size={15} className="text-gold-300" />
            Most asked topics
          </h2>
          {data.topTopics?.length ? (
            <ul className="mt-4 space-y-1.5">
              {data.topTopics.map((topic) => (
                <li key={topic.topic} className="flex items-center justify-between gap-3 text-xs">
                  {topic.slug ? (
                    <Link
                      to={`/glossary/${topic.slug}`}
                      className="truncate text-mist-300 transition-colors hover:text-gold-200"
                    >
                      {topic.topic}
                    </Link>
                  ) : (
                    <span className="truncate text-mist-300">{topic.topic}</span>
                  )}
                  <span className="shrink-0 tnum text-mist-500">{topic.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-mist-500">Not enough questions yet to rank topics.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ══ Users ═════════════════════════════════════════════════════════════ */
function Users() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user: me } = useAuth();

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi
      .users({ search: debounced || undefined, page, limit: 15 })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, page]);

  const update = async (userId, patch, action) => {
    try {
      await action();
      const fresh = await adminApi.users({ search: debounced || undefined, page, limit: 15 });
      setResult(fresh);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !result) return <EmptyState title="Could not load users" description={error} />;

  const rows = result?.data || [];

  return (
    <div>
      <div className="mb-5">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by name or email…"
          resultLabel={result?.pagination ? `${result.pagination.total} users` : undefined}
        />
      </div>

      {error && (
        <p role="alert" className="mb-4 text-xs text-negative">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No users match that search" icon={UsersIcon} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="text-2xs uppercase tracking-wide2 text-mist-500">
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Joined</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelf = row.id === me?.id;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-tint/[0.05] text-mist-300 transition-colors hover:bg-tint/[0.02]"
                  >
                    <td className="px-3 py-2.5">
                      <span className="block font-semibold text-mist-100">{row.name}</span>
                      <span className="block text-2xs text-mist-500">{row.email}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={row.role === 'ADMIN' ? 'gold' : 'neutral'}>{row.role}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={row.isActive ? 'positive' : 'negative'}>
                        {row.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 tnum text-mist-500">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isSelf}
                          title={isSelf ? 'You cannot change your own role' : 'Toggle role'}
                          onClick={() =>
                            update(
                              row.id,
                              row.role,
                              () =>
                                adminApi.setUserRole(
                                  row.id,
                                  row.role === 'ADMIN' ? 'USER' : 'ADMIN',
                                ),
                            )
                          }
                          className="btn-ghost btn-sm disabled:opacity-40"
                        >
                          {row.role === 'ADMIN' ? 'Make user' : 'Make admin'}
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          title={isSelf ? 'You cannot disable yourself' : 'Toggle status'}
                          onClick={() =>
                            update(row.id, !row.isActive, () =>
                              adminApi.setUserStatus(row.id, !row.isActive),
                            )
                          }
                          className="btn-ghost btn-sm disabled:opacity-40"
                        >
                          {row.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {result?.pagination && (
        <Pagination
          page={result.pagination.page}
          totalPages={result.pagination.totalPages}
          total={result.pagination.total}
          onChange={setPage}
          label="users"
        />
      )}
    </div>
  );
}

/* ══ Knowledge CRUD ════════════════════════════════════════════════════ */
function KnowledgeEditor({ collection }) {
  const config = COLLECTIONS[collection];
  const api = useMemo(() => adminApi.collection(collection), [collection]);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .list({ search: debounced || undefined, page, limit: 20 })
      .then((data) => {
        setRows(data.data || []);
        setPagination(data.pagination);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [api, debounced, page]);

  useEffect(load, [load]);

  const startEdit = (row) => {
    setEditing(row);
    setFieldErrors({});
    setError(null);
    const next = {};
    config.fields.forEach((field) => {
      next[field.key] = row[field.key] ?? '';
    });
    setDraft(next);
  };

  const startCreate = () => {
    setEditing({ id: null });
    setFieldErrors({});
    setError(null);
    const next = {};
    config.fields.forEach((field) => {
      next[field.key] = field.type === 'number' ? 0 : '';
    });
    setDraft(next);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const payload = { ...draft };
    config.fields.forEach((field) => {
      if (field.type === 'number') payload[field.key] = Number(payload[field.key]) || 0;
      if (payload[field.key] === '') delete payload[field.key];
    });

    // Catch missing fields here rather than letting the round trip fail with a
    // 422 the admin would have to decode.
    const missing = config.fields.filter(
      (field) => field.required && (draft[field.key] ?? '') === '',
    );
    if (missing.length) {
      setFieldErrors(Object.fromEntries(missing.map((f) => [f.key, `${f.label} is required.`])));
      setError('Fill in the highlighted fields and try again.');
      setSaving(false);
      return;
    }

    try {
      if (editing.id) await api.update(editing.id, payload);
      else await api.create(payload);
      setFlash({ tone: 'positive', text: `${config.label} saved.` });
      setEditing(null);
      load();
    } catch (err) {
      // The API already maps Zod issues onto field names, so show them inline.
      setFieldErrors(err.fieldErrors || {});
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row[config.title]}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.remove(row.id);
      setFlash({ tone: 'positive', text: `${config.singular} deleted.` });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${config.label.toLowerCase()}…`}
            aria-label={`Search ${config.label}`}
            className="field"
          />
        </div>
        <button type="button" onClick={startCreate} className="btn-gold btn-sm">
          <Plus size={13} />
          Add {config.singular}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-xs text-negative">
          {error}
        </p>
      )}
      {flash && (
        <p className="mb-4 text-xs text-positive" role="status">
          {flash.text}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={`No ${config.label.toLowerCase()} found`} icon={BookOpen} />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-mist-100">{row[config.title]}</p>
                <p className="truncate text-2xs text-mist-500">
                  {row.category || row.slug || `id ${row.id}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" onClick={() => startEdit(row)} className="btn-ghost btn-sm">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(row)}
                  aria-label={`Delete ${row[config.title]}`}
                  className="btn-ghost btn-sm text-negative/80 hover:text-negative"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onChange={setPage}
          label={config.label.toLowerCase()}
        />
      )}

      {/* ── Editor ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-tint/[0.09] bg-ink-900 p-6 sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-label={`${editing.id ? 'Edit' : 'Add'} ${config.singular}`}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-mist-50">
                {editing.id ? 'Edit' : 'Add'} {config.singular}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFieldErrors({});
                }}
                aria-label="Close"
                className="rounded-lg p-1.5 text-mist-500 transition-colors hover:bg-tint/[0.06] hover:text-mist-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {config.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`field-${field.key}`} className="label">
                    {field.label}
                    {field.required && <span className="ml-1 text-negative">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`field-${field.key}`}
                      rows={3}
                      value={draft[field.key] ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      className={`field resize-y ${fieldErrors[field.key] ? 'border-negative/70' : ''}`}
                      required={field.required}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      id={`field-${field.key}`}
                      value={draft[field.key] ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      className="field"
                      required={field.required}
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`field-${field.key}`}
                      type={field.type}
                      value={draft[field.key] ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      className={`field ${field.type === 'number' ? 'tnum' : ''} ${
                        fieldErrors[field.key] ? 'border-negative/70' : ''
                      }`}
                      required={field.required}
                      placeholder={field.hint === 'auto' ? 'Generated from the title if left blank' : undefined}
                    />
                  )}
                  {field.hint === 'auto' && (
                    <p className="mt-1 text-[0.6875rem] text-mist-500">
                      Leave blank to generate a URL-safe slug from the title.
                    </p>
                  )}
                  {fieldErrors[field.key] && (
                    <p className="mt-1 text-[0.6875rem] text-negative" role="alert">
                      {fieldErrors[field.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className="btn-gold">
                {saving ? <Loader size={14} /> : <Save size={14} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ Page ══════════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'users', label: 'Users', icon: UsersIcon },
  ...Object.entries(COLLECTIONS).map(([key, value]) => ({
    key,
    label: value.label,
    icon: BookOpen,
  })),
];

export default function AdminPage() {
  const [tab, setTab] = useState('overview');

  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <SectionHeading
          eyebrow="Administration"
          title="Admin console"
          lede="Operational figures come straight from the database. Knowledge records are the same content the public pages read."
        />

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`btn-ghost btn-sm ${tab === item.key ? 'border-gold-400/40 text-gold-200' : ''}`}
            >
              <item.icon size={13} />
              {item.label}
              {tab === item.key && <ChevronRight size={12} />}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'overview' && <Overview />}
          {tab === 'users' && <Users />}
          {COLLECTIONS[tab] && <KnowledgeEditor key={tab} collection={tab} />}
        </div>

        <p className="mt-10 flex items-start gap-2 text-xs leading-relaxed text-mist-500">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-gold-400/70" />
          This console is restricted to accounts with the ADMIN role, and every write is validated on
          the server. Administrative actions are not recorded in the public knowledge base.
        </p>
      </div>
    </PageTransition>
  );
}
