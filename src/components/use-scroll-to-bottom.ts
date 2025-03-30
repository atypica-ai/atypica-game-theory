import { RefObject, useEffect, useRef } from "react";

export function useScrollToBottom<T extends HTMLElement>({
  disabled = false,
  threshold = 100,
}: {
  disabled?: boolean;
  threshold?: number; // 自动滚动的阈值，距离底部的距离，大于阈值则不自动滚动
} = {}): [RefObject<T | null>, RefObject<T | null>] {
  const containerRef = useRef<T | null>(null);
  const endRef = useRef<T | null>(null);
  const shouldScrollRef = useRef(true);
  // const lastContentHeightRef = useRef(0);

  useEffect(() => {
    if (disabled) {
      return;
    }
    const container = containerRef.current;
    const end = endRef.current;

    if (!container || !end) {
      return;
    }

    // // 初始化最后内容高度
    // lastContentHeightRef.current = container.scrollHeight;

    // 检查是否在底部附近（比如距离底部 100px 以内）
    const isNearBottom = () => {
      const container = containerRef.current;
      if (!container) return false;
      return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    };

    // 监听滚动事件
    const handleScroll = () => {
      shouldScrollRef.current = isNearBottom();
    };

    container.addEventListener("scroll", handleScroll);

    // 创建观察器
    const observer = new MutationObserver(() => {
      if (shouldScrollRef.current) {
        end.scrollIntoView({ behavior: "smooth" });
      }
      // 去掉“当内容突然大量增加时，即使用户曾经滚动过，也强制滚动到底部”的逻辑
      // StudyChat 页面支持 toolArgs 展开，如果使用下面的逻辑，展开后会立即滚动到底部，这样不行

      // const container = containerRef.current;
      // if (!container) return;
      // // 检测内容高度变化
      // const currentHeight = container.scrollHeight;
      // const heightDifference = currentHeight - lastContentHeightRef.current;
      // // 当内容突然大量增加时，即使用户曾经滚动过，也强制滚动到底部
      // const significantChange = heightDifference > container.clientHeight * 0.5;
      // if (shouldScrollRef.current || significantChange) {
      //   end.scrollIntoView({ behavior: significantChange ? "auto" : "smooth" });
      // }
      // lastContentHeightRef.current = currentHeight;
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    // 确保初始滚动到底部
    end.scrollIntoView();

    // 清理函数
    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [disabled]);

  return [containerRef, endRef];
}
