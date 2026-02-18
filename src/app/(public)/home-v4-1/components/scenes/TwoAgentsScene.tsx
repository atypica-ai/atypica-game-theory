import styles from "../../HomeV41.module.css";

export default function TwoAgentsScene() {
  return (
    <div className={styles.trackVisual}>
      <div className={styles.trackCol}>
        <h4>Worker Agent</h4>
        <div className={styles.trackLine}>
          <span />
        </div>
        <p>Output-first path: task execution, production acceleration, operational throughput.</p>
      </div>
      <div className={styles.trackCol}>
        <h4>Understanding Agent</h4>
        <div className={`${styles.trackLine} ${styles.trackLineAdaptive}`}>
          <span />
        </div>
        <p>Reasoning-first path: motive modeling, preference mapping, and decision logic inference.</p>
      </div>
    </div>
  );
}
