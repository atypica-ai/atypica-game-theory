"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import styles from "../HomeV43.module.css";
import { CHAPTERS, THREE_MODES } from "../content";

const copy = CHAPTERS[3];

/* ─── CSS-only Mockups ─── */

function SignalMockup() {
  return (
    <div className={styles.mockupSignal}>
      <svg className={styles.mockupSignalSvg} viewBox="0 0 200 100" fill="none" preserveAspectRatio="none">
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
        <text x="8" y="15" fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">XIAOHONGSHU</text>
        <text x="8" y="25" fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">TIKTOK</text>
        <text x="8" y="35" fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">TWITTER/X</text>
      </svg>
    </div>
  );
}

function DeepMockup() {
  const stages = ["Plan Study", "Interview ×8", "Analyze", "Generate Report"];
  return (
    <div className={styles.mockupDeep}>
      {stages.map((stage, i) => (
        <div key={stage} className={styles.mockupStage}>
          <span
            className={styles.mockupStageDot}
            style={{
              backgroundColor: i < 3 ? "rgba(147,197,253,0.5)" : "rgba(147,197,253,0.2)",
            }}
          />
          <span className={styles.mockupStageLabel}>{stage}</span>
          <div
            className={styles.mockupStageBar}
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
    <div className={styles.mockupLive}>
      <div className={`${styles.mockupBubble} ${styles.mockupBubbleAi}`} style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.08)" }}>
        <div className={styles.mockupLine} style={{ width: "80%" }} />
        <div className={styles.mockupLine} style={{ width: "55%", marginTop: 3 }} />
      </div>
      <div className={`${styles.mockupBubble} ${styles.mockupBubbleUser}`}>
        <div className={styles.mockupLine} style={{ width: "65%", background: "rgba(255,255,255,0.1)" }} />
      </div>
      <div className={`${styles.mockupBubble} ${styles.mockupBubbleAi}`} style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.08)" }}>
        <div className={styles.mockupLine} style={{ width: "90%" }} />
        <div className={styles.mockupLine} style={{ width: "70%", marginTop: 3 }} />
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
    <section ref={register} id={copy.id} className={styles.chapter}>
      <div className={styles.chapterDarkInner}>
      <div className={styles.chapterHeader}>
        <div className={styles.chapterNumber}>{copy.number}</div>
        <p className={styles.chapterKicker}>{copy.kicker}</p>
        <h2 className={styles.chapterTitle}>{copy.title}</h2>
        {copy.body.map((text) => (
          <p key={text} className={styles.chapterBody}>{text}</p>
        ))}
      </div>

      <motion.div
        className={styles.chapterContent}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.modesGrid}>
          {THREE_MODES.map((mode, i) => {
            const Mockup = MOCKUPS[i];
            return (
              <Link key={mode.key} href={mode.link} className={styles.modeCard}>
                <div className={styles.modeMockup}>
                  <Mockup />
                </div>
                <div className={styles.modeInfo}>
                  <div className={styles.modeBadge} style={{ color: mode.accent }}>
                    {mode.badge}
                  </div>
                  <h3 className={styles.modeTitle}>{mode.title}</h3>
                  <p className={styles.modeDesc}>{mode.description}</p>
                  <p className={styles.modeArrow}>Explore →</p>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>
      </div>
    </section>
  );
}
