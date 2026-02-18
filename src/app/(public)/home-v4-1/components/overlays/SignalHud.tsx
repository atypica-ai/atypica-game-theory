"use client";

import styles from "../../HomeV41.module.css";

type SignalHudProps = {
  activeScene: number;
  chapterLabel: string;
  time: number;
};

function metricValue(time: number, seed: number) {
  return Math.abs(Math.sin(time * 0.6 + seed));
}

export default function SignalHud({ activeScene, chapterLabel, time }: SignalHudProps) {
  return (
    <div className={styles.hud} aria-hidden="true">
      <div>SCENE {chapterLabel}</div>
      <div>SAMPLING {Math.round(metricValue(time, 0.3) * 100)}%</div>
      <div>FEEDBACK {Math.round(metricValue(time, 1.1) * 100)}%</div>
      <div>CONFIDENCE {Math.round(metricValue(time, 1.8) * 100)}%</div>
      <div>STATE {activeScene === 7 ? "CONVERGED" : "RUNNING"}</div>
    </div>
  );
}
