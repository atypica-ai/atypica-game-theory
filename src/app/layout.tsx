import { AuthProvider } from "@/components/AuthProvider";
import GlobalHeader from "@/components/GlobalHeader";
import Stars from "@/components/Stars";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "black",
};

const title = "atypica.LLM - 为「主观世界」建模";
const description = `商业研究本质上是关于理解和影响人类决策过程的学问。消费者并不只是根据纯粹的数据和统计概率做决策，而是受到叙事、情感和认知偏见的强烈影响。这也是为什么品牌故事、营销叙事和企业文化等「内容」在商业中如此重要——它们都在塑造人们理解和互动的「故事」，从而影响决策过程。所以，理解影响决策的机制是商业研究的核心；这也是行为经济学、消费者心理学和组织行为学等领域与商业研究紧密相连的原因。

我们做了一个商业问题研究的智能体框架「Atypica.LLM」。将「语言模型」应用于理解商业领域中那些难以量化的主观因素——消费者情绪、市场认知和决策偏好；通过「智能体」来「塑造」消费者的个性和认知；通过与智能体的「互动」来获得消费者的行为和决策。

如果，「物理」为「客观世界」建模；那么，「语言模型」则为「主观世界」建模。`;

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s | atypica.LLM",
  },
  description: description,
  keywords: [],
  authors: [{ name: "Tezign" }],
  category: "technology",
  openGraph: {
    title: title,
    description: description,
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: title,
    description: description,
  },
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
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          "font-IBMPlexMonoRegular antialiased",
          "h-dvh flex flex-col items-stretch justify-start",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Stars />
          <NextIntlClientProvider>
            <AuthProvider>
              <GlobalHeader />
              {children}
            </AuthProvider>
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
      {process.env.NODE_ENV === "production" && <GoogleAnalytics gaId="G-EJTF0VJKQP" />}
    </html>
  );
}
