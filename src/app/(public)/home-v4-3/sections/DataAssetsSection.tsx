"use client";

import { motion } from "framer-motion";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, DATA_ASSETS } from "../content";

const copy = CHAPTERS[4];

/* --- CSS-only Mockups for each asset --- */

function PersonaAssetMockup() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2">
      <div
        className="w-9 h-9 rounded-full border"
        style={{
          borderColor: "rgba(27,255,27,0.3)",
          background: "rgba(27,255,27,0.06)",
        }}
      />
      <div className="flex-1 flex flex-col gap-[3px] items-center">
        <div
          className="h-1.5 rounded-sm"
          style={{ width: "45%", background: "rgba(0,0,0,0.08)" }}
        />
        <div
          className="h-1.5 rounded-sm"
          style={{ width: "30%", background: "rgba(0,0,0,0.05)" }}
        />
      </div>
      <div className="flex gap-1 flex-wrap justify-center">
        {["Tier-2", "Female", "25-34", "Urban"].map((tag) => (
          <span
            key={tag}
            className="py-0.5 px-2 font-IBMPlexMono border"
            style={{ borderColor: "rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.4)", fontSize: 7 }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function SageAssetMockup() {
  return (
    <div className="relative w-full h-full flex flex-col gap-1.5">
      <div
        className="py-2 px-2.5 border"
        style={{ borderColor: "rgba(0,0,0,0.08)", background: "rgba(147,197,253,0.04)" }}
      >
        <div
          className="font-IBMPlexMono text-[8px] tracking-[0.08em] uppercase mb-1"
          style={{ color: "rgba(0,0,0,0.3)" }}
        >
          CORE MEMORY
        </div>
        <div
          className="h-1.5 rounded-sm"
          style={{ width: "80%", background: "rgba(0,0,0,0.06)" }}
        />
        <div
          className="h-1.5 rounded-sm mt-[3px]"
          style={{ width: "60%", background: "rgba(0,0,0,0.04)" }}
        />
      </div>
      <div
        className="py-2 px-2.5 border"
        style={{ borderColor: "rgba(0,0,0,0.06)", background: "rgba(147,197,253,0.02)" }}
      >
        <div
          className="font-IBMPlexMono text-[8px] tracking-[0.08em] uppercase mb-1"
          style={{ color: "rgba(0,0,0,0.25)" }}
        >
          WORKING MEMORY
        </div>
        <div
          className="h-1.5 rounded-sm"
          style={{ width: "70%", background: "rgba(0,0,0,0.05)" }}
        />
        <div
          className="h-1.5 rounded-sm mt-[3px]"
          style={{ width: "45%", background: "rgba(0,0,0,0.03)" }}
        />
      </div>
    </div>
  );
}

function PanelAssetMockup() {
  const colors = ["#1bff1b", "#93c5fd", "#f59e0b", "#f472b6"];
  return (
    <div className="relative w-full h-full grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 content-start">
      {["Moderator", "Persona A", "Persona B", "Persona C"].map((name, i) => (
        <div key={name} style={{ display: "contents" }}>
          <div className="flex items-center gap-1.5 py-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors[i], opacity: 0.5 }}
            />
            <span className="font-IBMPlexMono text-[8px]" style={{ color: "rgba(0,0,0,0.35)" }}>
              {name}
            </span>
          </div>
          <div
            className="py-1.5 px-2 self-center"
            style={{
              borderColor: "rgba(0,0,0,0.06)",
              background: "rgba(0,0,0,0.02)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div
              className="h-1.5 rounded-sm"
              style={{ width: `${55 + i * 10}%`, background: "rgba(0,0,0,0.06)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const ASSET_MOCKUPS = [PersonaAssetMockup, SageAssetMockup, PanelAssetMockup];

export default function DataAssetsSection({
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
      <ChapterPanel variant="light">
        <div className="max-w-[1120px] mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#15b025] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-black/55 mb-3">
            {copy.kicker}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-[clamp(28px,3.5vw,52px)] font-medium leading-[1.1]">
            {copy.title}
          </h2>
          {copy.body.map((text) => (
            <p
              key={text}
              className="mt-4 max-w-[64ch] text-[clamp(15px,1.1vw,18px)] leading-relaxed text-black/55"
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
          <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
            {DATA_ASSETS.map((asset, i) => {
              const Mockup = ASSET_MOCKUPS[i];
              return (
                <div key={asset.key} className="border border-black/10 bg-white flex flex-col">
                  <div className="aspect-video bg-[#f5f5f3] border-b border-black/10 relative overflow-hidden p-4">
                    <Mockup />
                  </div>
                  <div className="p-5 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1.5">{asset.title}</h3>
                    <p className="text-sm leading-relaxed text-black/55 mb-4">{asset.description}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {asset.stats.map((stat) => (
                        <div key={stat.label} className="border border-black/10 py-2 px-2.5">
                          <div className="font-IBMPlexMono text-[9px] tracking-[0.1em] uppercase text-black/55">
                            {stat.label}
                          </div>
                          <div className="text-sm font-medium text-gray-900 mt-0.5">
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
