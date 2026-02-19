"use client";

import { motion } from "framer-motion";
import styles from "../../HomeV42.module.css";
import { CLOSING, CLIENTS } from "../../content";

export default function ClosingScene({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section
      ref={register}
      className={`${styles.scene} ${styles.closing}`}
    >
      <div className={styles.sceneIndex}>{CLOSING.chapter}</div>
      <div>
        {/* Client badges */}
        <div className={styles.clientSection}>
          <p className={styles.clientLabel}>Trusted By</p>
          <div className={styles.clientBadges}>
            {CLIENTS.map((client, index) => (
              <motion.span
                key={client}
                className={styles.clientBadge}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.18 }}
              >
                {client}
              </motion.span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <p className={styles.kicker}>{CLOSING.kicker}</p>
        <h3 className={styles.closingTitle}>{CLOSING.title}</h3>
        <p className={styles.closingBody}>{CLOSING.body}</p>
        <div className={styles.closingCtas}>
          <a href="/pricing" className={styles.closingCtaPrimary}>
            {CLOSING.cta}
            <span aria-hidden="true">&rarr;</span>
          </a>
          <a href="#" className={styles.closingCtaSecondary}>
            {CLOSING.secondaryCta}
          </a>
        </div>
      </div>
    </section>
  );
}
