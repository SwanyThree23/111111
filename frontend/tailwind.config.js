/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: {
          DEFAULT: '#800020',
          dark: '#7B1A34',
          light: '#9B2335',
        },
        gold: {
          DEFAULT: '#C9AF37',
          dark: '#C9971C',
          light: '#D4C04A',
        },
        obsidian: {
          DEFAULT: '#0A0A0F',
          50: '#12121C',
          100: '#1A1A28',
          200: '#22223A',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        brand: ['Syne', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'noir': 'linear-gradient(135deg, #0A0A0F 0%, #12121C 50%, #0A0A0F 100%)',
        'burgundy-gradient': 'linear-gradient(135deg, #800020 0%, #7B1A34 100%)',
        'gold-gradient': 'linear-gradient(135deg, #C9AF37 0%, #C9971C 100%)',
        'panel': 'linear-gradient(180deg, #12121C 0%, #0A0A0F 100%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201, 175, 55, 0.15)',
        'burgundy': '0 0 20px rgba(128, 0, 32, 0.3)',
        'panel': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'pulse-gold': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
