"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import styles from "../HomeV43.module.css";
import {
  CHAPTERS,
  WORLD_MODEL_LAYERS,
  WORLD_MODEL_DIMENSIONS,
  DIMENSION_PALETTE,
} from "../content";

const copy = CHAPTERS[2];

const LAYER_COLORS = ["#4ade80", "#93c5fd", "#f59e0b", "#a78bfa"] as const;

export default function WorldModelSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeNode, setActiveNode] = useState(0);
  const [activeLayer, setActiveLayer] = useState(-1);

  const activeColor = useMemo(
    () => DIMENSION_PALETTE[activeNode % DIMENSION_PALETTE.length],
    [activeNode],
  );
  const node = WORLD_MODEL_DIMENSIONS[activeNode];

  // Determine what to show in right panel: dimension or layer
  const showingLayer = activeLayer >= 0;
  const displayLayer = showingLayer ? WORLD_MODEL_LAYERS[activeLayer] : null;

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
        <div className={styles.worldModelGrid}>
          {/* Orbit diagram */}
          <div className={styles.orbitDiagram}>
            <div className={styles.orbitSquare}>
              <svg className={styles.orbitSvg} viewBox="0 0 100 100" fill="none">
                {/* 4 concentric layer rings */}
                {WORLD_MODEL_LAYERS.map((layer, i) => (
                  <circle
                    key={layer.key}
                    cx="50"
                    cy="50"
                    r={layer.radius}
                    stroke={activeLayer === i ? LAYER_COLORS[i] : "rgba(255,255,255,0.08)"}
                    strokeWidth={activeLayer === i ? "0.6" : "0.35"}
                    fill="none"
                    style={{ cursor: "pointer", transition: "stroke 200ms" }}
                    onMouseEnter={() => setActiveLayer(i)}
                    onMouseLeave={() => setActiveLayer(-1)}
                  />
                ))}

                {/* Spokes to dimension nodes */}
                {WORLD_MODEL_DIMENSIONS.map((n, i) => (
                  <g key={n.key}>
                    <line
                      x1="50"
                      y1="50"
                      x2={n.x}
                      y2={n.y}
                      stroke={i === activeNode ? activeColor : "rgba(255,255,255,0.06)"}
                      strokeWidth={i === activeNode ? "0.5" : "0.3"}
                      strokeOpacity={i === activeNode ? 0.6 : 1}
                    />
                  </g>
                ))}
              </svg>

              {/* Layer labels positioned on rings */}
              {WORLD_MODEL_LAYERS.map((layer, i) => {
                // Position labels at ~45 degrees on each ring
                const angle = -45 * (Math.PI / 180);
                const lx = 50 + layer.radius * Math.cos(angle);
                const ly = 50 + layer.radius * Math.sin(angle);
                return (
                  <span
                    key={layer.key}
                    className={styles.orbitLayerLabel}
                    style={{
                      left: `${lx}%`,
                      top: `${ly}%`,
                      color: activeLayer === i ? LAYER_COLORS[i] : undefined,
                    }}
                    onMouseEnter={() => setActiveLayer(i)}
                    onMouseLeave={() => setActiveLayer(-1)}
                  >
                    {layer.label}
                  </span>
                );
              })}

              {/* Center core */}
              <motion.div
                className={styles.orbitCore}
                animate={{
                  boxShadow: [`0 0 0 0 ${activeColor}44`, `0 0 0 12px ${activeColor}00`],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              >
                <span style={{ color: activeColor }}>SWM</span>
              </motion.div>

              {/* Dimension nodes */}
              {WORLD_MODEL_DIMENSIONS.map((n, i) => (
                <button
                  key={n.key}
                  type="button"
                  className={`${styles.orbitNode} ${i === activeNode ? styles.orbitNodeActive : ""}`}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  onMouseEnter={() => {
                    setActiveNode(i);
                    setActiveLayer(-1);
                  }}
                  onClick={() => setActiveNode(i)}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className={styles.orbitPanel}>
            {showingLayer && displayLayer ? (
              <>
                <p className={styles.panelLabel}>Model Layer</p>
                <h3 className={styles.panelTitle} style={{ color: LAYER_COLORS[activeLayer] }}>
                  {displayLayer.label}
                </h3>
                <p className={styles.panelDesc}>{displayLayer.description}</p>
                <p
                  style={{
                    marginTop: 12,
                    fontFamily: '"IBMPlexMono", "SF Mono", monospace',
                    fontSize: 11,
                    color: LAYER_COLORS[activeLayer],
                  }}
                >
                  → {displayLayer.product}
                </p>
              </>
            ) : (
              <>
                <p className={styles.panelLabel}>Dimension</p>
                <h3 className={styles.panelTitle} style={{ color: activeColor }}>
                  {node.label}
                </h3>
                <p className={styles.panelDesc}>{node.description}</p>
              </>
            )}

            {/* Layer list */}
            <div className={styles.layerList}>
              {WORLD_MODEL_LAYERS.map((layer, i) => (
                <button
                  key={layer.key}
                  type="button"
                  className={`${styles.layerItem} ${activeLayer === i ? styles.layerItemActive : ""}`}
                  onMouseEnter={() => setActiveLayer(i)}
                  onMouseLeave={() => setActiveLayer(-1)}
                >
                  <span className={styles.layerDot} style={{ backgroundColor: LAYER_COLORS[i] }} />
                  <span>{layer.label}</span>
                  <span className={styles.layerProduct}>{layer.product}</span>
                </button>
              ))}
            </div>

            {/* Dimension list */}
            <div className={styles.layerList} style={{ marginTop: 16 }}>
              <p className={styles.panelLabel}>6 Dimensions</p>
              {WORLD_MODEL_DIMENSIONS.map((dim, i) => (
                <button
                  key={dim.key}
                  type="button"
                  className={`${styles.layerItem} ${activeNode === i && !showingLayer ? styles.layerItemActive : ""}`}
                  onMouseEnter={() => {
                    setActiveNode(i);
                    setActiveLayer(-1);
                  }}
                >
                  <span
                    className={styles.layerDot}
                    style={{ backgroundColor: DIMENSION_PALETTE[i] }}
                  />
                  <span>{dim.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </section>
  );
}
