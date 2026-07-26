/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#946B29',
          dark: '#74531F',
          soft: '#C79A4E',
          tint: '#F3E9D6',
        },
        cream: '#FAF6EE',
        'cream-soft': '#E8DDC8',
        ink: '#2F2A22',
        'ink-soft': '#6B6457',
        line: '#E5DDD0',
        terracotta: '#D9663F',
        'terracotta-soft': '#F7D9D2',
        sage: '#756A58',
      },
      fontFamily: {
        heading: ['Fredoka', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
        fredoka: ['Fredoka', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
