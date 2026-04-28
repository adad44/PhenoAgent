/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        clinical: "#0f766e",
        amberRisk: "#b7791f",
        redRisk: "#b91c1c"
      }
    }
  },
  plugins: []
};
