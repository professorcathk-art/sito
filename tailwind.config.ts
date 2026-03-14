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
        // Premium Professional Dark Mode Color Palette
        "custom-bg": "#0B0E14", // Deep sophisticated slate dark (global background)
        "custom-text": "#F3F4F6", // Soft white (primary text)
        surface: "#151923", // Elevated surface/card background
        "border-default": "#232836", // Subtle borders
        primary: {
          DEFAULT: "#3B82F6", // Trustworthy modern blue (Tailwind blue-500)
          hover: "#2563EB", // Slightly darker for hover states (blue-600)
          light: "#60A5FA", // Lighter shade (blue-400)
        },
        // Alternative: Premium soft emerald option
        emerald: {
          DEFAULT: "#10B981", // Premium soft emerald (Tailwind emerald-500)
          hover: "#059669", // Slightly darker for hover (emerald-600)
        },
        // Text colors
        "text-primary": "#F3F4F6", // Soft white (gray-100)
        "text-secondary": "#9CA3AF", // Muted gray for descriptions (gray-400)
        // Legacy support - map old colors to new ones
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
          DEFAULT: "#3B82F6", // Map to new primary blue
          light: "#60A5FA", // Map to primary light
          dark: "#2563EB", // Map to primary hover
          "50": "#EFF6FF",
          "100": "#DBEAFE",
          "200": "#BFDBFE",
          "300": "#93C5FD",
          "400": "#60A5FA",
          "500": "#3B82F6",
          "600": "#2563EB",
          "700": "#1D4ED8",
          "800": "#1E40AF",
          "900": "#1E3A8A",
        },
      },
    },
  },
  plugins: [],
};
export default config;

