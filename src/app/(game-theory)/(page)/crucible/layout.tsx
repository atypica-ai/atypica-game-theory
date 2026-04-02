import "@/app/(game-theory)/gt-crucible-theme.css";
import { Oswald, Space_Mono } from "next/font/google";
import type { ReactNode } from "react";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--cr-font-oswald",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--cr-font-space",
  display: "swap",
});

export default function CrucibleLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${oswald.variable} ${spaceMono.variable}`}
      style={{
        fontFamily: "var(--cr-font-mono)",
        background: "var(--cr-bg)",
        minHeight: "100vh",
        color: "var(--cr-white)",
      }}
    >
      {children}
    </div>
  );
}
