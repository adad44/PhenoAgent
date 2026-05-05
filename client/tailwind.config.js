/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        line: "var(--border)",
        lineAccent: "var(--border-accent)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        good: "var(--accent-green)",
        info: "var(--accent-blue)",
        caution: "var(--accent-amber)",
        alert: "var(--accent-red)",
        ai: "var(--accent-purple)"
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"]
      },
      animation: {
        "enter-up": "enterUp 420ms ease both",
        "slide-in-right": "slideInRight 220ms ease-out both"
      },
      keyframes: {
        enterUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        }
      }
    }
  },
  plugins: []
};
