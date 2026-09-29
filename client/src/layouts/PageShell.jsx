/**
 * Page chrome shared by every route.
 *
 * `immersive` routes opt out of the footer and get extra bottom padding so
 * the fixed WebGL canvas can breathe; standard routes get the full chrome.
 */
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { scrollState } from '../utils/scrollEngine';

export function PageShell({ immersive = false, footer = true }) {
  const { pathname } = useLocation();

  // Reset scroll and the shared engine whenever the route changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    scrollState.scrollY = 0;
    scrollState.progress = 0;
    scrollState.velocity = 0;
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={`layer-above-canvas flex-1 ${immersive ? 'pb-24' : 'pb-10'}`}>
        <Outlet />
      </main>
      {footer && !immersive && <Footer />}
    </div>
  );
}

export default PageShell;
