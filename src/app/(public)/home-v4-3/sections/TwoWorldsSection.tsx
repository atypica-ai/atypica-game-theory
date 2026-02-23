"use client";

import { motion } from "framer-motion";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS } from "../content";

const copy = CHAPTERS[0];

export default function TwoWorldsSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-white/10 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        <div className="max-w-[1120px] mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-white/55 mb-3">
            {copy.kicker}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-[clamp(22px,2.5vw,38px)] font-medium leading-tight">
            {copy.title}
          </h2>
          {copy.body.map((text, i) => (
            <p
              key={text}
              className="mt-4 max-w-[64ch] text-[clamp(15px,1.1vw,18px)] leading-relaxed text-white/55"
              style={
                i === 0
                  ? { fontStyle: "italic", color: "rgba(255,255,255,0.35)", marginTop: 4 }
                  : undefined
              }
            >
              {text}
            </p>
          ))}
        </div>

        <motion.div
          className="max-w-[1120px]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-2 gap-0.5 max-lg:grid-cols-1">
            <div className="p-8 border border-white/10">
              <p className="font-IBMPlexMono text-xs tracking-[0.18em] uppercase text-white/55 mb-3">
                [1.A] OBJECTIVE WORLD
              </p>
              <h3 className="text-xl font-medium mb-2">Measurable</h3>
              <p className="text-sm leading-relaxed text-white/55">
                Quantifiable. The domain of traditional AI agents — automating tasks, processing
                data, executing workflows.
              </p>
            </div>
            <div className="p-8 border border-white/10">
              <p className="font-IBMPlexMono text-xs tracking-[0.18em] uppercase text-white/55 mb-3">
                [1.B] SUBJECTIVE WORLD
              </p>
              <h3 className="text-xl font-medium mb-2 text-[#1bff1b]">Emotional</h3>
              <p className="text-sm leading-relaxed text-white/55">
                Contextual. The domain of human decisions — why people choose, hesitate, trust, and
                act.
              </p>
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
