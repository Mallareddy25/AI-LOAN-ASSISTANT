/*
 * Resolve the stored theme before first paint.
 *
 * This lives in its own file rather than inline in index.html because the
 * production Content-Security-Policy allows script-src 'self' with no
 * 'unsafe-inline' and no hashes, so an inline script would be blocked. A
 * classic (non-module) script in <head> is still render-blocking, so it runs
 * before the first paint exactly like an inline one would.
 */
(function () {
  var LIGHT = '#f4f6fa';
  var DARK = '#070910';
  try {
    var stored = localStorage.getItem('loan-assistant-theme');
    var theme = stored === 'dark' || stored === 'light' ? stored : 'light';
    document.documentElement.dataset.theme = theme;
    // Paint the page background to match, so a light-theme user never sees a
    // dark rectangle while the stylesheet loads.
    document.documentElement.style.background = theme === 'dark' ? DARK : LIGHT;
  } catch (e) {
    // Private mode can throw on localStorage; light is the documented default.
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.background = LIGHT;
  }
})();
