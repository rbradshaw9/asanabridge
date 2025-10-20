/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AsanaBridge Brand Colors
        'bridge-blue': '#2563EB',
        'sync-purple': '#8B5CF6',
        'success-green': '#10B981',
        'accent-coral': '#F97316',
        'status-yellow': '#F59E0B',
        'error-red': '#EF4444',
      },
    },
  },
  plugins: [],
}