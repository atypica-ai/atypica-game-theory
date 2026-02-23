"use client";

import Image from "next/image";
import styles from "../HomeV43.module.css";
import { ALL_BG_PROMPTS } from "../content";

/**
 * Scene 0 = Hero (handled by HeroSection itself, skip here)
 * Scenes 5-6 correspond to light-background chapters (Data Assets, Use Cases).
 */
function isLightScene(index: number) {
  return index === 5 || index === 6;
}

type ScrollBackgroundProps = {
  activeScene: number;
};

export default function ScrollBackground({ activeScene }: ScrollBackgroundProps) {
  return (
    <div className={styles.bgLayer} aria-hidden="true">
      {ALL_BG_PROMPTS.map((prompt, idx) => {
        // Skip hero (idx 0) — HeroSection renders its own bg
        if (idx === 0) return null;
        const light = isLightScene(idx);
        const active = idx === activeScene;
        return (
          <Image
            key={prompt}
            className={[
              styles.bgImage,
              light ? styles.bgImageLight : styles.bgImageDark,
              active ? styles.bgImageActive : "",
            ].join(" ")}
            src={`/api/imagegen/dev/${encodeURIComponent(prompt)}?ratio=landscape`}
            alt=""
            fill
            sizes="100vw"
            priority={idx === 0}
          />
        );
      })}
    </div>
  );
}
