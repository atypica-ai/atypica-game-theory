import { useCallback, useEffect, useState } from "react";

interface UseDeckScaleOptions {
  deckWidth?: number; // 固定 deck 宽度
}

export function useDeckScale({ deckWidth = 880 }: UseDeckScaleOptions = {}) {
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const windowWidth = window.innerWidth;

    if (windowWidth < deckWidth) {
      const newScale = windowWidth / deckWidth;
      setScale(newScale);
    } else {
      setScale(1);
    }
  }, [deckWidth]);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, [updateScale]);

  return {
    scale,
    deckStyles: {
      width: `${deckWidth}px`,
      transform: `scale(${scale})`,
      transformOrigin: "50% 50%",
    },
  };
}
