"use client";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

interface CharByCharTypewriterProps {
  text: string;
  speed?: number; // 每个单元的显示间隔（毫秒）
  className?: string;
  onComplete?: () => void;
  skipToEnd?: boolean; // 外部控制跳过
}

// 检测文本是否主要是中文（或其他 CJK 字符）
function isMostlyCJK(text: string): boolean {
  const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;
  const cjkMatches = text.match(cjkRegex);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  return cjkCount / text.length > 0.3; // 超过30%是中文就按字符分割
}

// 按单词分割英文文本（保留空格和标点）
function splitIntoWords(text: string): string[] {
  // 匹配单词、空格、标点等
  const regex = /\S+|\s+/g;
  return text.match(regex) || [];
}

/**
 * 智能打字机效果组件
 * - 中文/CJK：按字符显示
 * - 英文：按单词显示
 * 默认速度：120ms/单元
 */
export function CharByCharTypewriter({
  text,
  speed = 120,
  className,
  onComplete,
  skipToEnd = false,
}: CharByCharTypewriterProps) {
  const [displayedUnits, setDisplayedUnits] = useState(0);

  // 根据语言智能分割文本
  const units = useMemo(() => {
    if (isMostlyCJK(text)) {
      return Array.from(text); // 中文按字符
    } else {
      return splitIntoWords(text); // 英文按单词
    }
  }, [text]);

  useEffect(() => {
    if (skipToEnd) {
      setDisplayedUnits(units.length);
      onComplete?.();
      return;
    }

    if (displayedUnits >= units.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedUnits((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedUnits, units.length, speed, skipToEnd, onComplete]);

  return (
    <div className={className}>
      {units.map((unit, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: index < displayedUnits ? 1 : 0 }}
          transition={{ duration: 0.1 }}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {unit}
        </motion.span>
      ))}
    </div>
  );
}
