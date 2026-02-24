"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export default function ClosingSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");

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
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 h-11 px-6 bg-[#1bff1b] text-black font-medium text-sm tracking-[0.04em] no-underline transition-colors duration-200 hover:bg-[#15b025]"
          >
            {t("closing.cta")}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link
            href="#"
            className="inline-flex items-center h-11 px-6 border border-zinc-700 text-zinc-300 text-sm tracking-[0.04em] no-underline transition-[color,border-color] duration-200 hover:text-white hover:border-zinc-500"
          >
            {t("closing.secondaryCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
