"use client";

import styles from "../HomeV41.module.css";
import { SCENE_COPIES } from "../content/narrative.ui";
import SignalHud from "./overlays/SignalHud";

type SystemStageProps = {
  activeScene: number;
  clock: string;
  time: number;
};

export default function SystemStage({ activeScene, clock, time }: SystemStageProps) {
  const chapterLabel = String(activeScene).padStart(2, "0");
  const activeBlock = Math.max(0, Math.min(SCENE_COPIES.length - 1, activeScene - 1));

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.brand}>ATYPICA 2.0 / UNDERSTANDING ENGINE</div>
        <div className={styles.status}>RUNNING :: CHAPTER {chapterLabel}</div>
        <div className={styles.clock}>{clock}</div>
      </header>

      <aside className={styles.rail}>
        {SCENE_COPIES.map((item, idx) => (
          <div key={item.id} className={`${styles.railItem} ${idx === activeBlock ? styles.railItemActive : ""}`}>
            {item.chapter} {item.headline}
          </div>
        ))}
      </aside>

      <SignalHud activeScene={activeScene} chapterLabel={chapterLabel} time={time} />
    </>
  );
}
