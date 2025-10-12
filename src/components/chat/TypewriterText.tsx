"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

interface TypewriterTextProps {
  text: string;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({ text, className = "", onComplete }: TypewriterTextProps) {
  const [displayedCount, setDisplayedCount] = useState(0);

  // Tokenize text once and cache it
  const tokens = useMemo(() => {
    if (!text) return [];

    const result: string[] = [];
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      // If it's a Chinese character, collect 8 Chinese chars at a time
      if (/[\u4e00-\u9fa5]/.test(char)) {
        const chunkSize = 8;
        let chunk = "";
        let count = 0;

        while (i < text.length && count < chunkSize) {
          if (/[\u4e00-\u9fa5]/.test(text[i])) {
            chunk += text[i];
            i++;
            count++;
          } else {
            break;
          }
        }

        if (chunk) result.push(chunk);
      } else {
        // Collect non-Chinese text - 18 characters at a time
        const maxChars = 18;
        let chunk = "";

        while (i < text.length && chunk.length < maxChars) {
          if (/[\u4e00-\u9fa5]/.test(text[i])) {
            break;
          }
          chunk += text[i];
          i++;
        }

        if (chunk) result.push(chunk);
      }
    }

    return result;
  }, [text]);

  // Typewriter effect - same for both streaming and non-streaming
  useEffect(() => {
    if (!text || tokens.length === 0) {
      setDisplayedCount(0);
      return;
    }

    // Reset and start from beginning
    setDisplayedCount(0);

    let idx = 0;
    const step = () => {
      if (idx >= tokens.length) {
        onComplete?.();
        return;
      }

      setDisplayedCount(idx + 1);
      idx += 1;

      setTimeout(step, 300);
    };

    // Start after a short delay
    const timer = setTimeout(step, 300);

    return () => clearTimeout(timer);
  }, [text, tokens, onComplete]);

  const displayedChunks = tokens.slice(0, displayedCount);
  const displayedText = displayedChunks.join("");

  return (
    <div className={className}>
      {displayedChunks.map((chunk, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {chunk}
        </motion.span>
      ))}
      {/* Reserve space for remaining text to prevent layout shift */}
      <span className="invisible">{text.substring(displayedText.length)}</span>
    </div>
  );
}
