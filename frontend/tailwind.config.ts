import type { Config } from "tailwindcss";

/**
 * BitVault design system.
 *
 * Tokens extracted from the InvenTrack/indigo mockups (the set the rendered
 * screens actually use). The Kinetic (blue/Geist) system was NOT used — see
 * DESIGN-NOTES.md for why. Where the DESIGN.md *prose* contradicted the token
 * values (e.g. background hex, "no input icons"), the token values win.
 *
 * This is the ONLY place raw hex / px values should live. Components consume
 * these via semantic Tailwind classes (bg-surface, text-on-surface, p-md…).
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Surfaces (tri-tier: canvas / cards / dark frame)
        background: "#fcf8ff",
        surface: "#fcf8ff",
        "surface-dim": "#dcd8e5",
        "surface-bright": "#fcf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f2ff",
        "surface-container": "#f0ecf9",
        "surface-container-high": "#eae6f4",
        "surface-container-highest": "#e4e1ee",
        "surface-variant": "#e4e1ee",
        "inverse-surface": "#302f39",
        "inverse-on-surface": "#f3effc",

        // Text / on-colors
        "on-background": "#1b1b24",
        "on-surface": "#1b1b24",
        "on-surface-variant": "#464555",

        // Lines
        outline: "#777587",
        "outline-variant": "#c7c4d8",

        // Primary (indigo) — actions, active states, focus
        primary: "#3525cd",
        "on-primary": "#ffffff",
        "primary-container": "#4f46e5",
        "on-primary-container": "#dad7ff",
        "inverse-primary": "#c3c0ff",
        "surface-tint": "#4d44e3",

        // Secondary
        secondary: "#585e70",
        "on-secondary": "#ffffff",
        "secondary-container": "#dde2f8",
        "on-secondary-container": "#5e6476",

        // Tertiary
        tertiary: "#7e3000",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#a44100",
        "on-tertiary-container": "#ffd2be",

        // Error / destructive
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        // Status semantics (badges). Kept as named tokens rather than raw
        // Tailwind green-100/red-100 so status colors are centrally tunable.
        "status-success-bg": "#dcfce7",
        "status-success-fg": "#15803d",
        "status-warning-bg": "#fef3c7",
        "status-warning-fg": "#b45309",
        "status-danger-bg": "#fee2e2",
        "status-danger-fg": "#b91c1c",

        // Fixed accents (from the source palette; kept for completeness)
        "primary-fixed": "#e2dfff",
        "primary-fixed-dim": "#c3c0ff",
        "on-primary-fixed": "#0f0069",
        "on-primary-fixed-variant": "#3323cc",
        "secondary-fixed": "#dde2f8",
        "secondary-fixed-dim": "#c1c6db",
        "on-secondary-fixed": "#151b2b",
        "on-secondary-fixed-variant": "#414658",
      },
      spacing: {
        // 8px base rhythm with a 4px half-step
        base: "4px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        gutter: "20px",
        margin: "24px",
      },
      borderRadius: {
        DEFAULT: "0.5rem", // universal 8px component radius
        sm: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      fontFamily: {
        sans: ["Inter", "SF Pro", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["28px", { lineHeight: "34px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["24px", { lineHeight: "30px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      boxShadow: {
        // Depth via low-contrast layering, not heavy shadows (per design system)
        interactive: "0px 4px 6px rgba(0,0,0,0.05)",
        overlay: "0px 10px 15px rgba(0,0,0,0.1)",
      },
      ringColor: {
        DEFAULT: "rgba(79, 70, 229, 0.2)",
      },
    },
  },
  plugins: [],
} satisfies Config;
