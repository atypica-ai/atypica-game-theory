"use client";

import { motion } from "framer-motion";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, RESEARCHER, SIMULATOR } from "../content";

const copy = CHAPTERS[1];

/* --- Minimal UI Mockups (CSS only) --- */

function PersonaMockup() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2">
      <div
        className="w-10 h-10 rounded-full border"
        style={{ borderColor: "rgba(27,255,27,0.3)", background: "rgba(27,255,27,0.08)" }}
      />
      <div className="flex-1 flex flex-col gap-[3px]">
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "50%", margin: "0 auto" }} />
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "35%", margin: "0 auto" }} />
      </div>
      <div className="flex gap-1 flex-wrap justify-center">
        {["Gen-Z", "Urban", "Price-sensitive", "Social"].map((tag) => (
          <span
            key={tag}
            className="py-0.5 px-2 font-IBMPlexMono text-[8px] border"
            style={{ borderColor: "rgba(27,255,27,0.2)", color: "rgba(27,255,27,0.6)" }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function InterviewMockup() {
  return (
    <div className="relative w-full h-full flex flex-col gap-1.5">
      <div className="py-1.5 px-2.5 rounded-lg max-w-[75%] self-start bg-[rgba(27,255,27,0.15)] border border-[rgba(27,255,27,0.2)]">
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "85%" }} />
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "60%", marginTop: 3 }} />
      </div>
      <div className="py-1.5 px-2.5 rounded-lg max-w-[75%] self-end bg-white/6 border border-white/8">
        <div
          className="h-1.5 rounded-sm"
          style={{ width: "70%", background: "rgba(255,255,255,0.1)" }}
        />
      </div>
      <div className="py-1.5 px-2.5 rounded-lg max-w-[75%] self-start bg-[rgba(27,255,27,0.15)] border border-[rgba(27,255,27,0.2)]">
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "90%" }} />
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "75%", marginTop: 3 }} />
        <div className="h-1.5 rounded-sm bg-white/8" style={{ width: "40%", marginTop: 3 }} />
      </div>
      <div className="py-1.5 px-2.5 rounded-lg max-w-[75%] self-end bg-white/6 border border-white/8">
        <div
          className="h-1.5 rounded-sm"
          style={{ width: "55%", background: "rgba(255,255,255,0.1)" }}
        />
        <div
          className="h-1.5 rounded-sm"
          style={{ width: "80%", marginTop: 3, background: "rgba(255,255,255,0.1)" }}
        />
      </div>
    </div>
  );
}

export default function TwoAgentsSection({
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
          <h2 className="m-0 font-EuclidCircularA text-[clamp(28px,3.5vw,52px)] font-medium leading-[1.1]">
            {copy.title}
          </h2>
          {copy.body.map((text) => (
            <p
              key={text}
              className="mt-4 max-w-[64ch] text-[clamp(15px,1.1vw,18px)] leading-relaxed text-white/55"
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
          <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
            {/* Simulator card */}
            <div className="border border-white/10 p-7">
              <div className="font-IBMPlexMono text-xs tracking-[0.18em] uppercase mb-3 text-[#1bff1b]">
                {SIMULATOR.tag}
              </div>
              <h3 className="text-xl font-medium mb-2">{SIMULATOR.title}</h3>
              <p className="text-sm leading-relaxed text-white/55 mb-5">{SIMULATOR.description}</p>

              {/* Persona mockup */}
              <div className="mb-4 p-4 border border-white/8 bg-white/2">
                <PersonaMockup />
              </div>

              <div className="grid gap-2">
                {SIMULATOR.roles.map((role) => (
                  <div
                    key={role.key}
                    className="border border-white/10 p-3 px-4 transition-colors duration-200 hover:border-white/25"
                  >
                    <div className="text-sm font-medium">{role.label}</div>
                    <div className="font-IBMPlexMono text-xs tracking-[0.06em] text-white/55 mt-0.5">
                      {role.sub}
                    </div>
                    <div className="text-sm leading-normal text-white/55 mt-1.5">
                      {role.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Researcher card */}
            <div className="border border-white/10 p-7">
              <div className="font-IBMPlexMono text-xs tracking-[0.18em] uppercase mb-3 text-[#93c5fd]">
                {RESEARCHER.tag}
              </div>
              <h3 className="text-xl font-medium mb-2">{RESEARCHER.title}</h3>
              <p className="text-sm leading-relaxed text-white/55 mb-5">{RESEARCHER.description}</p>

              {/* Interview mockup */}
              <div className="mb-4 p-4 border border-white/8 bg-white/2">
                <InterviewMockup />
              </div>

              <div className="grid gap-1.5">
                {RESEARCHER.methods.map((method, i) => (
                  <div
                    key={method.key}
                    className="flex items-center gap-2.5 border border-white/10 py-2.5 px-3.5 text-sm transition-colors duration-200 hover:border-white/25"
                  >
                    <span className="font-IBMPlexMono text-xs text-white/55 min-w-[18px]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{method.label}</span>
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
