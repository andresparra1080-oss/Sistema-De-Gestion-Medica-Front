/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FFD700',
        secondary: '#10B981',
        deep: '#121212',
        panel: '#1E1E1E',
        accent: '#3B82F6',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
};
