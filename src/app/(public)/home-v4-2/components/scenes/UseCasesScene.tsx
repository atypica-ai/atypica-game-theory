"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "../../HomeV42.module.css";
import { SCENES, USE_CASES, CASE_PROMPTS } from "../../content";

const copy = SCENES[5]; // use-cases

export default function UseCasesScene({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = USE_CASES[activeIdx];

  const activeImage = useMemo(() => {
    if (activeIdx < 3) return CASE_PROMPTS[0];
    if (activeIdx < 6) return CASE_PROMPTS[1];
    return CASE_PROMPTS[2];
  }, [activeIdx]);

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
        </div>

        <div className={styles.sceneInteractive}>
          <div className={styles.casesWrap}>
            <div className={styles.caseGrid}>
              {USE_CASES.map((c, i) => (
                <button
                  key={c.key}
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => setActiveIdx(i)}
                  className={`${styles.caseCard} ${i === activeIdx ? styles.caseCardActive : ""}`}
                >
                  <span className={styles.caseIndex}>{String(i + 1).padStart(2, "0")}</span>
                  <p className={styles.caseCardTitle}>{c.title}</p>
                </button>
              ))}
            </div>

            <div className={styles.caseDisplay}>
              <div className={styles.caseImageWrap}>
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(activeImage)}?ratio=landscape`}
                  alt=""
                  fill
                  className={styles.caseDisplayImage}
                  sizes="45vw"
                />
                <div className={styles.caseOverlay} />
                <div className={styles.caseContent}>
                  <span className={styles.caseContentBadge}>Active Scenario</span>
                  <h3 className={styles.caseContentTitle}>{active.title}</h3>
                  <p className={styles.caseContentDesc}>{active.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
