"use client";

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
        {/* Client credentials — quiet social proof, not a feature */}
        <div className={styles.clientSection}>
          <p className={styles.clientLabel}>Trusted By</p>
          <p className={styles.clientList}>{CLIENTS.join(" · ")}</p>
        </div>

        {/* CTA — the focal point */}
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
