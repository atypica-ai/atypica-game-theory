"use client";

import { motion } from "framer-motion";
import styles from "../HomeV43.module.css";
import { CHAPTERS } from "../content";

const copy = CHAPTERS[0];

export default function TwoWorldsSection({
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
        <h2 className={styles.chapterTitleNarrative}>{copy.title}</h2>
        {copy.body.map((text, i) => (
          <p
            key={text}
            className={styles.chapterBody}
            style={i === 0 ? { fontStyle: "italic", color: "rgba(255,255,255,0.35)", marginTop: 4 } : undefined}
          >
            {text}
          </p>
        ))}
      </div>

      <motion.div
        className={styles.chapterContent}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.twoWorldsGrid}>
          <div className={styles.worldCard}>
            <p className={styles.worldCardLabel}>[1.A] OBJECTIVE WORLD</p>
            <h3 className={styles.worldCardTitle}>Measurable</h3>
            <p className={styles.worldCardBody}>
              Quantifiable. The domain of traditional AI agents — automating tasks, processing data, executing workflows.
            </p>
          </div>
          <div className={styles.worldCard}>
            <p className={styles.worldCardLabel}>[1.B] SUBJECTIVE WORLD</p>
            <h3 className={styles.worldCardTitle} style={{ color: "#4ade80" }}>
              Emotional
            </h3>
            <p className={styles.worldCardBody}>
              Contextual. The domain of human decisions — why people choose, hesitate, trust, and act.
            </p>
          </div>
        </div>
      </motion.div>
      </div>
    </section>
  );
}
