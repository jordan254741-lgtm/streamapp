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
          50: '#FCF6F5',
          100: '#F5EDEA',
          200: '#EDE6E4',
          300: '#E0D5D3',
          400: '#C4B5B3',
          500: '#9B8B89',
          600: '#7A6868',
          700: '#5E4E4E',
          800: '#3D3333',
          900: '#241E1E',
        },
        crimson: {
          DEFAULT: '#990011',
          hover: '#7A000E',
        },
      },
    },
  },
  plugins: [],
}
