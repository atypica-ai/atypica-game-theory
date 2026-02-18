import styles from "../../HomeV41.module.css";

export default function ResearcherScene() {
  return (
    <div className={styles.ringVisual}>
      <div className={styles.ring} />
      <div className={styles.ring} />
      <div className={styles.ring} />
      <div className={styles.ringCenter}>Q → Q+</div>
    </div>
  );
}
