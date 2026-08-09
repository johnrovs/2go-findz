/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover-rgb) / <alpha-value>)',
        },
        amazon: { DEFAULT: '#FF9900', hover: '#E68A00' },
        navy: {
          950: '#020d18',
          900: '#071426',
          800: '#0b1c33',
        },
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
      borderRadius: {
        btn: '12px',
        card: '18px',
        image: '18px',
        search: '16px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 30px rgba(0,0,0,0.10)',
        navbar: '0 1px 6px rgba(0,0,0,0.05)',
        dropdown: '0 20px 50px rgba(0,0,0,0.08)',
      },
      maxWidth: {
        content: '1280px',
        reading: '720px',
      },
    },
  },
  plugins: [],
};
