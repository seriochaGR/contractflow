import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#0B1220",
        panelSoft: "#111C31",
        accent: "#22D3EE",
        accent2: "#34D399"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.25), 0 20px 45px -28px rgba(34,211,238,0.7)"
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "'Segoe UI'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Cascadia Mono'", "'Fira Code'", "monospace"]
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        rise: "rise 360ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
