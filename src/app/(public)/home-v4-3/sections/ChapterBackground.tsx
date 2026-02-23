"use client";

import Image from "next/image";
import styles from "../HomeV43.module.css";

type ChapterBackgroundProps = {
  prompt: string;
  light?: boolean;
};

export default function ChapterBackground({ prompt, light = false }: ChapterBackgroundProps) {
  return (
    <div className={styles.chapterBg} aria-hidden="true">
      <Image
        className={`${styles.chapterBgImage} ${light ? styles.chapterBgLight : styles.chapterBgDark}`}
        src={`/api/imagegen/dev/${encodeURIComponent(prompt)}?ratio=landscape`}
        alt=""
        fill
        sizes="100vw"
      />
    </div>
  );
}
