"use client";

import { cn } from "@/lib/utils";
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
    <div className="fixed inset-0 z-1 pointer-events-none" aria-hidden="true">
      {ALL_BG_PROMPTS.map((prompt, idx) => {
        // Skip hero (idx 0) -- HeroSection renders its own bg
        if (idx === 0) return null;
        const light = isLightScene(idx);
        const active = idx === activeScene;
        return (
          <Image
            key={prompt}
            className={cn(
              "object-cover opacity-0 transition-opacity duration-1200 ease-in-out",
              light ? styles.bgImageLight : styles.bgImageDark,
              active && "opacity-15",
            )}
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
