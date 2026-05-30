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
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4", filter: "blur(20px)" },
          "50%": { opacity: "0.8", filter: "blur(30px)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" }
        },
        starsDrift: {
          "0%": { transform: "translateY(0) rotate(0deg)" },
          "100%": { transform: "translateY(-100%) rotate(360deg)" }
        },
        verseReveal: {
          "0%": { opacity: "0", transform: "translateY(30px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        particleRise: {
          "0%": { opacity: "0", transform: "translateY(100px)" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(-100px)" }
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(60px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(60px) rotate(-360deg)" }
        }
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        shimmer: "shimmer 6s ease infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "stars-drift": "starsDrift 120s linear infinite",
        "verse-reveal": "verseReveal 1.5s ease-out forwards",
        "particle-rise": "particleRise 4s ease-out infinite",
        orbit: "orbit 20s linear infinite"
      },
      colors: {
        vanta: "#0a0a0f",
        "deep-navy": "#0d1117",
        "space-blue": "#161b22",
        "cosmic-purple": "#1a1040",
        "nebula-blue": "#0d2137",
        "gold-primary": "#d4a853",
        "gold-light": "#f0d68a",
        "gold-dark": "#a07c2e",
        "gold-glow": "#ffeed4",
        "quran-green": "#1a6b3c",
        "verse-green": "#2dd4a8",
        "emerald-divine": "#10b981",
        "border-subtle": "#21262d",
        "border-gold": "rgba(212, 168, 83, 0.3)"
      },
      fontFamily: {
        amiri: ["Amiri", "serif"],
        cairo: ["Cairo", "sans-serif"],
        tajawal: ["Tajawal", "sans-serif"],
        quran: ["Amiri Quran", "Amiri", "serif"]
      },
      fontSize: {
        "verse-xl": ["2.5rem", { lineHeight: "3.5rem", letterSpacing: "0.02em" }],
        "verse-2xl": ["3rem", { lineHeight: "4.2rem", letterSpacing: "0.02em" }],
        "verse-3xl": ["3.75rem", { lineHeight: "5.25rem", letterSpacing: "0.02em" }]
      }
    }
  },
  plugins: []
} satisfies Config;
