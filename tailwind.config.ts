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
        soft: "0 16px 40px rgba(0, 0, 0, 0.28)"
      },
      minHeight: {
        dvh: "100dvh"
      }
    }
  },
  plugins: []
};

export default config;
