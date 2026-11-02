import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#090D16",
          900: "#0F172A",
          850: "#141E34",
          800: "#1E293B",
          700: "#334155",
        },
        canvas: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
        },
        teal: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
        },
        coral: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
        popover: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
