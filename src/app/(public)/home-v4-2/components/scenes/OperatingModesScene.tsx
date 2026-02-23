"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "../../HomeV42.module.css";
import { SCENES, OPERATING_MODES, MODE_PROMPTS } from "../../content";

const copy = SCENES[3]; // operating-modes

export default function OperatingModesScene({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = OPERATING_MODES[activeIdx];

  return (
    <section
      ref={register}
      className={`${styles.scene} ${styles.sceneB}`}
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
          <div className={styles.modesGrid}>
            <div className={styles.modeNav}>
              {OPERATING_MODES.map((mode, idx) => (
                <button
                  key={mode.key}
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => setActiveIdx(idx)}
                  className={`${styles.modeTab} ${idx === activeIdx ? styles.modeTabActive : ""}`}
                >
                  <span className={styles.modeTabIndex}>
                    {String(idx + 1).padStart(2, "0")}
                    <span
                      className={styles.modeTabDot}
                      style={{ backgroundColor: mode.accent }}
                    />
                  </span>
                  <span className={styles.modeTabTitle}>{mode.title}</span>
                  <span className={styles.modeTabHint}>{mode.hint}</span>
                </button>
              ))}
            </div>

            <div className={styles.modeDisplay}>
              <div className={styles.modeImageWrap}>
                {MODE_PROMPTS.map((prompt, i) => (
                  <Image
                    key={prompt}
                    src={`/api/imagegen/dev/${encodeURIComponent(prompt)}?ratio=landscape`}
                    alt=""
                    fill
                    className={styles.modeImage}
                    sizes="60vw"
                    priority={i === 0}
                    style={{
                      opacity: i === activeIdx ? 1 : 0,
                      transition: "opacity 0.3s ease-in-out",
                    }}
                  />
                ))}
                <div className={styles.modeOverlay} />
                <div className={styles.modeContent}>
                  <span className={styles.modeBadge} style={{ color: active.accent }}>
                    {active.badge}
                  </span>
                  <h3 className={styles.modeContentTitle}>{active.title}</h3>
                  <p className={styles.modeContentDesc}>{active.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
