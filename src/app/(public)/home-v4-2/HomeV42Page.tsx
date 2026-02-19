"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./HomeV42.module.css";
import { SCENES, ALL_PROMPTS } from "./content";
import { useSceneProgress } from "./hooks/useSceneProgress";
import { useAutoMotion } from "./hooks/useAutoMotion";
import PixelField from "./components/PixelField";
import PromptBackground from "./components/PromptBackground";
import SystemStage from "./components/SystemStage";
import HeroScene from "./components/scenes/HeroScene";
import ManifestoScene from "./components/scenes/ManifestoScene";
import ThesisScene from "./components/scenes/ThesisScene";
import WorldModelScene from "./components/scenes/WorldModelScene";
import OperatingModesScene from "./components/scenes/OperatingModesScene";
import UnderstandingStackScene from "./components/scenes/UnderstandingStackScene";
import UseCasesScene from "./components/scenes/UseCasesScene";
import ClosingScene from "./components/scenes/ClosingScene";

export default function HomeV42Page() {
  // hero + scenes + closing
  const sceneCount = SCENES.length + 2;
  const { activeScene, registerScene } = useSceneProgress(sceneCount);
  const { time } = useAutoMotion();
  const [clock, setClock] = useState("");
  const pageRef = useRef<HTMLElement>(null);

  // Neutralize DefaultLayout's overflow-y-auto wrapper — it creates a
  // secondary scroll context that causes "magnetic sticking" on macOS trackpad.
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

  useEffect(() => {
    const updateClock = () => setClock(new Date().toISOString().slice(11, 19));
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const clampedScene = useMemo(
    () => Math.max(0, Math.min(sceneCount - 1, activeScene)),
    [activeScene, sceneCount],
  );

  return (
    <main ref={pageRef} className={styles.page}>
      {/* Fixed overlays */}
      <PixelField activeScene={clampedScene} />
      <PromptBackground prompts={ALL_PROMPTS} activeIndex={clampedScene} />
      <SystemStage activeScene={clampedScene} clock={clock} time={time} />

      {/* Scene 00: Hero */}
      <HeroScene register={registerScene(0)} />

      {/* Scene 01: Manifesto */}
      <ManifestoScene register={registerScene(1)} />

      {/* Scene 02: Thesis */}
      <ThesisScene register={registerScene(2)} />

      {/* Scene 03: World Model */}
      <WorldModelScene register={registerScene(3)} />

      {/* Scene 04: Operating Modes */}
      <OperatingModesScene register={registerScene(4)} />

      {/* Scene 05: Understanding Stack */}
      <UnderstandingStackScene register={registerScene(5)} />

      {/* Scene 06: Use Cases */}
      <UseCasesScene register={registerScene(6)} />

      {/* Scene 07: Closing */}
      <ClosingScene register={registerScene(7)} />
    </main>
  );
}
