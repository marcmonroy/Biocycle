/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#0A0A1A',
        'bio-purple': '#7B61FF',
        'trading-gold': '#F5C842',
        'vital-coral': '#FF6B6B',
        'growth-green': '#00D4A1',
        'soft-slate': '#8B95B0',
        'card-surface': '#111126',
        'card-border': '#1E1E3A',
      },
      fontFamily: {
        display: ['Clash Display', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
