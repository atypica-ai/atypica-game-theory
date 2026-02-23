"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import styles from "./HomeV43.module.css";
import { CHAPTERS } from "./content";
import ScrollBackground from "./sections/ScrollBackground";
import HeroSection from "./sections/HeroSection";
import LogoWall from "./sections/LogoWall";
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

  // Background scene tracking: hero(0), chapters(1-6), closing(7)
  const sceneRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeScene, setActiveScene] = useState(0);

  // Nav chapter tracking: chapters only (0-5)
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeChapter, setActiveChapter] = useState(-1);

  // Fix DefaultLayout overflow-y-auto
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

  // Observer for background scene switching
  useEffect(() => {
    const ratioMap = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = sceneRefs.current.indexOf(entry.target as HTMLElement);
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
        if (bestIdx >= 0) startTransition(() => setActiveScene(bestIdx));
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    for (const el of sceneRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // Observer for nav chapter highlighting
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
        startTransition(() => setActiveChapter(bestIdx));
      },
      { rootMargin: "-20% 0px -20% 0px", threshold: [0, 0.05, 0.1, 0.2, 0.3, 0.5, 1] },
    );
    for (const el of chapterRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const registerScene = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      sceneRefs.current[index] = el;
    },
    [],
  );

  const registerChapter = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      chapterRefs.current[index] = el;
      // Also register as scene (chapters are scenes 1-6)
      sceneRefs.current[index + 1] = el;
    },
    [],
  );

  const scrollToChapter = useCallback((chapterIndex: number) => {
    const el = chapterRefs.current[chapterIndex];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      {/* Fixed scroll background */}
      <ScrollBackground activeScene={activeScene} />

      {/* Scene 0: Hero — full-width centered */}
      <HeroSection register={registerScene(0)} />

      {/* Chapters area: nav + content */}
      <div className={styles.chaptersArea}>
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

        {/* Chapters 01-06 */}
        <div className={styles.chaptersContent}>
          {SECTION_COMPONENTS.map((Component, i) => (
            <Component key={CHAPTERS[i].id} register={registerChapter(i)} />
          ))}
        </div>
      </div>

      {/* Logo wall — between chapters and closing */}
      <LogoWall />

      {/* Closing — full-width, like Hero */}
      <ClosingSection register={registerScene(7)} />
    </main>
  );
}
