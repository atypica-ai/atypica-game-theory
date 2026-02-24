"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, SAGE_CAPABILITY_KEYS, SIMULATOR_PERSONA_KEYS } from "../content";
import PersonaBuilderDemo from "../demos/PersonaBuilderDemo";
import FocusGroupDemo from "../demos/FocusGroupDemo";

const copy = CHAPTERS[2];

export default function TwoAgentsSection({
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
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">{copy.number}</div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">{t("twoAgents.kicker")}</p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">{t("twoAgents.title")}</h2>
          <p className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300">{t("twoAgents.body")}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
            {/* ── Left: AI Persona ── */}
            <div className="border border-zinc-800 p-7">
              <h3 className="font-IBMPlexMono text-lg tracking-[0.08em] uppercase mb-2 text-[#1bff1b]">
                {t("twoAgents.simulator.tag")}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300 mb-5">
                {t("twoAgents.simulator.description")}
              </p>

              <div className="mb-4">
                <PersonaBuilderDemo />
              </div>

              <div className="grid gap-2">
                {SIMULATOR_PERSONA_KEYS.map((personaKey) => (
                  <div key={personaKey} className="border border-zinc-800 p-3 px-4 transition-colors duration-200 hover:border-zinc-600">
                    <div className="text-sm font-medium">{t(`twoAgents.simulator.${personaKey}.label`)}</div>
                    <div className="text-sm leading-normal text-zinc-300 mt-1">{t(`twoAgents.simulator.${personaKey}.description`)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: AI Sage ── */}
            <div className="border border-zinc-800 p-7">
              <h3 className="font-IBMPlexMono text-lg tracking-[0.08em] uppercase mb-2 text-[#93c5fd]">
                {t("twoAgents.researcher.tag")}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300 mb-5">
                {t("twoAgents.researcher.description")}
              </p>

              <div className="mb-4">
                <FocusGroupDemo />
              </div>

              <div className="grid gap-1.5">
                {SAGE_CAPABILITY_KEYS.map((capKey, i) => (
                  <div key={capKey} className="flex items-center gap-2.5 border border-zinc-800 py-2.5 px-3.5 text-sm transition-colors duration-200 hover:border-zinc-600">
                    <span className="font-IBMPlexMono text-xs text-zinc-300 min-w-[18px]">{String(i + 1).padStart(2, "0")}</span>
                    <span>{t(`twoAgents.researcher.${capKey}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
