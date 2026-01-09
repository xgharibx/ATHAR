import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Noto Naskh Arabic",
          "Noto Sans Arabic",
          "Tahoma",
          "Arial",
          "sans-serif"
        ]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,215,128,.18), 0 8px 34px rgba(0,0,0,.45), 0 0 60px rgba(255,215,128,.08)"
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" }
        }
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        shimmer: "shimmer 6s ease infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
