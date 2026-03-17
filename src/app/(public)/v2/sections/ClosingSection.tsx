"use client";

import { createHelloUserChatAction } from "@/app/(public)/pricing/actions";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useState } from "react";

export default function ClosingSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const locale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleRequestDemo = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const result = await createHelloUserChatAction({
      role: "user",
      content:
        locale === "zh-CN"
          ? "我是企业用户，想了解一下企业版"
          : "I want to learn about the enterprise plan",
    });

    if (!result.success) {
      setIsSubmitting(false);
      throw result;
    }

    window.location.href = `/agents/hello/${result.data.id}`;
  }, [isSubmitting, locale]);

  return (
    <section ref={register} className="relative z-2">
      <div className="relative z-2 py-24 px-6 pb-45 max-w-[1400px] mx-auto max-lg:py-15 max-lg:px-0">
        <h2 className="m-0 font-EuclidCircularA text-3xl sm:text-5xl lg:text-6xl font-medium leading-none text-white max-w-[16ch]">
          {t("closing.title")}
        </h2>
        <p className="mt-4 text-base lg:text-xl leading-normal text-zinc-300 max-w-[52ch]">
          {t("closing.body")}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRequestDemo}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 h-11 px-6 bg-ghost-green text-black font-medium text-sm tracking-[0.04em] no-underline transition-colors duration-200 hover:bg-[#15b025]"
          >
            {isSubmitting ? t("closing.ctaLoading") : t("closing.cta")}
            <span aria-hidden="true">&rarr;</span>
          </button>
          <Link
            href="/guides"
            className="inline-flex items-center h-11 px-6 border border-zinc-700 text-zinc-300 text-sm tracking-[0.04em] no-underline transition-[color,border-color] duration-200 hover:text-white hover:border-zinc-500"
          >
            {t("closing.secondaryCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
