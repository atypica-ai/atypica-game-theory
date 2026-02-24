"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS } from "../content";

const copy = CHAPTERS[0];

export default function TwoWorldsSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-24 border-t border-zinc-800 max-lg:py-16"
    >
      <ChapterPanel variant="dark">
        <div className="flex items-center gap-3 mb-6">
          <span className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b]">
            {copy.number}
          </span>
          <span className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-500">
            {t("twoWorlds.kicker")}
          </span>
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="m-0 font-InstrumentSerif italic text-3xl sm:text-4xl lg:text-5xl xl:text-6xl leading-[1.15] text-white max-w-[720px]">
            &ldquo;{t("twoWorlds.quote")}&rdquo;
          </h2>
          <p className="mt-5 font-IBMPlexMono text-sm tracking-[0.04em] text-zinc-500">
            {t("twoWorlds.attribution")}
          </p>
        </motion.div>

        {/* Two Worlds — large typographic contrast */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-0">
            {/* Objective */}
            <div className="py-8 pr-10 max-lg:pr-0 max-lg:pb-8 border-r border-zinc-800 max-lg:border-r-0 max-lg:border-b">
              <span className="font-IBMPlexMono text-[10px] tracking-[0.14em] uppercase text-zinc-600">
                {t("twoWorlds.objectiveLabel")}
              </span>
              <h3 className="mt-3 font-EuclidCircularA text-4xl lg:text-5xl font-light text-zinc-600 leading-none">
                {t("twoWorlds.objectiveTitle")}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500 max-w-[36ch]">
                {t("twoWorlds.objectiveDesc")}
              </p>
            </div>

            {/* Subjective */}
            <div className="py-8 pl-10 max-lg:pl-0 max-lg:pt-8">
              <span className="font-IBMPlexMono text-[10px] tracking-[0.14em] uppercase text-zinc-500">
                {t("twoWorlds.subjectiveLabel")}
              </span>
              <h3 className="mt-3 font-EuclidCircularA text-4xl lg:text-5xl font-medium text-[#1bff1b] leading-none">
                {t("twoWorlds.subjectiveTitle")}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300 max-w-[36ch]">
                {t("twoWorlds.subjectiveDesc")}
              </p>
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
