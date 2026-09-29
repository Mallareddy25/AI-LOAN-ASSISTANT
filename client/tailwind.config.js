/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      /*
       * Every colour resolves through a CSS variable so a theme switch is a
       * single attribute change on <html> — no component edits, and Tailwind's
       * `/opacity` modifiers keep working via <alpha-value>.
       */
      colors: {
        // Page surfaces and panels, darkest-first in the dark theme.
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          750: 'rgb(var(--ink-750) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
        },
        mist: {
          50: 'rgb(var(--mist-50) / <alpha-value>)',
          100: 'rgb(var(--mist-100) / <alpha-value>)',
          200: 'rgb(var(--mist-200) / <alpha-value>)',
          300: 'rgb(var(--mist-300) / <alpha-value>)',
          400: 'rgb(var(--mist-400) / <alpha-value>)',
          500: 'rgb(var(--mist-500) / <alpha-value>)',
          600: 'rgb(var(--mist-600) / <alpha-value>)',
        },
        gold: {
          100: 'rgb(var(--gold-100) / <alpha-value>)',
          200: 'rgb(var(--gold-200) / <alpha-value>)',
          300: 'rgb(var(--gold-300) / <alpha-value>)',
          400: 'rgb(var(--gold-400) / <alpha-value>)',
          500: 'rgb(var(--gold-500) / <alpha-value>)',
          600: 'rgb(var(--gold-600) / <alpha-value>)',
        },
        brand: {
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
        },
        // Overlay wash used for hover states and hairline separators. White on
        // the dark theme, deep slate on the light one, so the same utility
        // class reads correctly in both.
        tint: 'rgb(var(--tint) / <alpha-value>)',
        positive: 'rgb(var(--positive) / <alpha-value>)',
        caution: 'rgb(var(--caution) / <alpha-value>)',
        negative: 'rgb(var(--negative) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Inter var',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.03em',
        wide2: '0.14em',
        wide3: '0.22em',
      },
      boxShadow: {
        // Real depth, used sparingly.
        sm: '0 1px 2px rgba(0,0,0,0.4)',
        md: '0 6px 20px -6px rgba(0,0,0,0.55)',
        lg: '0 18px 46px -14px rgba(0,0,0,0.65)',
        xl: '0 34px 80px -22px rgba(0,0,0,0.7)',
        glass: '0 18px 50px -20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
        coin: '0 10px 30px -12px rgba(0,0,0,0.8)',
        focus: '0 0 0 1px rgba(91,140,255,0.6), 0 0 0 4px rgba(91,140,255,0.16)',
      },
      backgroundImage: {
        // Deliberately sparse: used on hero accents, never on every card.
        'gold-sheen':
          'linear-gradient(135deg, #F6EBD2 0%, #C9A227 38%, #8A6F1C 62%, #DDC077 100%)',
        'glass-sheen':
          'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0) 100%)',
        'brand-fade': 'linear-gradient(135deg, #5B8CFF 0%, #3D6FE0 100%)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'orb-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'caret-blink': {
          '0%, 45%': { opacity: '1' },
          '55%, 100%': { opacity: '0' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'orb-pulse': 'orb-pulse 3.6s cubic-bezier(0.4,0,0.6,1) infinite',
        shimmer: 'shimmer 6s linear infinite',
        'caret-blink': 'caret-blink 1.1s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 22s linear infinite',
      },
    },
  },
  plugins: [],
};
