"use client";

import { motion } from "framer-motion";

/** Animated mouse cursor overlay for demos */
export default function AnimCursor({
  x,
  y,
  visible,
  clicking,
}: {
  x: number;
  y: number;
  visible: boolean;
  clicking?: boolean;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none z-30"
      animate={{ x, y, opacity: visible ? 1 : 0, scale: clicking ? 0.85 : 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
        <path
          d="M1 1L1 14L4.5 10.5L8 17L10 16L6.5 9.5L11.5 9.5L1 1Z"
          fill="#1a1714"
          fillOpacity="0.7"
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      {clicking && (
        <motion.div
          className="absolute -top-1 -left-1 w-4 h-4 rounded-full border border-black/20"
          initial={{ scale: 0.5, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </motion.div>
  );
}
