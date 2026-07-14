/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2A4A',      // deep civic navy - headings, primary text
        panel: '#FFFFFF',
        canvas: '#F4F6F9',    // page background - cool light gray
        slate: '#5B6B85',     
        line: '#E2E6ED',      
        gold: '#B8912F',      
        good: '#2F7A4F',
        warn: '#B8912F',
        bad: '#c84b32',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      borderRadius: { sm: '4px', md: '6px', lg: '10px' },
    },
  },
  plugins: [],
}
