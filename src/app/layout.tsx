import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { getProxyCdnOrigin } from "./(system)/cdn/lib";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-InstrumentSerif",
  weight: ["400"],
  fallback: ["serif"],
});

export const viewport: Viewport = {
  themeColor: "black",
};

export const metadata: Metadata = {
  title: {
    default: "Game Theory Lab",
    template: "%s | Game Theory Lab",
  },
  description: "AI persona game theory simulations",
};

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
      data-proxy-cdn-origin={getProxyCdnOrigin()}
      suppressHydrationWarning
    >
      <body
        className={cn(
          "font-sans antialiased",
          instrumentSerif.variable,
        )}
      >
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <NextIntlClientProvider>
              {children}
              <Toaster richColors={true} />
            </NextIntlClientProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
