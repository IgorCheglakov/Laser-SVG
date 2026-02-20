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
        dark: {
          bg: '#1e1e1e',
          bgSecondary: '#252526',
          bgTertiary: '#2d2d30',
          text: '#cccccc',
          textMuted: '#858585',
          border: '#3e3e42',
          accent: '#007acc',
          accentHover: '#0098ff',
          warning: '#ff9800',
        },
        canvas: {
          bg: '#121212',
          artboard: '#ffffff',
          grid: '#2d2d30',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
