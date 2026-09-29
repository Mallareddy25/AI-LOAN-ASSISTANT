/**
 * Navigation bar.
 *
 * Scroll-reactive: the bar starts transparent and compact, then gains a
 * translucent glass background, tighter blur and a deeper shadow once the user
 * scrolls. The transition is driven from the shared rAF engine, so it costs
 * nothing per frame and never re-renders the nav.
 *
 * It stays small and the logo never shrinks, so the brand stays readable.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LayoutDashboard, LogOut, Shield, Sun, Moon } from 'lucide-react';

import { scrollState } from '../../utils/scrollEngine';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AIOrbMini } from '../chatbot/AIOrb';

const LINKS = [
  { to: '/loans', label: 'Loans' },
  { to: '/glossary', label: 'Terminology' },
  { to: '/eligibility', label: 'Eligibility' },
  { to: '/documents', label: 'Documents' },
  { to: '/repayment', label: 'Repayment' },
  { to: '/calculator', label: 'EMI Calculator' },
  { to: '/faqs', label: 'FAQs' },
];

export default function Navbar() {
  const barRef = useRef(null);
  const progressRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  /* Scroll reaction without re-rendering React. */
  useEffect(() => {
    let raf = null;
    const loop = () => {
      const y = scrollState.scrollY;
      const bar = barRef.current;
      if (bar) {
        const threshold = 24;
        const next = y > threshold;
        if (bar.dataset.active !== String(next)) bar.dataset.active = String(next);
        // Progress hairline across the very top of the page.
        const progress = progressRef.current;
        if (progress) {
          const pct = (scrollState.progress * 100).toFixed(2);
          if (progress.style.width !== `${pct}%`) progress.style.width = `${pct}%`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Mirror engine state into React only on threshold crossings.
  useEffect(() => {
    const onScroll = () => {
      const next = scrollState.scrollY > 24;
      setScrolled((current) => (current === next ? current : next));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  return (
    <>
      {/* Scroll progress hairline */}
      <div
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-brand-400 via-gold-300 to-positive"
        style={{ width: 0, pointerEvents: 'none' }}
        ref={progressRef}
        data-scroll-progress
        aria-hidden="true"
      />

      <header
        ref={barRef}
        data-active={scrolled}
        className="fixed inset-x-0 top-0 z-50 h-[var(--nav-h)] transition-all duration-500 ease-premium data-[active=false]:bg-transparent data-[active=true]:border-b data-[active=true]:border-tint/[0.07] data-[active=true]:bg-ink-950/72 data-[active=true]:backdrop-blur-xl data-[active=true]:shadow-[0_10px_40px_-18px_rgba(0,0,0,0.9)]"
      >
        <nav className="shell flex h-full items-center gap-3" aria-label="Main">
          {/* Brand — constant size */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <AIOrbMini size={30} />
            <span className="hidden text-sm font-bold tracking-tight text-mist-50 sm:block">
              Loan<span className="text-gold-300">Assistant</span>
            </span>
            <span className="text-sm font-bold tracking-tight text-mist-50 sm:hidden">LA</span>
          </Link>

          {/* Desktop links */}
          <ul className="ml-4 hidden flex-1 items-center gap-0.5 xl:flex">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `relative rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${
                      isActive
                        ? 'text-mist-50'
                        : 'text-mist-400 hover:text-mist-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <span
                          className="absolute inset-x-2.5 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold-300/80 to-transparent"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex-1 xl:hidden" />

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/chat" className="btn-gold btn-sm hidden sm:inline-flex">
              Ask the AI
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-medium text-mist-300 transition-colors hover:text-mist-50 sm:inline-flex"
                >
                  <LayoutDashboard size={14} />
                  <span className="max-w-24 truncate">{user?.name?.split(' ')[0]}</span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="rounded-lg p-2 text-mist-400 transition-colors hover:bg-tint/[0.06] hover:text-gold-200"
                    title="Admin dashboard"
                  >
                    <Shield size={15} />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-mist-400 transition-colors hover:bg-tint/[0.06] hover:text-mist-100"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-semibold text-mist-200 transition-colors hover:text-mist-50"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-mist-400 transition-colors hover:bg-tint/[0.06] hover:text-mist-50"
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              data-testid="theme-toggle"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-lg p-2 text-mist-300 transition-colors hover:bg-tint/[0.06] xl:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <Menu size={18} className="hidden" /> : null}
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 xl:hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-ink-950/80 backdrop-blur-sm transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />
        <nav
          className={`absolute inset-x-0 top-[var(--nav-h)] border-b border-tint/[0.08] bg-ink-900/95 px-5 pb-6 pt-2 backdrop-blur-xl transition-transform duration-300 ease-premium ${
            open ? 'translate-y-0' : '-translate-y-4 opacity-0'
          }`}
          aria-label="Mobile"
        >
          <ul className="grid gap-0.5">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `block rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-tint/[0.06] text-mist-50'
                        : 'text-mist-300 hover:bg-tint/[0.04]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            {isAdmin && (
              <li>
                <NavLink
                  to="/admin"
                  className="block rounded-xl px-3.5 py-3 text-sm font-medium text-gold-200 hover:bg-tint/[0.04]"
                >
                  Admin dashboard
                </NavLink>
              </li>
            )}
          </ul>
          <Link to="/chat" className="btn-gold mt-4 w-full">
            Ask the AI
          </Link>
        </nav>
      </div>
    </>
  );
}
