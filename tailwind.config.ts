import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        "store-inter": ["var(--font-inter)", "sans-serif"],
        "store-roboto": ["var(--font-roboto)", "sans-serif"],
        "store-playfair": ["var(--font-playfair)", "serif"],
        "store-space-grotesk": ["var(--font-space-grotesk)", "sans-serif"],
        "store-dm-sans": ["var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Dark Slate & Indigo Theme
        "custom-bg": "#020617", // slate-950
        "custom-text": "#f8fafc", // slate-50
        surface: "#0f172a", // slate-900
        "surface-secondary": "#1e293b", // slate-800
        "border-default": "#334155",
        // Legacy mappings for backward compatibility
        "text-primary": "#FFFFFF", // Pure white
        "text-secondary": "#6B7280", // Gray-500 for secondary text
        primary: {
          DEFAULT: "#FFFFFF", // White for primary buttons
          hover: "#E5E7EB", // Gray-200 for hover
        },
        // Legacy support - map to midnight system
        "dark-green": {
          DEFAULT: "#121212",
          50: "#121212",
          100: "#121212",
          200: "#121212",
          300: "#121212",
          400: "#121212",
          500: "#121212",
          600: "#121212",
          700: "#121212",
          800: "#121212",
          900: "#0A0A0A",
          950: "#0A0A0A",
        },
        "cyber-green": {
          DEFAULT: "#FFFFFF", // Map to white
          light: "#E5E7EB", // Map to gray-200
          dark: "#FFFFFF",
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "bounce-slow": "bounce 3s ease-in-out infinite",
        blob: "blob 7s ease-in-out infinite",
      },
      keyframes: {
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(20px, -50px) scale(1.1)" },
          "50%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "75%": { transform: "translate(50px, 50px) scale(1.05)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-15px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-15px)" },
        },
        fadeInUp: {
          from: {
            opacity: "0",
            transform: "translateY(30px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

