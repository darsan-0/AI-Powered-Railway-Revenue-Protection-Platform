/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          dark: '#030712', // Darkest background
          navy: '#0a0f1d', // Primary dark blue
          card: '#111827', // Card background
          border: '#1f2937', // Border color
          indigo: '#4f46e5', // Bright indigo
          teal: '#14b8a6', // Teal accent
          emerald: '#10b981', // Safe/approved green
          rose: '#f43f5e', // Denied red
          saffron: '#f97316', // Indian Railways orange
          blue: '#3b82f6', // General blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
