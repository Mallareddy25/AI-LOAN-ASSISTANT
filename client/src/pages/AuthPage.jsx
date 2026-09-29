/**
 * Sign in / create account.
 *
 * One component serves `/login` and `/register` so the two forms stay visually
 * identical and share validation. Field-level errors come from the server's
 * Zod validation via `ApiError.fields`, so the messages are never invented
 * here.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LogIn, UserPlus, Sparkles } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/animations/PageTransition';
import { AIOrb } from '../components/chatbot';
import Loader from '../components/common/Loader';
import { useAuthRedirect } from '../hooks/useAuthRedirect';

const BENEFITS = [
  'Save your conversations and return to them any time',
  'Rate an answer so the assistant improves for you',
  'Faster follow-ups with your question history in context',
];

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  inputMode,
  min,
  max,
  hint,
}) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && reveal ? 'text' : type;

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          inputMode={inputMode}
          min={min}
          max={max}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`field ${isPassword ? 'pr-11' : ''} ${
            error ? 'border-negative/60 focus:border-negative' : ''
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((current) => !current)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 transition-colors hover:text-mist-200"
          >
            {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-negative">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1.5 text-xs text-mist-500">{hint}</p>}
    </div>
  );
}

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const { login, register, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = useAuthRedirect();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  /**
   * Where to land after authenticating. An explicit same-site `?next=` or the
   * guarded route they tried wins; otherwise an admin belongs in the console
   * rather than on the member dashboard.
   */
  const landingFor = useCallback(
    (signedIn) =>
      redirect ||
      location.state?.from ||
      ((signedIn ?? user)?.role === 'ADMIN' ? '/admin' : '/dashboard'),
    [redirect, location.state, user],
  );

  // Already signed in? Go where they were headed.
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(landingFor(), { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, landingFor]);

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldErrors({});

    try {
      let signedIn;
      if (isRegister) {
        if (form.password !== form.confirmPassword) {
          setFieldErrors({ confirmPassword: 'The two passwords do not match.' });
          return;
        }
        signedIn = await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
      } else {
        signedIn = await login({ email: form.email.trim(), password: form.password });
      }
      navigate(landingFor(signedIn), { replace: true });
    } catch (err) {
      setFieldErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setForm((current) => ({ ...current, email: 'demo@student.test', password: 'Test@1234' }));
  };

  return (
    <PageTransition>
      <div className="shell grid gap-10 pb-16 pt-[calc(var(--nav-h)+3rem)] lg:grid-cols-[1fr_440px] lg:items-center">
        {/* Pitch */}
        <div className="hidden lg:block">
          <span className="eyebrow">
            <Sparkles size={11} className="text-gold-300" />
            {isRegister ? 'Create your account' : 'Welcome back'}
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08]">
            {isRegister ? (
              <>
                Keep your learning
                <br />
                <span className="text-gradient-gold">in one place.</span>
              </>
            ) : (
              <>
                Pick up where
                <br />
                <span className="text-gradient-gold">you left off.</span>
              </>
            )}
          </h1>
          <ul className="mt-8 space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm text-mist-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center lg:justify-start">
            <AIOrb size={150} />
          </div>
        </div>

        {/* Form */}
        <div className="glass glass-edge p-6 sm:p-8">
          <h2 className="text-xl font-semibold">
            {isRegister ? 'Create an account' : 'Sign in'}
          </h2>
          <p className="mt-1.5 text-sm text-mist-400">
            {isRegister
              ? 'It takes a moment, and you stay anonymous to any lender.'
              : 'Use the email you registered with.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {isRegister && (
              <Field
                id="auth-name"
                label="Full name"
                value={form.name}
                onChange={set('name')}
                error={fieldErrors.name}
                autoComplete="name"
                placeholder="Your name"
              />
            )}

            <Field
              id="auth-email"
              label="Email address"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={set('email')}
              error={fieldErrors.email}
              autoComplete="email"
              placeholder="you@example.com"
            />

            <Field
              id="auth-password"
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              error={fieldErrors.password}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              hint={isRegister ? 'At least 8 characters, with one letter and one number.' : undefined}
            />

            {isRegister && (
              <Field
                id="auth-confirm"
                label="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                error={fieldErrors.confirmPassword}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            )}

            {formError && (
              <p role="alert" className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-xs text-mist-200">
                {formError}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-gold w-full">
              {busy ? <Loader size={15} /> : isRegister ? <UserPlus size={15} /> : <LogIn size={15} />}
              {busy
                ? 'Please wait…'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          {!isRegister && (
            <button type="button" onClick={fillDemo} className="btn-ghost btn-sm mt-3 w-full">
              Use the demo account
            </button>
          )}

          <p className="mt-6 text-center text-xs text-mist-500">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <Link
              to={isRegister ? '/login' : '/register'}
              className="font-semibold text-gold-300 transition-colors hover:text-gold-200"
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-2xs text-mist-600">
            You can also use the assistant without an account
            <ArrowRight size={11} />
            <Link to="/chat" className="font-semibold text-mist-400 hover:text-mist-200">
              as a guest
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
