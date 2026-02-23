"use client";

import { motion } from "framer-motion";
import styles from "../HomeV43.module.css";
import { CHAPTERS, USE_CASE_TABLE, CUSTOMER_STORIES } from "../content";

const copy = CHAPTERS[5];

export default function UseCasesSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section ref={register} id={copy.id} className={`${styles.chapter} ${styles.chapterLight}`}>
      <div className={styles.chapterHeader}>
        <div className={styles.chapterNumber}>{copy.number}</div>
        <p className={styles.chapterKicker}>{copy.kicker}</p>
        <h2 className={styles.chapterTitle}>{copy.title}</h2>
      </div>

      <motion.div
        className={styles.chapterContent}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        {/* Scenario table */}
        <table className={styles.useCaseTable}>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Core Tools</th>
              <th>Agent</th>
            </tr>
          </thead>
          <tbody>
            {USE_CASE_TABLE.map((row) => (
              <tr key={row.scenario}>
                <td style={{ fontWeight: 500 }}>{row.scenario}</td>
                <td>{row.tools}</td>
                <td>{row.agent}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Customer stories */}
        <p className={styles.storiesLabel}>Customer Stories</p>
        <div className={styles.storiesGrid}>
          {CUSTOMER_STORIES.map((story) => (
            <div key={story.key} className={styles.storyCard}>
              <div className={styles.storyClient}>{story.client}</div>
              <div className={styles.storySection}>
                <div className={styles.storySectionLabel}>Challenge</div>
                <div className={styles.storySectionText}>{story.challenge}</div>
              </div>
              <div className={styles.storySection}>
                <div className={styles.storySectionLabel}>Solution</div>
                <div className={styles.storySectionText}>{story.solution}</div>
              </div>
              <div className={styles.storySection}>
                <div className={styles.storySectionLabel}>Result</div>
                <div className={styles.storySectionText}>{story.result}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
