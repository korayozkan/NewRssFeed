/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 — tüm src klasörü taranır
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Web projesiyle aynı renk paleti
        accent:  '#5b9cf6',
        star:    '#f5a623',
        card:    '#111111',
        'card-border': '#1a1a1a',
        muted:   '#555555',
        surface: '#0a0a0a',
      },
    },
  },
  plugins: [],
};
