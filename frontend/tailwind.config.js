/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Стандартная темная тема
        'dark-bg': '#0b0f12',
        'dark-card': '#111418',
        'brand-purple': '#417686ff',
        'brand-accent': '#ffb0aaff',
        // Amoled тема
        'amoled-bg': '#000000',
        'amoled-card': '#1C1C1E',
        // Светлая тема
        'light-bg': '#FFFFFF',
        'light-card': '#FFFFFF',
        'light-secondary': '#F4F4F4',
        'light-muted': '#A6A6A6',
        'light-text': '#000000',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      boxShadow: {
        'card-sm': '0 6px 18px rgba(2,6,23,0.6)',
        'card-md': '0 12px 30px rgba(2,6,23,0.7)',
        'glow': '0 6px 30px rgba(0,0,0,0.15)'
      },
      keyframes: {
        float: {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
          '100%': { transform: 'translateY(0px)' }
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        pulseAccent: {
          '0%': { boxShadow: '0 0 0 0 rgba(0,0,0,0)' },
          '70%': { boxShadow: '0 0 0 12px rgba(0,0,0,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0,0,0,0)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        fadeInUp: 'fadeInUp 420ms cubic-bezier(.2,.9,.3,1) both',
        'pulse-accent': 'pulseAccent 1.8s infinite'
      },
      borderRadius: {
        'xl-2': '14px',
      }
    },
  },
  plugins: [],
}
