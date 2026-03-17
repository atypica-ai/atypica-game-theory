"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, RESEARCHER_METHOD_KEYS, SIMULATOR_PERSONA_KEYS } from "../content";
import FocusGroupDemo from "../demos/FocusGroupDemo";
import PersonaBuilderDemo from "../demos/PersonaBuilderDemo";

const copy = CHAPTERS[2];
const RESEARCHER_METHOD_LINKS = {
  oneToOne: "/persona",
  oneToMany: "/newstudy",
  expertDiscussion: "/panel",
  focusGroup: "/panel",
  multiParty: null,
  observation: null,
} as const;

const SIMULATOR_PERSONA_LINK = "/persona";
const SIMULATOR_SAGE_LINK = "/sage";

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
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-ghost-green mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">
            {t("twoAgents.kicker")}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {t("twoAgents.title")}
          </h2>
          <p className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300">
            {t("twoAgents.body")}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
            {/* ── Left: AI Simulator ── */}
            <div className="border border-zinc-800 p-7">
              <h3 className="font-IBMPlexMono text-lg tracking-[0.08em] uppercase mb-2 text-ghost-green">
                {t("twoAgents.simulator.tag")}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300 mb-5">
                {t("twoAgents.simulator.description")}
              </p>

              <div className="mb-5">
                <PersonaBuilderDemo />
              </div>

              {/* AI Persona */}
              <div className="mb-3">
                <div className="font-IBMPlexMono text-xs tracking-[0.12em] uppercase text-zinc-400 mb-2">
                  {t("twoAgents.simulator.personaLabel")}
                </div>
                <div className="grid gap-2">
                  {SIMULATOR_PERSONA_KEYS.map((personaKey) => (
                    <Link
                      key={personaKey}
                      href={SIMULATOR_PERSONA_LINK}
                      className="border border-zinc-800 p-3 px-4 transition-colors duration-200 hover:border-zinc-600"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium">
                          {t(`twoAgents.simulator.${personaKey}.label`)}
                        </div>
                        <span className="font-IBMPlexMono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                          {t("twoAgents.openLink")} ↗
                        </span>
                      </div>
                      <div className="text-sm leading-normal text-zinc-300 mt-1">
                        {t(`twoAgents.simulator.${personaKey}.description`)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* AI Sage */}
              <div>
                <div className="font-IBMPlexMono text-xs tracking-[0.12em] uppercase text-zinc-400 mb-2">
                  {t("twoAgents.simulator.sageLabel")}
                </div>
                <Link
                  href={SIMULATOR_SAGE_LINK}
                  className="block border border-zinc-800 p-3 px-4 transition-colors duration-200 hover:border-zinc-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium">
                      {t("twoAgents.simulator.expert.label")}
                    </div>
                    <span className="font-IBMPlexMono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                      {t("twoAgents.openLink")} ↗
                    </span>
                  </div>
                  <div className="text-sm leading-normal text-zinc-300 mt-1">
                    {t("twoAgents.simulator.expert.description")}
                  </div>
                </Link>
              </div>
            </div>

            {/* ── Right: AI Researcher ── */}
            <div className="border border-zinc-800 p-7">
              <h3 className="font-IBMPlexMono text-lg tracking-[0.08em] uppercase mb-2 text-[#93c5fd]">
                {t("twoAgents.researcher.tag")}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300 mb-5">
                {t("twoAgents.researcher.description")}
              </p>

              <div className="mb-5">
                <FocusGroupDemo />
              </div>

              <div className="grid gap-1.5">
                {RESEARCHER_METHOD_KEYS.map((methodKey, i) =>
                  (() => {
                    const href = RESEARCHER_METHOD_LINKS[methodKey];
                    const content = (
                      <>
                        <span className="font-IBMPlexMono text-xs text-zinc-300 min-w-[18px]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 min-w-0">
                          {t(`twoAgents.researcher.${methodKey}`)}
                        </span>
                        <span className="font-IBMPlexMono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                          {href ? `${t("twoAgents.openLink")} ↗` : t("twoAgents.comingSoon")}
                        </span>
                      </>
                    );

                    if (!href) {
                      return (
                        <div
                          key={methodKey}
                          className="flex items-center gap-2.5 border border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-500"
                        >
                          {content}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={methodKey}
                        href={href}
                        className="flex items-center gap-2.5 border border-zinc-800 py-2.5 px-3.5 text-sm transition-colors duration-200 hover:border-zinc-600"
                      >
                        {content}
                      </Link>
                    );
                  })(),
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
