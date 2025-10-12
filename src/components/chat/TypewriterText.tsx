"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface TypewriterTextProps {
  text: string;
  id?: string; // Used to distinguish different messages
  className?: string;
}

interface TextSegment {
  text: string;
  visible: boolean;
}

export function TypewriterText({ text, id, className = "" }: TypewriterTextProps) {
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const previousIdRef = useRef<string | undefined>(id);
  const previousTextLengthRef = useRef(0);

  // Reset when message changes
  useEffect(() => {
    const isNewMessage = id !== previousIdRef.current;
    if (isNewMessage) {
      previousIdRef.current = id;
      setSegments([]);
      previousTextLengthRef.current = 0;
    }
  }, [id]);

  // Monitor text changes and create new segments
  useEffect(() => {
    // If text hasn't changed or got shorter, do nothing
    if (text.length <= previousTextLengthRef.current) return;

    const newText = text.substring(previousTextLengthRef.current);
    previousTextLengthRef.current = text.length;

    // Add new segment (immediately visible)
    setSegments((prev) => [...prev, { text: newText, visible: true }]);
  }, [text]);

  const visibleText = segments.map((seg) => seg.text).join("");
  const hiddenText = text.substring(visibleText.length);

  return (
    <div className={className}>
      {segments.map((segment, index) => (
        <motion.span
          key={`${id}-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: segment.visible ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {segment.text}
        </motion.span>
      ))}
      {/* Reserve space for remaining text to prevent layout shift */}
      <span className="invisible">{hiddenText}</span>
    </div>
  );
}
