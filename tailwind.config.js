/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/popup/**/*.{html,ts}', './src/options/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0D0F12',
        panel: '#12151C',
        raised: '#161A22',
        edge: '#1F242D',
        ink: '#F3F4F6',
        mute: '#9CA3AF',
        brand: {
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      },
      letterSpacing: {
        tightest: '-0.02em'
      },
      boxShadow: {
        glow: '0 0 18px rgba(16,185,129,.28)',
        cta: '0 8px 28px rgba(16,185,129,.28), inset 0 1px 0 rgba(255,255,255,.18)',
        card: 'inset 0 1px 0 rgba(255,255,255,.04)'
      },
      animation: {
        'pulse-dot': 'pulseDot 2s cubic-bezier(.4,0,.6,1) infinite',
        'fade-up': 'fadeUp .28s cubic-bezier(.2,.8,.2,1)'
      },
      keyframes: {
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(16,185,129,.5)' },
          '50%': { opacity: '.6', transform: 'scale(.82)', boxShadow: '0 0 0 4px rgba(16,185,129,0)' }
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
