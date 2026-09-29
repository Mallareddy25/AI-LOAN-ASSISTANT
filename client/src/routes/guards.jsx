/**
 * Route guards.
 *
 * While the session is still being rehydrated we render a neutral placeholder
 * rather than redirecting, otherwise a hard refresh on a protected page would
 * bounce a signed-in user to the login screen for a frame.
 */
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Loader, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Waiting() {
  return (
    <div className="grid min-h-[70svh] place-content-center gap-3 text-center" role="status">
      <Loader size={26} className="mx-auto text-gold-400" />
      <p className="text-sm text-mist-400">Checking your session…</p>
    </div>
  );
}

export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Waiting />;

  if (!isAuthenticated) {
    // Remember where they were going so login can return them there.
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}

export function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Waiting />;

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isAdmin) {
    // A dead-end message beats a silent redirect: the user learns *why*.
    return (
      <div className="shell grid min-h-[70svh] place-content-center py-20 text-center">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-negative/25 bg-negative/[0.08] text-negative"
          aria-hidden="true"
        >
          <ShieldCheck size={22} />
        </span>
        <h1 className="mt-6 text-2xl font-semibold">Admins only</h1>
        <p className="lede mx-auto mt-3 max-w-md">
          This account does not have the ADMIN role, so the admin console is not available.
        </p>
        <Link to="/dashboard" className="btn-ghost mt-6">
          Back to my dashboard
        </Link>
      </div>
    );
  }

  return children;
}
