/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
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
        canvas: "#0B0E14",
        surface: "#12151C",
        edge: "#222733",
        ink: "#E4E6EB",
        dim: "#8B909C",
        accent: "#6ea3d8",
        risk: {
          red: "#DC2F3D",
          amber: "#D4A237",
          green: "#16a34a",
        },
        // Basic light palette for presentation & report generation
        light: {
          canvas: "#F8FAFC",
          surface: "#FFFFFF",
          edge: "#E2E8F0",
          ink: "#0F172A",
          dim: "#64748B",
          accent: "#2563EB",
          risk: {
            red: "#DC2F3D",
            amber: "#D4A237",
            green: "#16a34a",
          },
        },
      },
    },
  },
  plugins: [],
};
