"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import styles from "../../HomeV42.module.css";
import { HERO, HERO_PROMPT } from "../../content";

export default function HeroScene({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.7], [0, -80]);

  return (
    <section
      ref={(el) => {
        sectionRef.current = el;
        register(el);
      }}
      className={styles.hero}
    >
      {/* Background with scroll-driven zoom */}
      <motion.div className={styles.heroBg} style={{ scale: heroScale, opacity: heroOpacity }}>
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(HERO_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className={styles.heroBgImage}
          sizes="100vw"
          priority
        />
        <div className={styles.heroGradient} />
        <div className={styles.heroScanline} />
      </motion.div>

      {/* Content with scroll-driven drift */}
      <motion.div className={styles.heroContent} style={{ y: textY, opacity: heroOpacity }}>
        {/* Kicker badge */}
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

        {/* Title */}
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

        {/* Body */}
        {HERO.body.map((text) => (
          <motion.p
            key={text}
            className={styles.heroBody}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            {text}
          </motion.p>
        ))}

        {/* CTAs */}
        <motion.div
          className={styles.heroCtas}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <Link href="/newstudy" className={styles.heroCtaPrimary}>
            {HERO.cta}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link href="/pricing" className={styles.heroCtaSecondary}>
            {HERO.secondaryCta}
          </Link>
        </motion.div>

        {/* Terminal */}
        <motion.div
          className={styles.terminal}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <div className={styles.terminalHeader}>
            <span className={styles.terminalLabel}>Cognitive Terminal</span>
            <span className={styles.terminalLive}>LIVE</span>
          </div>
          <div className={styles.terminalBody}>
            {HERO.terminal.map((line, index) => (
              <motion.p
                key={line}
                className={styles.terminalLine}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.24 }}
              >
                <span className={styles.terminalLinePrompt}>{">"}</span>
                {line}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className={styles.scrollHint}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <motion.span
          className={styles.scrollHintLabel}
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          Scroll
        </motion.span>
      </motion.div>
    </section>
  );
}
