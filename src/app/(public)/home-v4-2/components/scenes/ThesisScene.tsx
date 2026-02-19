"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import styles from "../../HomeV42.module.css";
import { SCENES, THESIS_ROLES, SIMULATOR_PROMPT, RESEARCHER_PROMPT } from "../../content";

const copy = SCENES[1]; // thesis

export default function ThesisScene({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeRole, setActiveRole] = useState<0 | 1>(0);
  const role = THESIS_ROLES[activeRole];
  const accent = useMemo(() => role.accent, [role]);

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
          <div className={styles.thesisGrid}>
            {/* Simulator card */}
            <button
              type="button"
              onMouseEnter={() => setActiveRole(0)}
              onClick={() => setActiveRole(0)}
              className={`${styles.roleCard} ${activeRole === 0 ? styles.roleCardActive : ""}`}
            >
              <div className={styles.roleImageWrap}>
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(SIMULATOR_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className={styles.roleImage}
                  sizes="40vw"
                />
                <div className={styles.roleImageGradient} />
                <div className={styles.roleContent}>
                  <span className={styles.roleTag} style={{ color: THESIS_ROLES[0].accent }}>
                    {THESIS_ROLES[0].tag}
                  </span>
                  <h3 className={styles.roleTitle}>{THESIS_ROLES[0].title}</h3>
                  <p className={styles.roleDesc}>{THESIS_ROLES[0].description}</p>
                  <p className={styles.roleStat} style={{ color: `${THESIS_ROLES[0].accent}cc` }}>
                    {THESIS_ROLES[0].stat}
                  </p>
                </div>
              </div>
            </button>

            {/* Center orb */}
            <div className={styles.thesisCenter}>
              <motion.div
                className={styles.coreOrb}
                animate={{
                  boxShadow: [`0 0 0 0 ${accent}44`, `0 0 0 20px ${accent}00`],
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              >
                SWM CORE
              </motion.div>
            </div>

            {/* Researcher card */}
            <button
              type="button"
              onMouseEnter={() => setActiveRole(1)}
              onClick={() => setActiveRole(1)}
              className={`${styles.roleCard} ${activeRole === 1 ? styles.roleCardActive : ""}`}
            >
              <div className={styles.roleImageWrap}>
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(RESEARCHER_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className={styles.roleImage}
                  sizes="40vw"
                />
                <div className={styles.roleImageGradient} />
                <div className={styles.roleContent}>
                  <span className={styles.roleTag} style={{ color: THESIS_ROLES[1].accent }}>
                    {THESIS_ROLES[1].tag}
                  </span>
                  <h3 className={styles.roleTitle}>{THESIS_ROLES[1].title}</h3>
                  <p className={styles.roleDesc}>{THESIS_ROLES[1].description}</p>
                  <div className={styles.roleItems}>
                    {THESIS_ROLES[1].items.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
