/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#1b1e24",
        surface: "#262b33",
        edge: "#3d444e",
        ink: "#e8eaed",
        dim: "#8f96a1",
        accent: "#6ea3d8",
        risk: {
          red: "#dc2626",
          amber: "#d97706",
          green: "#16a34a",
        },
      },
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem",
        "3xl": "4rem",
      },
    },
  },
  plugins: [],
};
