import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#101216",
        panel: "#181b22",
        panel2: "#222631",
        ink: "#f5f7fb",
        muted: "#9aa3b2",
        line: "#2f3542",
        brand: "#35d0a5",
        accent: "#f5b84b",
        danger: "#ff6b86"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(0, 0, 0, 0.28)",
        "glow-brand": "0 0 20px rgba(53,208,165,0.15), 0 8px 32px rgba(0,0,0,0.3)",
        "glow-sm": "0 0 12px rgba(53,208,165,0.1)",
        bubble: "0 2px 12px rgba(0,0,0,0.2), 0 0 1px rgba(255,255,255,0.05)",
        float: "0 8px 24px rgba(0,0,0,0.35)"
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #35d0a5 0%, #2bb89a 100%)",
        "gradient-subtle": "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "dot-pulse": {
          "0%, 80%, 100%": { opacity: "0.4", transform: "scale(0.8)" },
          "40%": { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
        "dot-pulse": "dot-pulse 1.2s ease-in-out infinite"
      },
      minHeight: {
        dvh: "100dvh"
      }
    }
  },
  plugins: []
};

export default config;
