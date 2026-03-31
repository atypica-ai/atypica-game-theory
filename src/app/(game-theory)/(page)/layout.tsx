import "@/app/(game-theory)/gt-theme.css";
import { Outfit } from "next/font/google";
import type { ReactNode } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--gt-font-outfit",
  display: "swap",
});

export default function GameTheoryLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={outfit.variable}
      style={{
        fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
        background: "var(--gt-bg)",
        minHeight: "100vh",
        color: "var(--gt-t1)",
      }}
    >
      {children}
    </div>
  );
}
