"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./HomeV43.module.css";
import { CHAPTERS } from "./content";
import HeroSection from "./sections/HeroSection";
import TwoWorldsSection from "./sections/TwoWorldsSection";
import TwoAgentsSection from "./sections/TwoAgentsSection";
import WorldModelSection from "./sections/WorldModelSection";
import ThreeModesSection from "./sections/ThreeModesSection";
import DataAssetsSection from "./sections/DataAssetsSection";
import UseCasesSection from "./sections/UseCasesSection";
import ClosingSection from "./sections/ClosingSection";

const SECTION_COMPONENTS = [
  TwoWorldsSection,
  TwoAgentsSection,
  WorldModelSection,
  ThreeModesSection,
  DataAssetsSection,
  UseCasesSection,
];

export default function HomeV43Page() {
  const pageRef = useRef<HTMLElement>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeChapter, setActiveChapter] = useState(-1);

  // Fix DefaultLayout overflow-y-auto creating secondary scroll context
  useEffect(() => {
    let target: HTMLElement | null = null;
    let el = pageRef.current?.parentElement ?? null;
    while (el && el !== document.documentElement) {
      const style = getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        target = el;
        target.style.overflow = "visible";
        break;
      }
      el = el.parentElement;
    }
    return () => {
      if (target) target.style.overflow = "";
    };
  }, []);

  // IntersectionObserver for sticky nav
  useEffect(() => {
    const ratioMap = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = chapterRefs.current.indexOf(entry.target as HTMLElement);
          if (idx === -1) continue;
          if (entry.isIntersecting) {
            ratioMap.set(idx, entry.intersectionRatio);
          } else {
            ratioMap.delete(idx);
          }
        }

        let bestIdx = -1;
        let bestRatio = 0;
        for (const [idx, ratio] of ratioMap) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }
        setActiveChapter(bestIdx);
      },
      {
        rootMargin: "-30% 0px -30% 0px",
        threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.75, 1],
      },
    );

    for (const el of chapterRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const registerChapter = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      chapterRefs.current[index] = el;
    },
    [],
  );

  const scrollToChapter = useCallback((index: number) => {
    const el = chapterRefs.current[index];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      {/* Sticky side navigation */}
      <nav className={styles.sideNav}>
        {CHAPTERS.map((ch, i) => (
          <button
            key={ch.id}
            type="button"
            className={`${styles.navItem} ${i === activeChapter ? styles.navItemActive : ""}`}
            onClick={() => scrollToChapter(i)}
          >
            <span className={styles.navNumber}>{ch.number}</span>
            <span className={styles.navLabel}>{ch.navLabel}</span>
          </button>
        ))}
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* Chapters 01-06 */}
      {SECTION_COMPONENTS.map((Component, i) => (
        <Component key={CHAPTERS[i].id} register={registerChapter(i)} />
      ))}

      {/* Closing */}
      <ClosingSection />
    </main>
  );
}
