import type { Config } from "tailwindcss";

/**
 * BitVault design system.
 *
 * Every theme-aware color is a CSS variable (defined in src/index.css as
 * light values in :root and dark overrides in :root.dark — see darkMode
 * below), referenced here as `rgb(var(--c-x) / <alpha-value>)` so Tailwind's
 * opacity modifiers (bg-primary/50, etc.) keep working. A few tokens are
 * DELIBERATELY plain hex, not variables:
 *   - inverse-surface / inverse-on-surface / inverse-primary: permanently
 *     dark chrome (the Admin Panel sidebar, the login screen's brand panel)
 *     that should stay dark regardless of the light/dark toggle.
 *   - the *-fixed / on-*-fixed(-variant) tokens: Material's "fixed" colors
 *     are specified to stay constant across themes by design.
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
        background: "rgb(var(--c-background) / <alpha-value>)",
        surface: "rgb(var(--c-background) / <alpha-value>)",
        "surface-dim": "rgb(var(--c-surface-dim) / <alpha-value>)",
        "surface-bright": "rgb(var(--c-surface-bright) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--c-surface-container-lowest) / <alpha-value>)",
        "surface-container-low": "rgb(var(--c-surface-container-low) / <alpha-value>)",
        "surface-container": "rgb(var(--c-surface-container) / <alpha-value>)",
        "surface-container-high": "rgb(var(--c-surface-container-high) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--c-surface-container-highest) / <alpha-value>)",
        "surface-variant": "rgb(var(--c-surface-variant) / <alpha-value>)",
        // Permanently dark — NOT theme-aware. See file docstring.
        "inverse-surface": "#101112",
        "inverse-on-surface": "#f2f2f2",

        // Text / on-colors
        "on-background": "rgb(var(--c-on-background) / <alpha-value>)",
        "on-surface": "rgb(var(--c-on-background) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--c-on-surface-variant) / <alpha-value>)",

        // Lines
        outline: "rgb(var(--c-outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--c-outline-variant) / <alpha-value>)",

        // Primary — Bitnob's teal-green. "primary" is the bright mint used for
        // links/accents/focus; "primary-container" is the deeper teal used for
        // solid CTA buttons.
        primary: "rgb(var(--c-primary) / <alpha-value>)",
        "on-primary": "rgb(var(--c-on-primary) / <alpha-value>)",
        "primary-container": "rgb(var(--c-primary-container) / <alpha-value>)",
        "on-primary-container": "rgb(var(--c-on-primary-container) / <alpha-value>)",
        "inverse-primary": "#7bedd4",
        "surface-tint": "#1dd3b0",

        // Secondary — neutral, no competing hue with the teal brand.
        secondary: "rgb(var(--c-secondary) / <alpha-value>)",
        "on-secondary": "rgb(var(--c-on-secondary) / <alpha-value>)",
        "secondary-container": "rgb(var(--c-secondary-container) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--c-on-secondary-container) / <alpha-value>)",

        // Tertiary — warm neutral fallback; no third brand hue to draw from.
        tertiary: "rgb(var(--c-tertiary) / <alpha-value>)",
        "on-tertiary": "rgb(var(--c-on-tertiary) / <alpha-value>)",
        "tertiary-container": "rgb(var(--c-tertiary-container) / <alpha-value>)",
        "on-tertiary-container": "rgb(var(--c-on-tertiary-container) / <alpha-value>)",

        // Error / destructive
        error: "rgb(var(--c-error) / <alpha-value>)",
        "on-error": "rgb(var(--c-on-error) / <alpha-value>)",
        "error-container": "rgb(var(--c-error-container) / <alpha-value>)",
        "on-error-container": "rgb(var(--c-on-error-container) / <alpha-value>)",

        // Status semantics (badges) — success reuses the brand teal family.
        "status-success-bg": "rgb(var(--c-status-success-bg) / <alpha-value>)",
        "status-success-fg": "rgb(var(--c-status-success-fg) / <alpha-value>)",
        "status-warning-bg": "rgb(var(--c-status-warning-bg) / <alpha-value>)",
        "status-warning-fg": "rgb(var(--c-status-warning-fg) / <alpha-value>)",
        "status-danger-bg": "rgb(var(--c-status-danger-bg) / <alpha-value>)",
        "status-danger-fg": "rgb(var(--c-status-danger-fg) / <alpha-value>)",

        // Fixed accents — constant across themes by design (Material "fixed").
        "primary-fixed": "#c8fbef",
        "primary-fixed-dim": "#7bedd4",
        "on-primary-fixed": "#04231c",
        "on-primary-fixed-variant": "#0b5345",
        "secondary-fixed": "#e4e4e7",
        "secondary-fixed-dim": "#c9c9cd",
        "on-secondary-fixed": "#1c1c1f",
        "on-secondary-fixed-variant": "#3f3f46",
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
        DEFAULT: "rgba(11, 83, 69, 0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
