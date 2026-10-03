/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Upay official brand palette
        upay: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc3fd',
          400: '#36a3fa',
          500: '#0054A6', // Upay Official Primary Blue
          600: '#00478d',
          700: '#003972',
          800: '#002b57',
          900: '#001e3e',
          950: '#001328',
        },
        'upay-yellow': {
          50:  '#fffde7',
          100: '#fff9c4',
          200: '#fff59d',
          300: '#fff176',
          400: '#ffee58',
          500: '#FFD600', // Upay Official Primary Yellow
          600: '#e6c100',
          700: '#cca800',
          800: '#b39100',
          900: '#806700',
        },
      },
      spacing: {
        '88': '22rem',
      },
      fontFamily: {
        sans: ['"JetBrains Mono"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in':       'fadeIn 0.35s ease-out',
        'slide-up':      'slideUp 0.4s ease-out',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'border-beam':   'border-beam calc(var(--duration)*1s) infinite linear',
        'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
        'spin-around':   'spin-around calc(var(--speed) * 2) infinite linear',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'border-beam': {
          '100%': {
            'offset-distance': '100%',
          },
        },
        'shimmer-slide': {
          to: {
            transform: 'translate(calc(100cqw - 100%), 0)',
          },
        },
        'spin-around': {
          '0%': {
            transform: 'translateZ(0) rotate(0)',
          },
          '15%, 35%': {
            transform: 'translateZ(0) rotate(90deg)',
          },
          '65%, 85%': {
            transform: 'translateZ(0) rotate(270deg)',
          },
          '100%': {
            transform: 'translateZ(0) rotate(360deg)',
          },
        },
      },
    },
  },
  plugins: [],
}

