import { Embed } from "@/app/(system)/embed/Embed";
import { AuthProvider } from "@/components/AuthProvider";
import Stars from "@/components/Stars";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import Analytics from "@/lib/analytics";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { generatePageMetadata } from "@/lib/request/metadata";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Instrument_Serif } from "next/font/google";
import { getObjectCdnOrigin } from "./(system)/cdn/lib";
import "./globals.css";

// 配置字体
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-InstrumentSerif",
  weight: ["400"],
  fallback: ["serif"],
});

export const viewport: Viewport = {
  themeColor: "black",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pageMetadata = generatePageMetadata({ locale });

  return {
    title: {
      default: pageMetadata.title,
      template: "%s | atypica.AI",
    },
    description: pageMetadata.description,
    keywords:
      locale === "zh-CN"
        ? ["商业研究", "AI智能体", "消费者洞察", "市场分析", "决策支持"]
        : [
            "business research",
            "AI agents",
            "consumer insights",
            "market analysis",
            "decision support",
          ],
    authors: [{ name: "BMRLab" }],
    category: "technology",
    openGraph: pageMetadata.openGraph,
    twitter: pageMetadata.twitter,
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [
        { url: "/_public/hippyghost-square-dark.jpg", sizes: "32x32", type: "image/jpeg" },
        { url: "/_public/hippyghost-square-dark.jpg", sizes: "16x16", type: "image/jpeg" },
      ],
      shortcut: "/_public/hippyghost-square-dark.jpg",
      apple: [
        { url: "/_public/hippyghost-square-dark.jpg", sizes: "180x180", type: "image/jpeg" },
        { url: "/_public/hippyghost-square-dark.jpg", sizes: "152x152", type: "image/jpeg" },
        { url: "/_public/hippyghost-square-dark.jpg", sizes: "144x144", type: "image/jpeg" },
      ],
    },
    manifest: "/manifest.json",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      data-deploy-region={getDeployRegion()}
      data-object-cdn-origin={getObjectCdnOrigin()}
      suppressHydrationWarning
    >
      <body
        className={cn(
          "font-sans antialiased",
          instrumentSerif.variable,
          // "font-IBMPlexMono antialiased",
          // "h-dvh flex flex-col items-stretch justify-start",
        )}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Stars />
            <NextIntlClientProvider>
              {/* <GlobalHeader /> */}
              {children}
              <Toaster richColors={true} />
              <Embed />
              <Analytics />
            </NextIntlClientProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
