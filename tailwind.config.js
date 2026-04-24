/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Salvia & crema — wellness / unisex
        primary: {
          50:  '#F4F6F1',
          100: '#E7EDE0',
          200: '#CFDDC0',
          300: '#B8C5A6', // sage claro
          400: '#A3B290',
          500: '#8A9A7B', // sage principal
          600: '#728162',
          700: '#5B674E',
          800: '#454E3B',
          900: '#3A4333',
        },
        secondary: {
          50:  '#FDF6EF',
          100: '#FBECDD',
          200: '#F6D8BC',
          300: '#F0C39A',
          400: '#E8A87C', // terracota principal
          500: '#DF9060',
          600: '#CC7848',
          700: '#A86038',
          800: '#864A2A',
          900: '#65381E',
        },
        accent: {
          50:  '#F5F1E8',
          100: '#EDE6D4',
          200: '#DACCAA',
          300: '#C6B280',
          400: '#B39B5E',
          500: '#9A8348',
          600: '#7C6A38',
          700: '#5E512A',
          800: '#40381C',
          900: '#2A240F',
        },
        // Fondo crema global
        cream: '#F5F1E8',
      },
      fontFamily: {
        sans:  ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      backgroundImage: {
        'gradient-wellness': 'linear-gradient(135deg, #F5F1E8 0%, #E7EDE0 60%, #F4F6F1 100%)',
        'gradient-sage':     'linear-gradient(135deg, #B8C5A6 0%, #8A9A7B 100%)',
        'gradient-terra':    'linear-gradient(135deg, #F0C39A 0%, #E8A87C 100%)',
        'gradient-hero':     'linear-gradient(160deg, #F5F1E8 0%, #E7EDE0 40%, #CFDDC0 100%)',
      },
      boxShadow: {
        'soft':    '0 2px 20px rgba(58, 67, 51, 0.08)',
        'soft-lg': '0 8px 40px rgba(58, 67, 51, 0.12)',
        'warm':    '0 4px 24px rgba(232, 168, 124, 0.20)',
        'glow':    '0 0 0 3px rgba(138, 154, 123, 0.25)',
      },
      animation: {
        'fade-in':  'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
