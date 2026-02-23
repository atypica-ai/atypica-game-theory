"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { HERO, HERO_PROMPT } from "../content";

export default function HeroSection({ register }: { register: (el: HTMLElement | null) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.7], [0, -60]);

  return (
    <section
      ref={(el) => {
        sectionRef.current = el;
        register(el);
      }}
      className="relative min-h-screen flex items-center sm:items-end pb-20 overflow-clip bg-[#09090b]"
    >
      {/* Background — positioned right, faded left for text readability */}
      <motion.div className="absolute inset-0" style={{ scale: bgScale, opacity: bgOpacity }}>
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(HERO_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover object-right"
          sizes="100vw"
          priority
        />
        {/* Gradient overlays: strong left fade + bottom fade */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "linear-gradient(to right, #09090b 15%, rgba(9,9,11,0.85) 40%, rgba(9,9,11,0.3) 70%, rgba(9,9,11,0.15))",
              "linear-gradient(to top, #09090b, rgba(9,9,11,0.4) 40%, transparent 70%)",
            ].join(", "),
          }}
        />
      </motion.div>

      {/* Content — full-width padding, not constrained to 1400px */}
      <motion.div
        className="relative z-1 w-full max-w-[1400px] mx-auto px-6 pb-[10vh] max-lg:px-[5vw] max-lg:pb-[6vh]"
        style={{ y: textY, opacity: bgOpacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 py-1 px-3.5 border border-[rgba(27,255,27,0.3)] bg-zinc-800/80 backdrop-blur-sm font-IBMPlexMono text-xs tracking-[0.17em] uppercase text-[#1bff1b]">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-[#15b025]"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {HERO.kicker}
          </span>
        </motion.div>

        <motion.h1
          className="mt-8 font-EuclidCircularA text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-medium leading-[0.92] text-white"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          The Agent That
          <br />
          <span className="italic font-InstrumentSerif text-[#1bff1b]">Understands</span> Humans
        </motion.h1>

        <motion.p
          className="mt-6 max-w-[48ch] text-base lg:text-lg leading-relaxed text-zinc-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          {HERO.body}
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <Link
            href="/newstudy"
            className="inline-flex items-center gap-2 h-11 px-6 bg-[#1bff1b] text-black font-medium text-sm tracking-[0.04em] no-underline transition-colors duration-200 hover:bg-[#15b025]"
          >
            {HERO.cta}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link
            href="#two-worlds"
            className="inline-flex items-center h-11 px-6 text-zinc-400 text-sm tracking-[0.04em] no-underline transition-colors duration-200 hover:text-zinc-100"
          >
            {HERO.secondaryCta}
          </Link>
        </motion.div>

        <motion.div
          className="mt-8 flex flex-wrap gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {HERO.badges.map((badge) => (
            <span
              key={badge}
              className="py-1 px-3.5 border border-zinc-700 font-IBMPlexMono text-xs tracking-[0.06em] text-zinc-400"
            >
              {badge}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
