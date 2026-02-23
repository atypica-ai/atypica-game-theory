"use client";

import Link from "next/link";
import styles from "../HomeV43.module.css";
import { CLOSING, CLIENTS } from "../content";

export default function ClosingSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section ref={register} className={styles.closing}>
      <div className={styles.chapterDarkInner}>
      {/* Client list — fin.ai style */}
      <div className={styles.clientSection}>
        <p className={styles.clientLabel}>Trusted By</p>
        <div className={styles.clientGrid}>
          {CLIENTS.map((client) => (
            <span key={client} className={styles.clientItem}>
              {client}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <h2 className={styles.closingTitle}>{CLOSING.title}</h2>
      <p className={styles.closingBody}>{CLOSING.body}</p>
      <div className={styles.closingCtas}>
        <Link href="/pricing" className={styles.ctaPrimary}>
          {CLOSING.cta}
          <span aria-hidden="true">&rarr;</span>
        </Link>
        <Link href="#" className={styles.closingCtaSecondary}>
          {CLOSING.secondaryCta}
        </Link>
      </div>
      </div>
    </section>
  );
}
