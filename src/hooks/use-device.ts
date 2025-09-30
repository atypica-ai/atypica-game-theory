import { useEffect, useState } from "react";

export function useDevice() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const isMobile =
      typeof window !== "undefined"
        ? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            window.navigator.userAgent,
          )
        : false;
    setIsMobile(isMobile);
  }, []);
  return { isMobile };
}
