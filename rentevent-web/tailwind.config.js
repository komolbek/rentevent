/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand Primary - Orange (#F2562B)
        primary: {
          50: '#fff7f5',
          100: '#ffede8',
          200: '#ffd6cc',
          300: '#ffb8a3',
          400: '#ff8c6b',
          500: '#F2562B',  // Main brand color
          600: '#d94a24',
          700: '#b53d1d',
          800: '#8f3118',
          900: '#6b2512',
          950: '#3d150a',
        },
        // Brand Accent - for secondary actions
        accent: {
          50: '#fff7f5',
          100: '#ffede8',
          200: '#ffd6cc',
          300: '#ffb8a3',
          400: '#ff8c6b',
          500: '#F2562B',  // Same as primary for consistency
          600: '#d94a24',
          700: '#b53d1d',
          800: '#8f3118',
          900: '#6b2512',
          950: '#3d150a',
        },
        // Brand Neutrals
        brand: {
          black: '#171717',
          dark: '#4D4D4D',
          light: '#DEDEDE',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      },
    },
  },
  plugins: [],
}
