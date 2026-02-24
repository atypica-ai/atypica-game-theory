"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, DATA_ASSET_ACCENTS, DATA_ASSET_KEYS } from "../content";

const copy = CHAPTERS[4];

export default function DataAssetsSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        <div className="mb-14">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">
            {t("dataAssets.kicker")}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {t("dataAssets.title")}
          </h2>
          <p className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300">
            {t("dataAssets.body")}
          </p>
        </div>

        {/* Three assets — showoff stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-1">
            {DATA_ASSET_KEYS.map((assetKey) => {
              const accent = DATA_ASSET_ACCENTS[assetKey];
              return (
                <div key={assetKey} className="border border-zinc-800 p-6">
                  {/* Big stat */}
                  <span
                    className="font-EuclidCircularA text-5xl lg:text-6xl font-light block"
                    style={{ color: accent }}
                  >
                    {t(`dataAssets.${assetKey}.heroStatValue`)}
                  </span>
                  <span className="block font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-500 mt-1 mb-5">
                    {t(`dataAssets.${assetKey}.heroStatLabel`)}
                  </span>

                  {/* Title + description */}
                  <h3 className="text-lg font-medium mb-1" style={{ color: accent }}>
                    {t(`dataAssets.${assetKey}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {t(`dataAssets.${assetKey}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
