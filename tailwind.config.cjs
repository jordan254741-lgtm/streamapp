/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
      },
      colors: {
        warm: {
          50: 'var(--warm-50)',
          100: 'var(--warm-100)',
          200: 'var(--warm-200)',
          300: 'var(--warm-300)',
          400: 'var(--warm-400)',
          500: 'var(--warm-500)',
          600: 'var(--warm-600)',
          700: 'var(--warm-700)',
          800: 'var(--warm-800)',
          900: 'var(--warm-900)',
        },
        crimson: {
          DEFAULT: 'var(--crimson)',
          hover: 'var(--crimson-hover)',
        },
        card: 'var(--card)',
      },
    },
  },
  plugins: [],
}
