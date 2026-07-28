/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#2563EB', hover: '#1D4ED8' },
        amazon: { DEFAULT: '#FF9900', hover: '#E68A00' },
        surface: { DEFAULT: '#FFFFFF', secondary: '#F8FAFC' },
        border: '#E5E7EB',
        heading: '#111827',
        body: '#4B5563',
        'text-secondary': '#6B7280',
        muted: '#9CA3AF',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#0EA5E9',
        star: '#FACC15',
      },
    },
  },
  plugins: [],
};
