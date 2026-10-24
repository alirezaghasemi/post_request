/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        foreground: 'var(--color-fg)',
        surface: 'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',
        border: 'var(--color-border)',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          active: '#1d4ed8'
        },
        method: {
          get: '#10b981',
          post: '#f59e0b',
          put: '#3b82f6',
          patch: '#8b5cf6',
          delete: '#ef4444',
          options: '#6b7280',
          head: '#06b6d4'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
