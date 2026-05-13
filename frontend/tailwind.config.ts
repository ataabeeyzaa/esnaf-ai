import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8ec",
          100: "#feefcf",
          200: "#fcdc9d",
          300: "#fac461",
          400: "#f8aa34",
          500: "#f29023",
          600: "#d77316",
          700: "#b25813",
          800: "#8e4516",
          900: "#733915",
        },
        whatsapp: {
          // Light theme — easier on the eyes for jury presentation
          bg: "#efeae2",
          panel: "#f6f6f4",
          panel2: "#f0f2f5",
          panel3: "#e9edef",
          accent: "#25d366",
          accent2: "#128c7e",
          message: "#ffffff",
          out: "#d9fdd3",
          text: "#111b21",
          textSoft: "#3b4a54",
          muted: "#667781",
          border: "#d1d7db",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        bubble: "0 1px 0.5px rgba(11,20,26,.13)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulseSlow 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
