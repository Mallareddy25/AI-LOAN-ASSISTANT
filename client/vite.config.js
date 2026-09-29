import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vite configuration.
 *
 * Performance notes:
 *  • `three` + `@react-three/*` are split into their own chunks so the
 *    marketing/home experience does not block on the 3D runtime.
 *  • The 3D bundle is only preloaded for routes that actually render a canvas,
 *    which keeps first paint fast on content pages.
 *  • The dev server proxies `/api` to the Express backend so the browser sees a
 *    single origin (no CORS preflight, no hard-coded host in the client).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:5050';

  return {
    plugins: [react()],

    resolve: {
      alias: { '@': path.resolve(process.cwd(), 'src') },
    },

    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },

    preview: {
      port: 4173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },

    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          /*
           * Package names are matched exactly rather than by substring.
           * `id.includes('react')` also matches `@react-three/fiber`, which
           * dragged the whole WebGL bundle into the eagerly-preloaded `react`
           * chunk; `id.includes('three')` made Rollup list that manual chunk
           * among the entry's static imports, so Vite emitted a modulepreload
           * link for it and every route downloaded ~190 kB of WebGL it never
           * used. Leaving three unassigned lets Rollup split it on its own,
           * because it is only reachable through a dynamic import.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/node_modules\/(recharts|d3-[a-z]+)\//.test(id)) return 'charts';
            if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
            if (/node_modules\/(react-markdown|remark-[a-z]+|micromark[a-z-]*|mdast-[a-z]+|unist-[a-z-]+|unified|bail|trough|vfile[a-z-]*|is-plain-obj|devlop|decode-named-character-reference|character-entities[a-z-]*|property-information|hast-util[a-z-]*|html-url-attributes|space-separated-tokens|comma-separated-tokens|ccount|escape-string-regexp|markdown-table|zwitch|longest-streak|trim-lines|estree-util-is-identifier-name|html-void-elements|web-namespaces|parse-entities|character-reference-invalid|is-decimal|is-hexadecimal|html-comment|regex-parser|regex-utilities)\//.test(id)) {
              return 'markdown';
            }
            if (/node_modules\/(react-router|react-router-dom|@remix-run\/router)\//.test(id)) {
              return 'router';
            }
            if (/node_modules\/(react|react-dom|scheduler|use-sync-external-store)\/|^[^:]*node_modules\/(react|react-dom|scheduler)\//.test(id)) {
              return 'react';
            }
            return undefined;
          },
        },
      },
    },
  };
});
