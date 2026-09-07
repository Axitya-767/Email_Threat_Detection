/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        canvas: "#1b1e24",
        surface: "#262b33",
        edge: "#3d444e",
        ink: "#e8eaed",
        dim: "#8f96a1",
        accent: "#3b6998", // deep slate-blue for premium forensic tone
        risk: {
          red: "#b91c1c",   // deep red-700 (critical severity)
          amber: "#d97706", // medium severity
          green: "#16a34a", // clean severity
        },
      },
    },
  },
  plugins: [],
};
