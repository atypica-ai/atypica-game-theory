"use client";

import Link from "next/link";
import styles from "../HomeV43.module.css";
import { CLOSING } from "../content";

export default function ClosingSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section ref={register} className={styles.closingFull}>
      <div className={styles.closing}>
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
