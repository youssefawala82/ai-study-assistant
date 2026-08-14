/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#EEF1F4",
          100: "#DCE2E8",
          300: "#8C9AAA",
          500: "#54677B",
          600: "#3D4E60",
          700: "#2B3A49",
          900: "#16212C",
        },
        paper: {
          50: "#FBFAF7",
          100: "#F5F3EC",
          200: "#EBE7DA",
          300: "#DBD5C1",
        },
        accent: {
          DEFAULT: "#1F8F6B",
          50: "#E7F5EF",
          100: "#CDEBDE",
          600: "#1B7D5E",
          700: "#166750",
        },
        marker: {
          DEFAULT: "#E2A33D",
          100: "#FBEBCE",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "0.625rem",
      },
    },
  },
  plugins: [],
};
