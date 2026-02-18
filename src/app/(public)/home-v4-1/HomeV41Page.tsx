"use client";

import styles from "./HomeV41.module.css";
import SceneRenderer from "./components/SceneRenderer";
import SystemStage from "./components/SystemStage";
import PixelFieldCanvas from "./components/overlays/PixelFieldCanvas";
import PromptBackground from "./components/overlays/PromptBackground";
import { CLOSING, HERO, SCENE_COPIES } from "./content/narrative.ui";
import { CLOSING_PROMPT, HERO_PROMPT, SCENE_CONFIG } from "./content/scene-config";
import { useAutoMotion } from "./hooks/useAutoMotion";
import { useSceneProgress } from "./hooks/useSceneProgress";
import { useEffect, useMemo, useState } from "react";

const ALL_PROMPTS = [HERO_PROMPT, ...SCENE_CONFIG.map((scene) => scene.prompt), CLOSING_PROMPT] as const;

export default function HomeV41Page() {
  const sceneCount = SCENE_CONFIG.length + 2;
  const { activeScene, registerScene } = useSceneProgress(sceneCount);
  const { time } = useAutoMotion();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const updateClock = () => setClock(new Date().toISOString().slice(11, 19));
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const clampedScene = useMemo(() => Math.max(0, Math.min(sceneCount - 1, activeScene)), [activeScene, sceneCount]);

  return (
    <main className={styles.page}>
      <PixelFieldCanvas activeScene={clampedScene} />
      <PromptBackground prompts={ALL_PROMPTS} activeIndex={clampedScene} />
      <SystemStage activeScene={clampedScene} clock={clock} time={time} />

      <section className={`${styles.scene} ${styles.hero}`} ref={registerScene(0)}>
        <div className={styles.sceneIndex}>00</div>
        <div className={styles.sceneBody}>
          <p className={styles.kicker}>A CONTINUOUS VISUAL SYSTEM FOR HUMAN UNDERSTANDING</p>
          <h1 className={styles.title}>{HERO.title}</h1>
          <h2 className={styles.subtitle}>{HERO.subtitle}</h2>
          {HERO.body.map((paragraph) => (
            <p key={paragraph} className={styles.heroText}>
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {SCENE_CONFIG.map((scene, idx) => (
        <SceneRenderer
          key={scene.id}
          layoutType={scene.layoutType}
          copy={SCENE_COPIES[idx]}
          index={idx}
          register={registerScene(idx + 1)}
        />
      ))}

      <section className={`${styles.scene} ${styles.outro}`} ref={registerScene(sceneCount - 1)}>
        <div className={styles.sceneIndex}>{CLOSING.chapter}</div>
        <div className={styles.sceneBody}>
          <p className={styles.kicker}>{CLOSING.kicker}</p>
          <h3 className={styles.outroTitle}>{CLOSING.headline}</h3>
          <p className={styles.outroBody}>{CLOSING.body}</p>
        </div>
      </section>
    </main>
  );
}
