import styles from "../../HomeV41.module.css";

const axes: Array<[string, number]> = [
  ["Value", 86],
  ["Risk", 63],
  ["Emotion", 72],
  ["Pathway", 79],
  ["Social", 68],
];

export default function WorldModelScene() {
  return (
    <div className={styles.paramVisual}>
      {axes.map(([label, value]) => (
        <div key={label} className={styles.paramRow}>
          <span>{label}</span>
          <div>
            <i style={{ width: `${value}%` }} />
          </div>
          <b>{value}%</b>
        </div>
      ))}
    </div>
  );
}
