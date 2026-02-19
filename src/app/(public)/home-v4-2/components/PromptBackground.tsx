"use client";

import Image from "next/image";
import styles from "../HomeV42.module.css";

type PromptBackgroundProps = {
  prompts: readonly string[];
  activeIndex: number;
};

export default function PromptBackground({ prompts, activeIndex }: PromptBackgroundProps) {
  return (
    <div className={styles.imageLayer} aria-hidden="true">
      {prompts.map((prompt, idx) => (
        <Image
          key={prompt}
          className={`${styles.bgImage} ${idx === activeIndex ? styles.bgImageActive : ""}`}
          src={`/api/imagegen/dev/${encodeURIComponent(prompt)}?ratio=landscape`}
          alt=""
          fill
          sizes="100vw"
          unoptimized
        />
      ))}
    </div>
  );
}
