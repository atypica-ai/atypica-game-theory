"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import styles from "../HomeV43.module.css";
import { HERO, HERO_PROMPT } from "../content";

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.7], [0, -60]);

  return (
    <section ref={sectionRef} className={styles.hero}>
      {/* Background */}
      <motion.div className={styles.heroBg} style={{ scale: bgScale, opacity: bgOpacity }}>
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(HERO_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className={styles.heroBgImage}
          sizes="100vw"
          priority
        />
        <div className={styles.heroGradient} />
      </motion.div>

      {/* Content */}
      <motion.div className={styles.heroContent} style={{ y: textY, opacity: bgOpacity }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className={styles.heroKicker}>
            <motion.span
              className={styles.heroKickerDot}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {HERO.kicker}
          </span>
        </motion.div>

        <motion.h1
          className={styles.heroTitle}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          The Agent That
          <br />
          <span className={styles.heroTitleAccent}>Understands</span> Humans
        </motion.h1>

        <motion.p
          className={styles.heroBody}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          {HERO.body}
        </motion.p>

        <motion.div
          className={styles.heroCtas}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <Link href="/newstudy" className={styles.ctaPrimary}>
            {HERO.cta}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link href="#two-worlds" className={styles.ctaSecondary}>
            {HERO.secondaryCta}
          </Link>
        </motion.div>

        <motion.div
          className={styles.heroBadges}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {HERO.badges.map((badge) => (
            <span key={badge} className={styles.heroBadge}>
              {badge}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
