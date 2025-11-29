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
        "dark-green": {
          50: "#f0f9f4",
          100: "#dcf2e3",
          200: "#bce4ca",
          300: "#8fcea8",
          400: "#5bb17f",
          500: "#38915f",
          600: "#2a744b",
          700: "#235c3d",
          800: "#1f4a34",
          900: "#1a3d2c",
          950: "#0d2217",
        },
      },
    },
  },
  plugins: [],
};
export default config;

