/**
 * Signed-in dashboard: profile, usage stats, recent conversations.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  History,
  LogOut,
  MessageCircle,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

import { chatApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import PageTransition from '../components/animations/PageTransition';
import ScrollReveal from '../components/animations/ScrollReveal';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import Spinner from '../components/common/Spinner';
import Disclaimer from '../components/common/Disclaimer';

const ROLE_LABEL = { ADMIN: 'Administrator', USER: 'Member' };

function StatCard({ icon: Icon, label, value, accent = '#C9A227' }) {
  return (
    <Card className="flex items-center gap-4">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-tint/10"
        style={{ background: `${accent}1A`, color: accent }}
        aria-hidden="true"
      >
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold tnum text-mist-50">{value}</p>
      </div>
    </Card>
  );
}

function ProfileCard() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [state, setState] = useState({ busy: false, message: null, error: null });

  const save = async (event) => {
    event.preventDefault();
    setState({ busy: true, message: null, error: null });
    try {
      await updateProfile({ name: name.trim() });
      setState({ busy: false, message: 'Profile updated.', error: null });
    } catch (err) {
      setState({ busy: false, message: null, error: err.message });
    }
  };

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
        <UserIcon size={15} className="text-gold-300" />
        Your profile
      </h2>

      <form onSubmit={save} className="mt-5 space-y-4">
        <div>
          <label htmlFor="profile-name" className="label">
            Display name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
            maxLength={120}
            required
          />
        </div>

        <div>
          <span className="label">Email address</span>
          <input
            type="email"
            value={user?.email || ''}
            readOnly
            disabled
            className="field cursor-not-allowed opacity-60"
          />
          <p className="mt-1.5 text-xs text-mist-500">
            The email address is used to sign in and cannot be changed here.
          </p>
        </div>

        {state.message && <p className="text-xs text-positive">{state.message}</p>}
        {state.error && <p className="text-xs text-negative">{state.error}</p>}

        <button
          type="submit"
          disabled={state.busy || !name.trim() || name.trim() === user?.name}
          className="btn-gold btn-sm"
        >
          {state.busy ? <Loader size={13} /> : <Save size={13} />}
          Save changes
        </button>
      </form>
    </Card>
  );
}

function ConversationList() {
  const { data, loading, error } = useAsync(
    () => chatApi.conversations({ limit: 8 }),
    [],
  );

  if (loading) return <Spinner label="Loading conversations" />;
  if (error) return <EmptyState title="Could not load conversations" description={error} />;
  if (!data?.length) {
    return (
      <EmptyState
        title="No conversations yet"
        description="Ask the assistant your first question and it will be saved here."
        icon={History}
        action={
          <Link to="/chat" className="btn-gold btn-sm mt-2">
            Ask a question
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-white/[0.05]">
      {data.map((conversation) => (
        <li key={conversation.id}>
          <Link
            to={`/chat?c=${conversation.id}`}
            className="group flex items-center gap-3 py-3 transition-colors hover:bg-tint/[0.02]"
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-tint/10 bg-tint/[0.04] text-mist-400"
              aria-hidden="true"
            >
              <MessageCircle size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-mist-100">{conversation.title}</span>
              <span className="mt-0.5 block text-2xs tnum text-mist-500">
                {conversation.messageCount} message{conversation.messageCount === 1 ? '' : 's'}
              </span>
            </span>
            <ArrowRight
              size={14}
              className="shrink-0 text-mist-600 transition-transform group-hover:translate-x-0.5 group-hover:text-mist-300"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { user, logout, isAdmin, refreshUser } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  /*
   * The login/register response carries no `stats`, so the first render after
   * signing in would show zeros. `/auth/me` includes the counts, so refresh the
   * user once on mount to keep the tiles honest.
   */
  useEffect(() => {
    refreshUser().catch(() => {
      /* the tiles simply stay at their previous value */
    });
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    await logout();
  }, [logout]);

  const stats = user?.stats || {};

  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">
              <ShieldCheck size={11} className="text-gold-300" />
              {ROLE_LABEL[user?.role] || 'Member'}
            </span>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Hello, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="lede mt-3 max-w-xl">
              Your saved questions, answers and account details in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {isAdmin && (
              <Link to="/admin" className="btn-ghost">
                <ShieldCheck size={14} />
                Admin console
              </Link>
            )}
            <button type="button" onClick={signOut} disabled={signingOut} className="btn-ghost">
              {signingOut ? <Loader size={14} /> : <LogOut size={14} />}
              Sign out
            </button>
          </div>
        </header>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={MessageCircle} label="Questions asked" value={stats.messageCount ?? 0} />
          <StatCard
            icon={History}
            label="Conversations"
            value={stats.conversationCount ?? 0}
            accent="#5B8CFF"
          />
          <StatCard
            icon={UserIcon}
            label="Member since"
            value={
              user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'
            }
            accent="#3FB984"
          />
          <StatCard
            icon={ShieldCheck}
            label="Role"
            value={ROLE_LABEL[user?.role] || 'Member'}
            accent="#A78BFA"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <ProfileCard />

            <Card>
              <h2 className="text-sm font-semibold text-mist-50">Your data</h2>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-mist-400">
                We store the questions you ask and the answers you receive so you can return to
                them. Nothing is shared with lenders, and this assistant never asks for your OTP,
                PIN or password.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="gold">JWT secured</Badge>
                <Badge tone="positive">No credential collection</Badge>
              </div>
            </Card>

            <Disclaimer variant="full" />
          </div>

          <ScrollReveal>
            <Card>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
                  <History size={15} className="text-gold-300" />
                  Recent conversations
                </h2>
                <Link to="/chat" className="btn-ghost btn-sm">
                  New question
                  <ArrowRight size={12} />
                </Link>
              </div>
              <ConversationList />
            </Card>
          </ScrollReveal>
        </div>
      </div>
    </PageTransition>
  );
}
