import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:      { DEFAULT: "#FFFFFF", card: "#FFFFFF", elevated: "#F5F5F7" },
        surface: { DEFAULT: "#F5F5F7", light: "#E8E8ED" },
        border:  { DEFAULT: "#D2D2D7", light: "#E8E8ED" },
        text:    { DEFAULT: "#1D1D1F", secondary: "#6E6E73", muted: "#86868B" },
        accent:  { DEFAULT: "#0071E3", light: "#147CE5", dark: "#0058B0" },
        gold:    { DEFAULT: "#BF5AF2", light: "#DA8FFF" },
        danger:  { DEFAULT: "#FF3B30" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "SF Pro Display", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-inter)", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["SF Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "28px",
      },
      animation: {
        "shimmer": "shimmer 2.5s linear infinite",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
