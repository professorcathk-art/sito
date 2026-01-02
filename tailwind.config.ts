import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "custom-bg": "#0a0a0a",
        "custom-text": "#ffffff",
        "dark-green": {
          50: "#0a1a12",
          100: "#0d2217",
          200: "#0f2a1c",
          300: "#123221",
          400: "#153a26",
          500: "#18422b",
          600: "#1b4a30",
          700: "#1e5235",
          800: "#215a3a",
          900: "#0a0f0c",
          950: "#050807",
        },
        "cyber-green": {
          DEFAULT: "#00D4AA", // Netflix-style green
          light: "#00FFC8",
          dark: "#00A862", // MasterClass-style green
          "50": "#E6F7F2",
          "100": "#CCEFE5",
          "200": "#99DFCB",
          "300": "#66CFB1",
          "400": "#33BF97",
          "500": "#00D4AA",
          "600": "#00A862",
          "700": "#007D49",
          "800": "#005231",
          "900": "#002718",
        },
      },
    },
  },
  plugins: [],
};
export default config;

