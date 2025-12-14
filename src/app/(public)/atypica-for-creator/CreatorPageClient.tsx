"use client";
import { HeroSection } from "./HeroSection";
import { PainPointSection } from "./PainPointSection";
import { FeatureSection } from "./FeatureSection";
import { AdvancedCreatorSection } from "./AdvancedCreatorSection";
import { CTASection } from "./CTASection";
import "./creator.css";
import { useEffect, useState } from "react";

export default function CreatorPageClient() {
  const [stars, setStars] = useState<
    {
      left: string;
      top: string;
      delay: string;
    }[]
  >([]);

  const randomNum = (minNum: number, maxNum: number) => {
    return Math.random() * (maxNum - minNum + 1) + minNum;
  };

  useEffect(() => {
    const generateStars = () => {
      // 增加星星数量到100个，提高频率
      const starsArray = new Array(100).fill(null).map(() => {
        return {
          left: randomNum(0, typeof window !== "undefined" ? window.innerWidth : 1920) + "px",
          top: randomNum(0, typeof window !== "undefined" ? document.body.scrollHeight : 3000) + "px",
          delay: randomNum(0, 3) + "s",
        };
      });
      setStars(starsArray);
    };
    generateStars();
    
    // 窗口大小改变时重新生成
    const handleResize = () => {
      generateStars();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Atypica绿色方块星星 - 贯穿整页，高优先级，有背景时也能看见 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9999 }}>
        {stars.map((item, key) => (
          <div
            className="fixed w-[5px] h-[5px] bg-[#17ff19] opacity-0"
            key={key}
            style={{
              animation: "fadein 3s linear 0s infinite normal forwards",
              top: item.top,
              left: item.left,
              animationDelay: item.delay,
              mixBlendMode: "screen",
              zIndex: 9999,
            }}
          />
        ))}
      </div>
      <div className="relative" style={{ zIndex: 1 }}>
        <HeroSection />
        <PainPointSection />
        <FeatureSection />
        <AdvancedCreatorSection />
        <CTASection />
      </div>
    </>
  );
}


