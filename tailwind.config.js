/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'rogaa-green':  '#43B02A',
        'rogaa-navy':   '#162341',
        'rogaa-blue':   '#4A60D8',
        'rogaa-orange': '#F4511E',
        'rogaa-cyan':   '#0EA5E9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
