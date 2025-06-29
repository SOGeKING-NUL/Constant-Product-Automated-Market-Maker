import type { Config } from "tailwindcss"

const config: Config = {
  // Shadcn UI typically uses "dark" mode via a class.
  darkMode: ["class"], 
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Your custom color palette remains here
        primary: {
          DEFAULT: "#a5f10d",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#a5f10d",
          foreground: "#000000",
        },
        destructive: {
          DEFAULT: "#a5f10d",
          foreground: "#000000",
        },
        muted: {
          DEFAULT: "rgba(255, 255, 255, 0.1)",
          foreground: "rgba(255, 255, 255, 0.7)",
        },
        accent: {
          DEFAULT: "rgba(255, 255, 255, 0.1)",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "#a5f10d",
          foreground: "#000000",
        },
        card: {
          DEFAULT: "#a5f10d",
          foreground: "#000000",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backdropBlur: {
        xs: "2px",
      },
      letterSpacing: {
        tighter: "-0.05em",
        tight: "-0.025em",
        wide: "0.025em",
        wider: "0.05em",
        widest: "0.1em",
      },
      // All your custom keyframes and animations
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          'from': { 'box-shadow': '0 0 20px rgba(165, 241, 13, 0.2)' },
          'to': { 'box-shadow': '0 0 30px rgba(165, 241, 13, 0.4)' },
        },
        // Standard shadcn/ui keyframes
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        // Standard shadcn/ui animations
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Your custom animations
        'pulse-slow': 'pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slower': 'pulse 7s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-reverse': 'float 6s ease-in-out infinite reverse',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
    },
  },
  // The tailwindcss-animate plugin is all that's needed here.
  plugins: [require("tailwindcss-animate")],
}

export default config
