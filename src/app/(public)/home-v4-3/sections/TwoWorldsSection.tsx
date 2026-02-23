"use client";

import { cn } from "@/lib/utils";
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
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">
            {copy.kicker}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-2xl lg:text-3xl xl:text-4xl font-medium leading-tight">
            {copy.title}
          </h2>
          {copy.body.map((text, i) => (
            <p
              key={text}
              className={cn(
                "mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300",
                i === 0 && "italic text-zinc-600 mt-1",
              )}
            >
              {text}
            </p>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-2 gap-0.5 max-lg:grid-cols-1">
            <div className="p-8 border border-zinc-800">
              <p className="font-IBMPlexMono text-xs tracking-[0.18em] uppercase text-zinc-300 mb-3">
                [1.A] OBJECTIVE WORLD
              </p>
              <h3 className="text-xl font-medium mb-2">Measurable</h3>
              <p className="text-sm leading-relaxed text-zinc-300">
                Quantifiable. The domain of traditional AI agents — automating tasks, processing
                data, executing workflows.
              </p>
            </div>
            <div className="p-8 border border-zinc-800">
              <p className="font-IBMPlexMono text-xs tracking-[0.18em] uppercase text-zinc-300 mb-3">
                [1.B] SUBJECTIVE WORLD
              </p>
              <h3 className="text-xl font-medium mb-2 text-[#1bff1b]">Emotional</h3>
              <p className="text-sm leading-relaxed text-zinc-300">
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
