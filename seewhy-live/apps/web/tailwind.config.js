/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        volt: 'var(--volt)',
        gold: 'var(--gold)',
        'live-red': 'var(--red)',
        teal: 'var(--teal)',
        'ai-purple': 'var(--purple)',
        'vst-orange': 'var(--orange)',
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
