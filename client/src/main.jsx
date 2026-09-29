import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initScrollEngine } from './utils/scrollEngine';
import './styles/index.css';

/* Hide the pre-React boot screen once the first paint is committed. */
const boot = document.getElementById('boot');
if (boot) {
  boot.dataset.done = 'true';
  setTimeout(() => boot.remove(), 450);
}

/**
 * The shared scroll engine is a single module-level rAF loop. It is started
 * here, once, for the lifetime of the app.
 */
initScrollEngine();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Opt in to the v7 behaviours now, so the router is upgrade-ready. */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <App />
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
