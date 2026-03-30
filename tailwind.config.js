/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  theme: {
    extend: {
      colors: {
        arena: {
          primary: '#1d4ed8',
          accent: '#fbbf24',
          success: '#22c55e',
          danger: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
