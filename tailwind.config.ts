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
        // Midnight Monochromatic & Ambient Glass Design System
        "custom-bg": "#0A0A0A", // Near pitch-black app background
        "custom-text": "#FFFFFF", // Pure white primary text
        surface: "#121212", // Card/surface background
        "border-default": "rgba(255, 255, 255, 0.05)", // Hyper-subtle borders
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
        float: "float 4s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.8s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
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

