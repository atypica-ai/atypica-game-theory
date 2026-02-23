"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import styles from "../HomeV43.module.css";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, THREE_MODES } from "../content";

const copy = CHAPTERS[3];

/* --- CSS-only Mockups --- */

function SignalMockup() {
  return (
    <div className="relative w-full h-full">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 100"
        fill="none"
        preserveAspectRatio="none"
      >
        {/* Trend lines */}
        <polyline
          points="0,70 30,65 50,50 80,55 100,35 130,40 160,25 200,30"
          stroke="rgba(27,255,27,0.3)"
          strokeWidth="1.5"
          fill="none"
        />
        <polyline
          points="0,80 40,75 70,60 100,65 140,50 170,45 200,50"
          stroke="rgba(27,255,27,0.15)"
          strokeWidth="1"
          fill="none"
        />
        {/* Signal dots */}
        <circle cx="100" cy="35" r="2" fill="rgba(27,255,27,0.5)" />
        <circle cx="160" cy="25" r="2" fill="rgba(27,255,27,0.5)" />
        <circle cx="50" cy="50" r="1.5" fill="rgba(27,255,27,0.3)" />
        {/* Platform labels */}
        <text x="8" y="15" fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">
          XIAOHONGSHU
        </text>
        <text x="8" y="25" fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">
          TIKTOK
        </text>
        <text x="8" y="35" fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">
          TWITTER/X
        </text>
      </svg>
    </div>
  );
}

function DeepMockup() {
  const stages = ["Plan Study", "Interview x8", "Analyze", "Generate Report"];
  return (
    <div className="flex flex-col gap-1">
      {stages.map((stage, i) => (
        <div
          key={stage}
          className="flex items-center gap-2 py-1.5 px-2 border border-[rgba(147,197,253,0.12)] bg-[rgba(147,197,253,0.03)]"
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: i < 3 ? "rgba(147,197,253,0.5)" : "rgba(147,197,253,0.2)",
            }}
          />
          <span className="font-IBMPlexMono text-[8px] text-zinc-500">{stage}</span>
          <div
            className="ml-auto h-1 rounded-sm bg-white/8"
            style={{
              width: i < 3 ? `${30 + i * 15}px` : "20px",
              backgroundColor: i < 3 ? "rgba(147,197,253,0.2)" : "rgba(147,197,253,0.08)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function LiveMockup() {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="py-1.5 px-2.5 rounded-lg max-w-[75%] self-start border"
        style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.08)" }}
      >
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "80%" }} />
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "55%", marginTop: 3 }} />
      </div>
      <div className="py-1.5 px-2.5 rounded-lg max-w-[75%] self-end bg-white/6 border border-white/8">
        <div
          className="h-1.5 rounded-sm"
          style={{ width: "65%", background: "rgba(255,255,255,0.1)" }}
        />
      </div>
      <div
        className="py-1.5 px-2.5 rounded-lg max-w-[75%] self-start border"
        style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.08)" }}
      >
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "90%" }} />
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "70%", marginTop: 3 }} />
      </div>
    </div>
  );
}

const MOCKUPS = [SignalMockup, DeepMockup, LiveMockup];

export default function ThreeModesSection({
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

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
            {THREE_MODES.map((mode, i) => {
              const Mockup = MOCKUPS[i];
              return (
                <Link key={mode.key} href={mode.link} className={styles.modeCard}>
                  <div className="aspect-video bg-zinc-800/60 border-b border-zinc-800 relative overflow-hidden p-4">
                    <Mockup />
                  </div>
                  <div className="p-5 flex-1">
                    <div
                      className="font-IBMPlexMono text-xs tracking-[0.18em] uppercase mb-2"
                      style={{ color: mode.accent }}
                    >
                      {mode.badge}
                    </div>
                    <h3 className="text-lg font-medium mb-2">{mode.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-300">{mode.description}</p>
                    <p className="mt-3 font-IBMPlexMono text-xs text-[#1bff1b]">Explore &rarr;</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
