import "@/app/(game-theory)/gt-theme.css";
import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth/next";
import { Outfit } from "next/font/google";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--gt-font-outfit",
  display: "swap",
});

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/account")}`);
  }

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
