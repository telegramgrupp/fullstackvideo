/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#00FF87',
          50: '#E6FFF2',
          100: '#CCFFE6',
          200: '#99FFCC',
          300: '#66FFB3',
          400: '#33FF99',
          500: '#00FF87',
          600: '#00CC6A',
          700: '#00994F',
          800: '#006634',
          900: '#003319',
        },
        secondary: {
          DEFAULT: '#7F00FF',
          50: '#F2E6FF',
          100: '#E6CCFF',
          200: '#CC99FF',
          300: '#B366FF',
          400: '#9933FF',
          500: '#7F00FF',
          600: '#6600CC',
          700: '#4C0099',
          800: '#330066',
          900: '#190033',
        },
        dark: {
          100: '#2C5364',
          200: '#203A43',
          300: '#0F2027',
          400: '#0d131e',
          500: '#0a0f17',
        },
      },
      spacing: {
        'safe-top': 'var(--sat)',
        'safe-bottom': 'var(--sab)',
        'safe-left': 'var(--sal)',
        'safe-right': 'var(--sar)',
      },
      height: {
        screen: ['100vh', '100dvh'],
      },
      minHeight: {
        screen: ['100vh', '100dvh'],
      },
    },
  },
  plugins: [],
};