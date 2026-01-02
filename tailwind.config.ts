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
        "custom-bg": "#202219",
        "custom-text": "#f7eddd",
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
          DEFAULT: "#00ff88",
          light: "#33ffaa",
          dark: "#00cc6f",
        },
      },
    },
  },
  plugins: [],
};
export default config;

