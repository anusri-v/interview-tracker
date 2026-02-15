/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#111827",
        sidebar: "#0F172A",
        surface: "#0F172A",
        card: "#1F2937",
        border: "#374151",
        foreground: "#F9FAFB",
        "foreground-secondary": "#9CA3AF",
        "foreground-muted": "#6B7280",
        primary: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#06B6D4",
      },
    },
  },
  plugins: [],
};
