/**
 * Application routes.
 *
 * Performance notes:
 *  • The Three.js layer is the single heaviest dependency, so every page that
 *    benefits from it is a lazy route and the canvas itself is lazy and
 *    mounted once, above the router outlet.
 *  • `React.lazy` + `Suspense` keeps the initial bundle to the shell plus the
 *    landing page.
 */
import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

import PageShell from './layouts/PageShell';
import Spinner from './components/common/Spinner';
import { RequireAuth, RequireAdmin } from './routes/guards';

/* The immersive pages render in front of the shared WebGL canvas. */
const IMMERSIVE = new Set(['/', '/loans', '/eligibility', '/documents', '/repayment', '/calculator']);

/*
 * The 3D layer is ~190 kB gzipped, so it is code-split too: routes without an
 * immersive scene (chat, glossary, FAQs, calculator) never download three.js.
 */
const FinancialScene = lazy(() =>
  import('./components/3d').then((m) => ({ default: m.FinancialScene })),
);

const Home = lazy(() => import('./components/landing/Home'));
const LoansPage = lazy(() => import('./pages/Loans').then((m) => ({ default: m.LoansPage })));
const LoanDetailPage = lazy(() =>
  import('./pages/Loans').then((m) => ({ default: m.LoanDetailPage })),
);
const GlossaryPage = lazy(() =>
  import('./pages/Glossary').then((m) => ({ default: m.GlossaryPage })),
);
const TermDetailPage = lazy(() =>
  import('./pages/Glossary').then((m) => ({ default: m.TermDetailPage })),
);
const EligibilityPage = lazy(() => import('./pages/Eligibility'));
const DocumentsPage = lazy(() => import('./pages/Documents'));
const RepaymentPage = lazy(() => import('./pages/Repayment'));
const CalculatorPage = lazy(() => import('./pages/CalculatorPage'));
const FaqsPage = lazy(() => import('./pages/Faqs'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/** Route-level fallback so a lazy chunk never shows a blank screen. */
function RouteFallback() {
  return (
    <div className="grid min-h-[60svh] place-content-center">
      <Spinner label="Loading" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const showScene = IMMERSIVE.has(pathname);

  return (
    <>
      {/* One shared canvas for the whole immersive story. */}
      {showScene && (
        <Suspense fallback={null}>
          <FinancialScene />
        </Suspense>
      )}

      {/*
        Sits between the canvas and the copy. Transparent in the dark theme,
        where the scene *is* the backdrop; a light wash in the light theme, so
        body text keeps a predictable contrast ratio over the geometry.
      */}
      {showScene && <div className="canvas-scrim" aria-hidden="true" />}

      <ScrollToTop />

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PageShell immersive={showScene} />}>
            <Route
              index
              element={<Home />}
            />

            <Route path="loans" element={<LoansPage />} />
            <Route path="loans/:slug" element={<LoanDetailPage />} />
            <Route path="glossary" element={<GlossaryPage />} />
            <Route path="glossary/:slug" element={<TermDetailPage />} />
            <Route path="eligibility" element={<EligibilityPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="repayment" element={<RepaymentPage />} />
            <Route path="calculator" element={<CalculatorPage />} />
            <Route path="faqs" element={<FaqsPage />} />
            <Route path="chat" element={<ChatPage />} />

            <Route
              path="login"
              element={<AuthPage mode="login" />}
            />
            <Route
              path="register"
              element={<AuthPage mode="register" />}
            />

            <Route
              path="dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />

            {/* Legacy/alias paths kept so shared links never 404. */}
            <Route path="terms" element={<Navigate to="/glossary" replace />} />
            <Route path="faq" element={<Navigate to="/faqs" replace />} />
            <Route path="admin/overview" element={<Navigate to="/admin" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
