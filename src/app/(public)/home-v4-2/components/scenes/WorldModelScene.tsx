"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import styles from "../../HomeV42.module.css";
import { SCENES, SWM_NODES, SWM_PALETTE } from "../../content";

const copy = SCENES[2]; // world-model

const FEATURES = [
  "Value Systems \u2014 what matters and why",
  "Risk Preferences \u2014 how people weigh uncertainty",
  "Emotional Triggers \u2014 what moves people to act",
  "Decision Pathways \u2014 how choices actually get made",
  "Social Influence \u2014 the invisible pull of others",
  "Cognitive Frames \u2014 mental models that shape perception",
];

export default function WorldModelScene({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeNode, setActiveNode] = useState(0);
  const activeColor = useMemo(() => SWM_PALETTE[activeNode % SWM_PALETTE.length], [activeNode]);
  const node = SWM_NODES[activeNode];

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
          <div className={styles.orbitWrap}>
            {/* Orbit diagram */}
            <div className={styles.orbitDiagram}>
              <div className={styles.orbitSquare}>
                <svg className={styles.orbitSvg} viewBox="0 0 100 100" fill="none">
                  {/* Spokes */}
                  {SWM_NODES.map((n, i) => (
                    <g key={n.key}>
                      <line
                        x1="50"
                        y1="50"
                        x2={n.x}
                        y2={n.y}
                        stroke="rgba(17,17,17,0.12)"
                        strokeWidth="0.35"
                      />
                      {i === activeNode && (
                        <line
                          x1="50"
                          y1="50"
                          x2={n.x}
                          y2={n.y}
                          stroke={activeColor}
                          strokeWidth="0.55"
                          strokeOpacity={0.6}
                        />
                      )}
                    </g>
                  ))}
                  {/* Orbit rings */}
                  <circle cx="50" cy="50" r="18" stroke="rgba(17,17,17,0.14)" strokeWidth="0.4" />
                  <circle cx="50" cy="50" r="31" stroke="rgba(17,17,17,0.1)" strokeWidth="0.35" />
                  <circle cx="50" cy="50" r="42" stroke="rgba(17,17,17,0.07)" strokeWidth="0.35" />
                </svg>

                {/* Center core */}
                <motion.div
                  className={styles.orbitCore}
                  animate={{
                    boxShadow: [`0 0 0 0 ${activeColor}44`, `0 0 0 14px ${activeColor}00`],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                >
                  <span style={{ color: activeColor }}>SWM</span>
                </motion.div>

                {/* Node buttons */}
                {SWM_NODES.map((n, i) => (
                  <button
                    key={n.key}
                    type="button"
                    onMouseEnter={() => setActiveNode(i)}
                    onClick={() => setActiveNode(i)}
                    className={`${styles.orbitNode} ${i === activeNode ? styles.orbitNodeActive : ""}`}
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className={styles.orbitPanel}>
              <p className={styles.orbitPanelLabel}>Model Dimensions</p>
              <h3 className={styles.orbitPanelTitle}>{node.label}</h3>
              <p className={styles.orbitPanelDesc}>{node.description}</p>

              <div className={styles.featureList}>
                {FEATURES.map((feature, index) => (
                  <div
                    key={feature}
                    className={`${styles.featureItem} ${index === activeNode ? styles.featureItemActive : ""}`}
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <div className={styles.filingBadge}>
                <span className={styles.filingDot} style={{ backgroundColor: activeColor }} />
                Foundation Model Filing in Progress
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
