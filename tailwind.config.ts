import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#1a1a1a",
        surface: "#242424",
        panel: "#2b2b2b",
        border: "#3a3a3a",
        accent: "#1f6aa5",
        "accent-hover": "#1a5a8f",
        success: "#1a7a3a",
        danger: "#c0392b",
        "danger-hover": "#a93226",
        text: "#dce4ee",
        muted: "#6b7280",
        cyan: "#22d3ee",
        waveform: "#4a9eff",
        "waveform-r": "#7ec8a0",
      },
    },
  },
  plugins: [],
} satisfies Config;
