"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CharByCharTypewriterProps {
  text: string;
  speed?: number; // 每个字符的显示间隔（毫秒）
  className?: string;
  onComplete?: () => void;
  skipToEnd?: boolean; // 外部控制跳过
}

/**
 * 逐字符打字机效果组件
 * 默认速度：120ms/字符
 */
export function CharByCharTypewriter({
  text,
  speed = 120,
  className,
  onComplete,
  skipToEnd = false,
}: CharByCharTypewriterProps) {
  const [displayedChars, setDisplayedChars] = useState(0);
  const chars = Array.from(text); // 正确处理 emoji 和多字节字符

  useEffect(() => {
    if (skipToEnd) {
      setDisplayedChars(chars.length);
      onComplete?.();
      return;
    }

    if (displayedChars >= chars.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedChars((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedChars, chars.length, speed, skipToEnd, onComplete]);

  return (
    <div className={className}>
      {chars.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: index < displayedChars ? 1 : 0 }}
          transition={{ duration: 0.1 }}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}
