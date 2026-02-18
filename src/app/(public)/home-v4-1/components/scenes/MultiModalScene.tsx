import styles from "../../HomeV41.module.css";

const methods = ["1V1", "FOCUS", "PANEL", "VECTOR", "SIM"] as const;

export default function MultiModalScene() {
  return (
    <div className={styles.matrixVisual}>
      {methods.map((item) => (
        <div key={item}>{item}</div>
      ))}
    </div>
  );
}
