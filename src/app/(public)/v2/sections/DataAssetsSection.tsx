"use client";

import { motion } from "framer-motion";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, DATA_ASSETS } from "../content";

const copy = CHAPTERS[4];

export default function DataAssetsSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
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
            {copy.kicker}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {copy.title}
          </h2>
          {copy.body.map((text) => (
            <p
              key={text}
              className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300"
            >
              {text}
            </p>
          ))}
        </div>

        {/* Three assets — horizontal bands separated by lines */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="space-y-0"
        >
          {DATA_ASSETS.map((asset, idx) => (
            <div
              key={asset.key}
              className="py-10 first:pt-0 last:pb-0"
              style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
            >
              {/* Row 1: Title + hero stat */}
              <div className="flex items-baseline justify-between gap-8 mb-4 max-lg:flex-col max-lg:gap-2">
                <div>
                  <h3 className="font-EuclidCircularA text-2xl lg:text-3xl font-medium">
                    <span style={{ color: asset.accent }}>{asset.title}</span>
                  </h3>
                  <p className="font-IBMPlexMono text-xs tracking-[0.08em] uppercase text-zinc-500 mt-1">
                    {asset.subtitle}
                  </p>
                </div>
                <div className="text-right max-lg:text-left">
                  <span
                    className="font-EuclidCircularA text-4xl lg:text-5xl font-light"
                    style={{ color: asset.accent }}
                  >
                    {asset.heroStat.value}
                  </span>
                  <span className="block font-IBMPlexMono text-[10px] tracking-[0.1em] uppercase text-zinc-500 mt-1">
                    {asset.heroStat.label}
                  </span>
                </div>
              </div>

              {/* Row 2: Description + detail stats inline */}
              <div className="grid grid-cols-[1fr_auto] gap-10 items-start max-lg:grid-cols-1 max-lg:gap-4">
                <div>
                  <p className="text-sm leading-relaxed text-zinc-300 max-w-[56ch]">
                    {asset.description}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 italic">
                    {asset.note}
                  </p>
                </div>
                <div className="flex gap-6 max-lg:gap-4">
                  {asset.details.map((d) => (
                    <div key={d.label} className="text-right max-lg:text-left">
                      <span className="block text-lg font-medium text-white">{d.value}</span>
                      <span className="block font-IBMPlexMono text-[9px] tracking-[0.08em] uppercase text-zinc-500 mt-0.5">
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
