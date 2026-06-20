import type { Config } from "tailwindcss";

export default {
    darkMode: 'class',
    content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ["Nunito", "sans-serif"],
      mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
    },
    extend: {
      colors: {
        background: "#0d1117",
        primary: "#e6edf3",
        accent: "#e6edf3",
        muted: "#21262d",
        subtle: "#161b22",
        panel: "#161b22",
        border: "#30363d",
        text: "#e6edf3",
        "text-muted": "#8b949e",
        success: "#3fb950",
        danger: "#f85149",
        warning: "#d29922",
      },
      cursor: {
        fancy: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Ccircle cx='12' cy='12' r='10' stroke='%23e6edf3' stroke-width='1.5' fill='rgba(230,237,243,0.08)'/%3E%3C/svg%3E") 12 12, auto`,
      },
    },
  },
  plugins: [],
} satisfies Config;
