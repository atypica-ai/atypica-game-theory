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
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "black",
};

const title = "atypica.AI - 为「主观世界」建模";
const pageMetadata = generatePageMetadata({ title });

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s | atypica.AI",
  },
  description: pageMetadata.description,
  keywords: [],
  authors: [{ name: "Tezign" }],
  category: "technology",
  openGraph: pageMetadata.openGraph,
  twitter: pageMetadata.twitter,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/_public/hippyghost-square-dark.jpg",
    shortcut: "/_public/hippyghost-square-dark.jpg",
    apple: { url: "/_public/hippyghost-square-dark.jpg", sizes: "180x180", type: "image/png" },
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-deploy-region={getDeployRegion()} suppressHydrationWarning>
      <body
        className={cn(
          "font-IBMPlexMonoRegular antialiased",
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
            </NextIntlClientProvider>
          </ThemeProvider>
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
