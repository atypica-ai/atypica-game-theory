"use client";

import styles from "../HomeV43.module.css";
import { CLIENTS } from "../content";

export default function LogoWall() {
  // Repeat enough times to fill well beyond viewport for seamless loop
  const repeated = [...CLIENTS, ...CLIENTS, ...CLIENTS, ...CLIENTS];

  return (
    <div className={styles.logoWall}>
      <div className={styles.logoTrack}>
        {repeated.map((client, i) => (
          <span key={`${client}-${i}`} className={styles.logoItem}>
            {client}
          </span>
        ))}
      </div>
    </div>
  );
}
