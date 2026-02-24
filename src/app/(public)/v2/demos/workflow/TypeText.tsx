"use client";

import { useEffect, useState } from "react";

/** Typing text animation — shared utility for workflow demos */
export default function TypeText({
  text,
  speed = 30,
  className,
  style,
}: {
  text: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span className={className} style={style}>
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}
