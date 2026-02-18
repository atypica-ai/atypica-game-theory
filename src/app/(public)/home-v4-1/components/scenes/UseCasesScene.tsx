import { USE_CASE_TAPE } from "../../content/narrative.ui";
import styles from "../../HomeV41.module.css";

export default function UseCasesScene() {
  return (
    <div className={styles.conveyor}>
      {[...USE_CASE_TAPE, ...USE_CASE_TAPE].map((item, idx) => (
        <span key={`${item}-${idx}`} className={styles.conveyorItem}>
          {item}
        </span>
      ))}
    </div>
  );
}
