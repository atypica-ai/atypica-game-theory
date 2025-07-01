"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { reginalS3Url } from "./actions";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Manager at Microsoft",
    avatar:
      "/api/imagegen/dev/Professional headshot of an Asian woman in her 30s, smiling confidently, wearing business attire. Style: clean, professional lighting.",
  },
  {
    name: "Marcus Johnson",
    role: "Marketing Director at Canva",
    avatar:
      "/api/imagegen/dev/Professional headshot of a Black man in his 40s, friendly smile, wearing a modern business shirt. Style: warm lighting, professional.",
  },
  {
    name: "Emily Rodriguez",
    role: "Research Lead at UFC",
    avatar:
      "/api/imagegen/dev/Professional headshot of a Latina woman in her 30s, confident expression, wearing professional blazer. Style: bright, clean lighting.",
  },
  {
    name: "David Kim",
    role: "Founder at Simple Modern",
    avatar:
      "/api/imagegen/dev/Professional headshot of an Asian man in his 30s, warm smile, wearing casual business attire. Style: natural lighting, approachable.",
  },
  {
    name: "Jessica Taylor",
    role: "Brand Manager at SKIMS",
    avatar:
      "/api/imagegen/dev/Professional headshot of a Caucasian woman in her 20s, bright smile, wearing modern professional clothing. Style: soft lighting, friendly.",
  },
];

export function HeroSection() {
  const t = useTranslations("HomePageV3.HeroSection");
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [posterSrc, setPosterSrc] = useState<string | null>(null);

  useEffect(() => {
    reginalS3Url("atypica/public/atypica-promo-20250627.mp4").then((res) => {
      setVideoSrc(res);
    });
    reginalS3Url("atypica/public/atypica-promo-video-poster-20250624.jpeg").then((res) => {
      setPosterSrc(res);
    });
  }, []);

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4 text-center">
        <h1
          className={cn(
            "font-EuclidCircularA max-w-5xl mx-auto mb-6",
            "font-medium tracking-tight leading-tight text-3xl sm:text-5xl md:text-6xl zh:tracking-wide zh:text-4xl zh:md:text-6xl",
          )}
        >
          {t("title")} <br />
          <div className="italic font-InstrumentSerif tracking-normal">{t("titleHighlight")}</div>
        </h1>
        <p className="max-w-4xl mx-auto text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-12">
          {t("subtitle")}
        </p>

        {/* CTA Section */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-16">
          <Button size="lg" className="rounded-full has-[>svg]:px-8 px-8 h-12" asChild>
            <Link href="/study">
              {t("startStudyButton")}
              <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </Button>

          {/* Trust Indicators */}
          <div className="flex items-center gap-2">
            {/* User Avatars */}
            <div className="flex items-center -space-x-2">
              {testimonials.slice(0, 5).map((person, index) => (
                <div
                  key={person.name}
                  className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-zinc-800 shadow-sm"
                  style={{ zIndex: 5 - index }}
                  title={`${person.name} - ${person.role}`}
                >
                  <Image
                    src={person.avatar}
                    alt={`${person.name} - ${person.role}`}
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                </div>
              ))}
            </div>

            {/* Star Rating and Text */}
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-500 text-left">
                {t("trustIndicator")}
              </div>
            </div>
          </div>
        </div>

        {/* Video Section */}
        <div className="relative max-w-5xl mx-auto">
          <div className="aspect-video rounded-xl bg-zinc-900 shadow-2xl shadow-black/10 overflow-hidden">
            {videoSrc && posterSrc ? (
              <video
                key={videoSrc}
                poster={posterSrc}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900/50 flex items-center justify-center">
                <div className="text-zinc-400 dark:text-zinc-600">{t("loadingVideo")}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
