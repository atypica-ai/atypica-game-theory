import styles from "../../HomeV41.module.css";

export default function SimulatorScene() {
  return (
    <div className={styles.chainVisual}>
      {["Stimulus", "Compare", "Hesitate", "Trade-off", "Choice"].map((node) => (
        <span key={node}>{node}</span>
      ))}
    </div>
  );
}
