"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import AnimCursor from "./AnimCursor";
import ProductFrame, { BreadcrumbSegment, BreadcrumbSeparator } from "./ProductFrame";
import RadarChart from "./RadarChart";
import { L } from "./theme";

const TAG_KEYS = ["tagGenZ", "tagUrban", "tagPriceSensitive", "tagSocial"] as const;
const RADAR_DIM_KEYS = ["dimDemo", "dimGeo", "dimPsych", "dimBehav", "dimNeeds", "dimTech", "dimSocial"] as const;

type Phase = "home" | "flying" | "processing" | "result";

export default function PersonaBuilderDemo() {
  const t = useTranslations("HomeAtypicaV2");
  const [phase, setPhase] = useState<Phase>("home");
  const [procStep, setProcStep] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, clicking: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const steps = [t("twoAgents.mockup.stepParse"), t("twoAgents.mockup.stepAnalyze"), t("twoAgents.mockup.stepGenerate")];
  const radarLabels = RADAR_DIM_KEYS.map((k) => t(`twoAgents.mockup.${k}`));

  function clearTimers() { timersRef.current.forEach(clearTimeout); timersRef.current = []; }
  function schedule(fn: () => void, ms: number) { timersRef.current.push(setTimeout(fn, ms)); }

  function getCenterX() {
    const el = containerRef.current;
    return el ? el.offsetWidth / 2 : 160;
  }

  function startImport() {
    clearTimers();
    const cx = getCenterX();
    // Cursor appears top-right, carries file toward the Upload button, drops it, proceeds
    setCursor({ x: cx + 70, y: 20, visible: true, clicking: false });
    schedule(() => setCursor({ x: cx, y: 165, visible: true, clicking: false }), 600);
    schedule(() => setCursor({ x: cx, y: 165, visible: true, clicking: true }), 1000);
    schedule(() => { setPhase("flying"); setCursor((c) => ({ ...c, clicking: false })); }, 1200);
    schedule(() => { setCursor((c) => ({ ...c, visible: false })); setPhase("processing"); setProcStep(0); }, 1800);
  }

  useEffect(() => {
    if (phase !== "processing") return;
    const t = setTimeout(() => (procStep < 3 ? setProcStep((s) => s + 1) : setPhase("result")), procStep < 3 ? 800 : 400);
    return () => clearTimeout(t);
  }, [phase, procStep]);

  useEffect(() => {
    if (phase !== "result") return;
    clearTimers();
    schedule(() => { const el = scrollRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, 800);
    schedule(() => { setPhase("home"); setProcStep(0); const el = scrollRef.current; if (el) el.scrollTop = 0; }, 7000);
    return clearTimers;
  }, [phase]);

  useEffect(() => {
    if (phase !== "home") return;
    const t = setTimeout(startImport, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <ProductFrame
      className="h-[400px]"
      sidebarActiveIndex={0}
      accentColor={L.green}
      breadcrumb={<><BreadcrumbSegment text="Persona" /><BreadcrumbSeparator /><BreadcrumbSegment text="Import" active /></>}
    >
      <div ref={containerRef} className="h-full relative">
        <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden">
          <AnimCursor x={cursor.x} y={cursor.y} visible={cursor.visible} clicking={cursor.clicking} />

          <AnimatePresence mode="wait">
            {/* ── Persona Home Page ── */}
            {(phase === "home" || phase === "flying") && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="px-5 pt-8 pb-6 text-center">
                {/* Hero area — mimics real Persona page */}
                <p className="font-IBMPlexMono text-xs tracking-wider uppercase mb-2" style={{ color: L.textFaint }}>Persona Platform</p>
                <h3 className="text-base font-medium mb-1.5" style={{ color: L.text }}>Build AI Personas</h3>
                <p className="text-xs leading-relaxed mb-5 max-w-[220px] mx-auto" style={{ color: L.textMuted }}>Import interview transcripts to create virtual consumers with real behavior patterns.</p>

                {/* Upload CTA — prominent button like real page */}
                <div className="flex flex-col items-center gap-2 max-w-[200px] mx-auto mb-5 relative">
                  <div
                    className="w-full py-2.5 rounded flex items-center justify-center gap-2 cursor-pointer text-xs font-medium transition-colors"
                    style={{ background: L.text, color: L.bg }}
                    onClick={startImport}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    Upload PDF
                  </div>
                  <div
                    className="w-full py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    style={{ border: `1px solid ${L.border}`, color: L.textMuted }}
                  >
                    View My Personas →
                  </div>

                  {/* Flying PDF */}
                  {phase === "flying" && (
                    <motion.div
                      className="absolute px-2.5 py-1.5 flex items-center gap-1.5 shadow-md rounded z-10"
                      style={{ background: L.bgCard, border: `1px solid ${L.border}` }}
                      initial={{ x: 80, y: -50, opacity: 0, scale: 0.7, rotate: -10 }}
                      animate={{ x: 0, y: 5, opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <span className="text-xs">📄</span>
                      <span className="font-IBMPlexMono text-xs" style={{ color: L.text }}>transcript.pdf</span>
                    </motion.div>
                  )}
                </div>

                {/* Feature tiles (2×2 grid) — mimics real features section */}
                <div className="grid grid-cols-2 gap-1.5 max-w-[240px] mx-auto">
                  {[
                    { icon: "📄", label: "Import" },
                    { icon: "🎯", label: "Analyze" },
                    { icon: "💬", label: "Chat" },
                    { icon: "🔍", label: "Research" },
                  ].map((f) => (
                    <div key={f.label} className="py-2 px-2.5 rounded text-center" style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}>
                      <span className="text-xs block mb-0.5">{f.icon}</span>
                      <span className="text-xs" style={{ color: L.textMuted }}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Processing ── */}
            {phase === "processing" && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-5 space-y-5">
                <div className="flex items-center gap-2 p-2.5 rounded" style={{ background: L.bgSub }}>
                  <span className="text-sm">📄</span>
                  <span className="font-IBMPlexMono text-xs" style={{ color: L.textSub }}>transcript.pdf</span>
                  <span className="text-xs ml-auto font-IBMPlexMono" style={{ color: L.green }}>12,847 chars</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {steps.map((label, i) => (
                    <div key={i} className="flex items-center gap-1.5 flex-1">
                      <div className="w-6 h-6 rounded-full grid place-items-center text-xs font-IBMPlexMono shrink-0" style={{ background: i < procStep ? `${L.green}20` : i === procStep ? `${L.green}10` : L.bgSub, color: i <= procStep ? L.green : L.textFaint }}>
                        {i < procStep ? "✓" : i + 1}
                      </div>
                      <span className="font-IBMPlexMono text-xs" style={{ color: i <= procStep ? L.text : L.textFaint }}>{label}</span>
                      {i < steps.length - 1 && <div className="flex-1 h-px" style={{ background: i < procStep ? `${L.green}30` : L.border }} />}
                    </div>
                  ))}
                </div>
                <div className="space-y-2.5">
                  {[0.75, 0.5, 0.9, 0.4].map((w, i) => (
                    <motion.div key={i} className="h-2 rounded" style={{ background: L.bgSub, width: `${w * 100}%` }} animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Result (scrolls within fixed container) ── */}
            {phase === "result" && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="p-5 space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex gap-4 items-center">
                  <div className="w-[110px] shrink-0"><RadarChart labels={radarLabels} /></div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>Overall</span>
                      <span className="font-IBMPlexMono text-sm font-medium" style={{ color: L.green }}>68%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: L.bgSub }}>
                      <motion.div className="h-full rounded-full" style={{ background: L.green }} initial={{ width: 0 }} animate={{ width: "68%" }} transition={{ duration: 0.8, delay: 0.3 }} />
                    </div>
                    <p className="text-xs" style={{ color: L.textFaint }}>7 dimensions · 2 gaps</p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="p-3 rounded-lg space-y-2.5" style={{ background: L.greenBg, border: `1px solid ${L.greenBorder}` }}>
                  <div className="flex items-center gap-2">
                    <HippyGhostAvatar seed={1042} className="size-7 rounded-full" />
                    <div>
                      <div className="text-sm font-medium" style={{ color: L.text }}>{t("twoAgents.mockup.personaName")}</div>
                      <div className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>{t("twoAgents.mockup.personaMeta")}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {TAG_KEYS.map((key) => (
                      <span key={key} className="py-0.5 px-1.5 font-IBMPlexMono text-xs rounded" style={{ border: `1px solid ${L.greenBorder}`, color: L.green }}>{t(`twoAgents.mockup.${key}`)}</span>
                    ))}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="p-3 rounded-lg" style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">💡</span>
                    <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>{t("twoAgents.mockup.suppTitle")}</span>
                  </div>
                  <div className="space-y-2">
                    {(["suppQ1", "suppQ2"] as const).map((key, i) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="font-IBMPlexMono text-xs rounded-full w-4 h-4 grid place-items-center shrink-0 mt-0.5" style={{ background: L.border, color: L.textMuted }}>{i + 1}</span>
                        <span className="text-sm leading-relaxed" style={{ color: L.text }}>{t(`twoAgents.mockup.${key}`)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ProductFrame>
  );
}
