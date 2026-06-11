/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
      },
      colors: {
        brand: {
          yellow: '#FFD700',
          orange: '#FF6B35',
          purple: '#7C3AED',
          green:  '#22C55E',
          red:    '#EF4444',
          sky:    '#0EA5E9',
        },
      },
      keyframes: {
        wiggle: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%':     { transform: 'rotate(3deg)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out infinite',
        float:  'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
