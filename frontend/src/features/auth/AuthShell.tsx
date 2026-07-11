import type { ReactNode } from "react";
import { APP_NAME } from "@/config";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";

const HIGHLIGHTS: Array<{ icon: string; title: string; body: string }> = [
  { icon: "bolt", title: "Real-time tracking", body: "Stock levels and status update the moment they change." },
  { icon: "shield_person", title: "Role-based access", body: "Staff browse; admins manage. Enforced end to end." },
  { icon: "auto_awesome", title: "Ask-AI search", body: "Find anything in natural language, not just keywords." },
];

/**
 * Split-panel auth shell — an exact 50/50 layout. Left: brand infrastructure
 * with a subtle dot grid + accent glow and product highlights. Right: the form.
 * Shared by Login and Register so the two screens are visually identical.
 */
export function AuthShell({
  heading,
  subheading,
  children,
  footer,
}: {
  heading: string;
  subheading: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-inverse-surface p-xl text-white md:flex">
        {/* Ambient accent glow */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }}
          aria-hidden
        />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />

        <div className="relative z-10 flex items-center gap-sm">
          <Logo size={40} />
          <span className="text-label-caps uppercase tracking-widest text-white/80">{APP_NAME}</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
            Track every item.
            <br />
            <span className="bg-gradient-to-r from-inverse-primary to-white bg-clip-text text-transparent">
              Every time.
            </span>
          </h1>
          <p className="mt-md text-body-md text-white/60">
            Bitnob&apos;s internal platform for inventory control and real-time asset tracking.
          </p>

          <ul className="mt-xl space-y-md">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex items-start gap-md">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-inverse-primary ring-1 ring-white/10">
                  <Icon name={h.icon} className="text-[20px]" />
                </span>
                <span>
                  <span className="block text-body-md font-semibold text-white">{h.title}</span>
                  <span className="block text-body-sm text-white/50">{h.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-label-caps uppercase tracking-widest text-white/40">
          Enterprise-grade · Secured
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col justify-between bg-surface-container-lowest p-lg md:w-1/2 md:p-xl">
        <div className="flex flex-grow items-center justify-center">
          <div className="w-full max-w-[380px]">
            {/* Mark for mobile (brand panel hidden below md) */}
            <div className="mb-lg flex items-center gap-sm md:hidden">
              <Logo size={32} />
              <span className="text-label-caps uppercase tracking-widest text-primary">
                {APP_NAME}
              </span>
            </div>

            <div className="mb-lg">
              <h2 className="text-display-lg text-on-surface">{heading}</h2>
              <p className="mt-xs text-body-sm text-on-surface-variant">{subheading}</p>
            </div>
            {children}
            {footer && <div className="mt-lg">{footer}</div>}
          </div>
        </div>
        <p className="mt-lg text-label-caps text-on-surface-variant opacity-70">
          v0.1 · Internal use only
        </p>
      </div>
    </div>
  );
}
