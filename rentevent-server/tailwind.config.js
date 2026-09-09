/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
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
    },
  },
  plugins: [],
}
