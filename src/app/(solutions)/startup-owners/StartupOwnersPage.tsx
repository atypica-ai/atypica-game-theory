"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Search, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseStudiesSection } from "../components/CaseStudiesSection";

export default function StartupOwnersPage() {
  const locale = useLocale();
  const t = useTranslations("Solutions.StartupOwnersPage.UseCasesSection");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGetStarted = () => {
    if (status === "authenticated" && session?.user) {
      router.push("/");
    } else {
      router.push("/auth/signin");
    }
  };

  const isZh = locale === "zh-CN";

  return (
    <>
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-[560px] md:min-h-[640px] lg:min-h-[720px] overflow-hidden">
          <div className="absolute inset-0 z-0 bg-background bg-linear-to-b from-background via-background to-background/95">
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-3xl opacity-[0.25] dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 40%, transparent 80%)",
              }}
            />
          </div>

          <div className="container mx-auto px-6 sm:px-8 md:px-6 lg:px-4 max-w-screen-2xl relative z-10 h-full">
            <div
              className={cn(
                "flex flex-col justify-center items-center text-center min-h-[560px] md:min-h-[640px] lg:min-h-[720px] py-16 md:py-20",
                "transition-all duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
              )}
            >
              <p className="text-base md:text-lg lg:text-xl font-medium tracking-[0.22em] uppercase text-muted-foreground mb-6">
                {isZh ? "Atypica For Startup Owners" : "ATYPICA For Startup Owners"}
              </p>

              <h1
                className={cn(
                  "font-EuclidCircularA font-bold mb-6",
                  "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
                  "tracking-tight leading-[1.3]",
                  "text-foreground",
                )}
              >
                {isZh ? (
                  <>
                    <span className="relative inline-block ml-6">
                      <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                      <span className="font-black text-[1.1em]">尽早</span>
                    </span>
                    淘汰
                    <span className="line-through decoration-primary decoration-[3px]">坏想法</span>
                  </>
                ) : (
                  <>
                    <span className="font-black text-[1.1em]">
                      K<span className="text-primary">i</span>ll
                    </span>{" "}
                    <span className="line-through decoration-primary decoration-[3px]">
                      Bad Ideas
                    </span>{" "}
                    Early
                  </>
                )}
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-4xl leading-relaxed mb-10">
                {isZh
                  ? "快速知道什么会火、怎么优化、趋势在哪"
                  : "Quickly discover what will go viral, how to optimize, and where trends are heading"}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="h-14 px-8 text-base font-semibold rounded-full"
                >
                  {isZh ? "开始使用" : "Get Started"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <CaseStudiesSection tag="startup-owners" />

        {/* Use Cases Section */}
        <section className="py-20 md:py-32 bg-background relative overflow-hidden">
          <div className="container mx-auto px-6 sm:px-8 md:px-6 lg:px-4 max-w-screen-2xl relative z-10">
            <div className="mb-12 text-center">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {t("title")}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 md:gap-8 lg:gap-12">
              <div className="group relative bg-card rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] flex flex-col h-full">
                <div className="relative z-10 flex flex-col h-full p-5 sm:p-6 transition-all duration-300">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold leading-snug text-card-foreground">
                      {t("scenario1.question")}
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[30px] md:min-h-10" />
                  <div>
                    <Link
                      href={`/newstudy?topic=${encodeURIComponent(t("scenario1.question"))}`}
                      prefetch={true}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-foreground text-background text-xs sm:text-sm md:text-base font-semibold transition-transform duration-200 group-hover:scale-105 hover:opacity-90"
                    >
                      <Search className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      <span>{t("scenario1.primaryTool.label")}</span>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="group relative bg-card rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] flex flex-col h-full">
                <div className="relative z-10 flex flex-col h-full p-5 sm:p-6 transition-all duration-300">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold leading-snug text-card-foreground">
                      {t("scenario2.question")}
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[30px] md:min-h-10" />
                  <div>
                    <Link
                      href={`/newstudy?topic=${encodeURIComponent(t("scenario2.question"))}`}
                      prefetch={true}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-foreground text-background text-xs sm:text-sm md:text-base font-semibold transition-transform duration-200 group-hover:scale-105 hover:opacity-90"
                    >
                      <MessageSquare className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      <span>{t("scenario2.primaryTool.label")}</span>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="group relative bg-card rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] flex flex-col h-full">
                <div className="relative z-10 flex flex-col h-full p-5 sm:p-6 transition-all duration-300">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold leading-snug text-card-foreground">
                      {t("scenario3.question")}
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[30px] md:min-h-10" />
                  <div>
                    <Link
                      href="/personas"
                      prefetch={true}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-foreground text-background text-xs sm:text-sm md:text-base font-semibold transition-transform duration-200 group-hover:scale-105 hover:opacity-90"
                    >
                      <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      <span>{t("scenario3.primaryTool.label")}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
