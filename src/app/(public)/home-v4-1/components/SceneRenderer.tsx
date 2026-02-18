import type { SceneCopy } from "../content/narrative.ui";
import type { LayoutType } from "../content/scene-config";
import styles from "../HomeV41.module.css";
import MultiModalScene from "./scenes/MultiModalScene";
import ResearcherScene from "./scenes/ResearcherScene";
import SimulatorScene from "./scenes/SimulatorScene";
import TwoAgentsScene from "./scenes/TwoAgentsScene";
import UseCasesScene from "./scenes/UseCasesScene";
import WorldModelScene from "./scenes/WorldModelScene";

type SceneRendererProps = {
  layoutType: LayoutType;
  copy: SceneCopy;
  index: number;
  register: (el: HTMLElement | null) => void;
};

function SceneVisual({ type }: { type: LayoutType }) {
  if (type === "dual-track") return <TwoAgentsScene />;
  if (type === "decision-timeline") return <SimulatorScene />;
  if (type === "question-rings") return <ResearcherScene />;
  if (type === "param-topology") return <WorldModelScene />;
  if (type === "routing-matrix") return <MultiModalScene />;
  return <UseCasesScene />;
}

export default function SceneRenderer({ layoutType, copy, index, register }: SceneRendererProps) {
  return (
    <section
      className={`${styles.scene} ${index % 2 === 0 ? styles.sceneA : styles.sceneB}`}
      ref={register}
      data-scene={copy.id}
    >
      <div className={styles.sceneIndex}>{copy.chapter}</div>
      <div className={styles.sceneBody}>
        <h3 className={styles.sceneTitle}>{copy.headline}</h3>
        {copy.body.map((paragraph) => (
          <p key={paragraph} className={styles.sceneDetail}>
            {paragraph}
          </p>
        ))}
        {copy.bullets?.length ? (
          <div className={styles.signalRow}>
            {copy.bullets.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
        <SceneVisual type={layoutType} />
      </div>
    </section>
  );
}
