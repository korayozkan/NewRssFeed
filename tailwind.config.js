module.exports = {
  darkMode: 'class',
  content: ['./index.html', './js/**/*.js', './app.js'],
  theme: {
    extend: {
      colors: {
        accent: '#5b9cf6',
        'accent-hover': '#7ab4f5',
        star: '#e8b840',
        green: '#3ecf8e',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
}
