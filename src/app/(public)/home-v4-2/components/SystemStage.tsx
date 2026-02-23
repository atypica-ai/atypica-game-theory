"use client";

import styles from "../HomeV42.module.css";
import { SCENES } from "../content";

type SystemStageProps = {
  activeScene: number;
  clock: string;
  time: number;
};

function metricValue(time: number, seed: number) {
  return Math.abs(Math.sin(time * 0.6 + seed));
}

export default function SystemStage({ activeScene, clock, time }: SystemStageProps) {
  const chapterLabel = String(activeScene).padStart(2, "0");
  const isDark = activeScene === 0;

  return (
    <>
      <header className={`${styles.topbar} ${isDark ? styles.topbarDark : ""}`}>
        <div className={styles.brand}>ATYPICA 2.0 / UNDERSTANDING ENGINE</div>
        <div className={styles.status}>RUNNING :: CHAPTER {chapterLabel}</div>
        <div className={styles.clock}>{clock}</div>
      </header>

      <aside className={styles.rail}>
        {SCENES.map((item, idx) => (
          <div
            key={item.id}
            className={`${styles.railItem} ${idx === activeScene - 1 ? styles.railItemActive : ""}`}
          >
            {item.chapter} {item.railLabel}
          </div>
        ))}
      </aside>

      <div className={styles.hud} aria-hidden="true">
        <div>
          SCENE <span className={styles.stat}>{chapterLabel}</span>
        </div>
        <div>
          SAMPLING <span className={styles.stat}>{Math.round(metricValue(time, 0.3) * 100)}%</span>
        </div>
        <div>
          FEEDBACK <span className={styles.stat}>{Math.round(metricValue(time, 1.1) * 100)}%</span>
        </div>
        <div>
          CONFIDENCE{" "}
          <span className={styles.stat}>{Math.round(metricValue(time, 1.8) * 100)}%</span>
        </div>
        <div>STATE {activeScene >= SCENES.length + 1 ? "CONVERGED" : "RUNNING"}</div>
      </div>
    </>
  );
}
