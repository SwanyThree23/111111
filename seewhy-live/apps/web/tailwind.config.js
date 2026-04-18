/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        volt: '#C8FF00',
        gold: '#D4AF37',
        'live-red': '#FF3B3B',
        teal: '#00E5CC',
        'ai-purple': '#A855F7',
        'vst-orange': '#FF7A1A',
      },
      fontFamily: {
        display: ['var(--font-bebas)'],
        mono: ['var(--font-mono)'],
        ui: ['var(--font-syne)'],
        prose: ['var(--font-inter)'],
        accent: ['var(--font-lora)'],
      },
    },
  },
  plugins: [],
};
