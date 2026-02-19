"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import styles from "../../HomeV42.module.css";
import {
  SCENES,
  RESEARCH_METHODS,
  INPUT_MODALITIES,
  METHOD_ACCENTS,
  MODALITY_ACCENTS,
  VIRTUAL_SAMPLES,
  SAMPLE_PROMPTS,
} from "../../content";

const copy = SCENES[4]; // understanding-stack

const PULSE_WORDS = ["Signal Sampling", "Semantic Alignment", "Behavior Modeling", "Insight Output"];

export default function UnderstandingStackScene({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeMethod, setActiveMethod] = useState(0);
  const [activeModality, setActiveModality] = useState(0);
  const [activeSample, setActiveSample] = useState(0);

  const activeAccent = useMemo(() => {
    const m = METHOD_ACCENTS[activeMethod % METHOD_ACCENTS.length];
    const n = MODALITY_ACCENTS[activeModality % MODALITY_ACCENTS.length];
    return activeMethod >= activeModality ? m : n;
  }, [activeMethod, activeModality]);

  const sample = VIRTUAL_SAMPLES[activeSample];

  return (
    <section
      ref={register}
      className={`${styles.scene} ${styles.sceneA}`}
    >
      <div className={styles.sceneIndex}>{copy.chapter}</div>
      <div>
        <div className={styles.sceneHeader}>
          <p className={styles.kicker}>{copy.kicker}</p>
          <h2 className={styles.sceneTitle}>{copy.title}</h2>
          {copy.body.map((text) => (
            <p key={text} className={styles.sceneDetail}>{text}</p>
          ))}
        </div>

        <div className={styles.sceneInteractive}>
          {/* Methods × Modalities */}
          <div className={styles.methodsRow}>
            <div>
              <p className={styles.listLabel}>Understanding Methods</p>
              <div className={styles.methodList}>
                {RESEARCH_METHODS.map((method, i) => (
                  <button
                    key={method}
                    type="button"
                    onMouseEnter={() => setActiveMethod(i)}
                    onClick={() => setActiveMethod(i)}
                    className={`${styles.methodItem} ${i === activeMethod ? styles.methodItemActive : ""}`}
                  >
                    <span className={styles.itemIndex}>{String(i + 1).padStart(2, "0")}</span>
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.stackCenter}>
              <motion.div
                className={styles.stackRing}
                animate={{ rotate: 360 }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                style={{ borderColor: `${activeAccent}66` }}
              />
              <motion.div
                className={styles.stackRingInner}
                animate={{ rotate: -360 }}
                transition={{ duration: 20, ease: "linear", repeat: Infinity }}
                style={{ borderColor: `${activeAccent}77` }}
              />
              <motion.div
                className={styles.stackCore}
                animate={{ boxShadow: [`0 0 0 0 ${activeAccent}55`, `0 0 0 16px ${activeAccent}00`] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                style={{ backgroundColor: activeAccent }}
              />
              <div className={styles.pulseWords}>
                {PULSE_WORDS.map((word, idx) => (
                  <motion.span
                    key={word}
                    className={styles.pulseWord}
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ delay: idx * 0.18, duration: 1.8, repeat: Infinity }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
            </div>

            <div>
              <p className={styles.listLabel}>Input Modalities</p>
              <div className={styles.modalityList}>
                {INPUT_MODALITIES.map((modality, i) => (
                  <button
                    key={modality}
                    type="button"
                    onMouseEnter={() => setActiveModality(i)}
                    onClick={() => setActiveModality(i)}
                    className={`${styles.methodItem} ${i === activeModality ? styles.methodItemActive : ""}`}
                  >
                    <span className={styles.itemIndex}>{String(i + 1).padStart(2, "0")}</span>
                    {modality}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Virtual Samples */}
          <div className={styles.samplesRow}>
            <div>
              <p className={styles.listLabel}>The Engine</p>
              <div className={styles.sampleNav}>
                {VIRTUAL_SAMPLES.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    onMouseEnter={() => setActiveSample(i)}
                    onClick={() => setActiveSample(i)}
                    className={`${styles.sampleTab} ${i === activeSample ? styles.sampleTabActive : ""}`}
                  >
                    <span className={styles.sampleTabTitle}>{s.title}</span>
                    <span className={styles.sampleTabStat} style={{ color: s.accent }}>{s.stat}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.sampleDisplay}>
              <div className={styles.sampleImageWrap}>
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(SAMPLE_PROMPTS[activeSample])}?ratio=landscape`}
                  alt=""
                  fill
                  className={styles.sampleImage}
                  sizes="60vw"
                />
                <div className={styles.sampleOverlay} />
                <div className={styles.sampleContent}>
                  <span className={styles.sampleContentTitle}>{sample.title}</span>
                  <p className={styles.sampleContentDesc}>{sample.description}</p>
                  <p className={styles.sampleContentStat} style={{ color: `${sample.accent}cc` }}>
                    {sample.stat}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
