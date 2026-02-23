"use client";

import Image from "next/image";
import { motion, useSpring, useTransform } from "framer-motion";
import { useCallback, useState } from "react";
import styles from "../../HomeV42.module.css";
import { SCENES, OBJECTIVE_PROMPT, SUBJECTIVE_PROMPT } from "../../content";

const copy = SCENES[0]; // manifesto

export default function ManifestoScene({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [splitX, setSplitX] = useState(52);
  const smoothSplitX = useSpring(splitX, { stiffness: 140, damping: 26 });
  const splitClipPath = useTransform(smoothSplitX, (v) => `inset(0 0 0 ${v}%)`);
  const splitLeft = useTransform(smoothSplitX, (v) => `${v}%`);

  const handleMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = ((event.clientX - rect.left) / rect.width) * 100;
    setSplitX(Math.max(16, Math.min(84, ratio)));
  }, []);

  return (
    <section
      ref={register}
      className={`${styles.scene} ${styles.sceneA}`}
    >
      <div className={styles.sceneIndex}>{copy.chapter}</div>
      <div>
        <div className={styles.sceneHeader}>
          <p className={styles.kicker}>{copy.kicker}</p>
          <h2 className={styles.sceneTitleLong}>{copy.title}</h2>
          {copy.body.map((text) => (
            <p key={text} className={styles.sceneDetail}>{text}</p>
          ))}
        </div>

        <div className={styles.sceneInteractive}>
          {/* Desktop: mouse-driven split */}
          <div className={styles.splitContainer} onMouseMove={handleMove}>
            {/* Left image: Objective */}
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(OBJECTIVE_PROMPT)}?ratio=landscape`}
              alt=""
              fill
              className={styles.splitImage}
              sizes="100vw"
            />
            <div
              className={styles.splitOverlay}
              style={{ background: "linear-gradient(to right, rgba(0,0,0,0.3), transparent, rgba(0,0,0,0.3))" }}
            />

            {/* Right image: Subjective (clips in from the left) */}
            <motion.div className={styles.splitOverlay} style={{ clipPath: splitClipPath }}>
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(SUBJECTIVE_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className={styles.splitImage}
                sizes="100vw"
              />
              <div
                className={styles.splitOverlay}
                style={{ background: "linear-gradient(to right, rgba(0,0,0,0.2), transparent, rgba(0,0,0,0.25))" }}
              />
            </motion.div>

            {/* Green divider line */}
            <motion.div className={styles.splitDivider} style={{ left: splitLeft }} />

            {/* Labels */}
            <div className={styles.splitLabels}>
              <span className={styles.splitLabelLeft}>The Objective World</span>
              <span className={styles.splitLabelRight}>The Subjective World</span>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className={styles.splitMobile}>
            <div className={styles.splitMobileCard}>
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(OBJECTIVE_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className={styles.splitImage}
                sizes="100vw"
              />
              <div
                className={styles.splitOverlay}
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}
              />
              <span className={styles.splitMobileLabel} style={{ color: "#fff" }}>
                The Objective World
              </span>
            </div>
            <div className={styles.splitMobileCard}>
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(SUBJECTIVE_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className={styles.splitImage}
                sizes="100vw"
              />
              <div
                className={styles.splitOverlay}
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}
              />
              <span className={styles.splitMobileLabel} style={{ color: "#4ade80" }}>
                The Subjective World
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
