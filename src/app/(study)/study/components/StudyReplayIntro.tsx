"use client";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CharByCharTypewriter } from "./CharByCharTypewriter";

interface StudyReplayIntroProps {
  title: string;
  firstUserMessage: string;
  onComplete: () => void;
}

const COUNTDOWN_FROM = 3;

enum IntroStage {
  Title = "title",
  UserMessage = "userMessage",
  Countdown = "countdown",
  Complete = "complete",
}

/**
 * 研究回放开场动画组件
 * 流程：标题 → 用户消息 → 倒计时 → 开始
 */
export function StudyReplayIntro({ title, firstUserMessage, onComplete }: StudyReplayIntroProps) {
  const t = useTranslations("StudyPage.ReplayIntro");
  const [stage, setStage] = useState<IntroStage>(IntroStage.Title);
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [skipToEnd, setSkipToEnd] = useState(false);

  // ESC 键跳过
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    if (stage !== IntroStage.Countdown) return;

    if (countdown <= 0) {
      setStage(IntroStage.Complete);
      // 短暂延迟后调用完成回调，让淡出动画完成
      setTimeout(() => onComplete(), 100);
      return;
    }

    // 倒计时, 三倍速快进, 300ms 跳一次
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 300);

    return () => clearInterval(timer);
  }, [stage, countdown, onComplete]);

  const handleSkip = () => {
    if (stage === IntroStage.Complete) return;
    setSkipToEnd(true);
    setStage(IntroStage.Complete);
    setTimeout(() => onComplete(), 100);
  };

  const handleTitleComplete = () => {
    if (!skipToEnd) {
      setTimeout(() => setStage(IntroStage.UserMessage), 1000);
    }
  };

  const handleUserMessageComplete = () => {
    if (!skipToEnd) {
      setTimeout(() => setStage(IntroStage.Countdown), 1500);
    }
  };

  return (
    <AnimatePresence>
      {stage !== IntroStage.Complete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleSkip();
          }}
        >
          <div className="relative w-full max-w-3xl">
            {/* 跳过按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="absolute -top-16 right-8 text-white/70 hover:text-white hover:bg-white/10"
            >
              {t("skipButton")} <span className="ml-2 text-xs opacity-60">ESC</span>
            </Button>

            {/* 标题阶段 */}
            {stage === IntroStage.Title && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center px-4 md:px-8"
              >
                <div className="mb-8 text-sm text-white/50 uppercase tracking-wider">
                  Research Study
                </div>
                <CharByCharTypewriter
                  text={title}
                  speed={70}
                  skipToEnd={skipToEnd}
                  className="text-4xl md:text-5xl font-bold text-white leading-tight"
                  onComplete={handleTitleComplete}
                />
              </motion.div>
            )}

            {/* 用户消息阶段 */}
            {stage === IntroStage.UserMessage && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center px-4 md:px-8 max-h-[80vh] overflow-y-auto scrollbar-thin"
              >
                <div className="mb-4 md:mb-6 text-xs md:text-sm text-white/50 uppercase tracking-wider">
                  Research Brief
                </div>
                <CharByCharTypewriter
                  text={firstUserMessage}
                  speed={20}
                  skipToEnd={skipToEnd}
                  className="text-base md:text-xl lg:text-2xl text-white/90 leading-relaxed max-w-2xl mx-auto"
                  onComplete={handleUserMessageComplete}
                />
              </motion.div>
            )}

            {/* 倒计时阶段 */}
            {stage === IntroStage.Countdown && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center px-4 md:px-8 space-y-6"
              >
                {/* 进度条 */}
                <div className="w-full max-w-sm mx-auto h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${((COUNTDOWN_FROM - countdown) / COUNTDOWN_FROM) * 100}%`,
                    }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="h-full bg-linear-to-r from-emerald-500/60 via-green-500/60 to-teal-500/60"
                  />
                </div>

                {/* 倒计时提示 - 更低调 */}
                <div className="flex items-center justify-center gap-3 text-white/40">
                  <PlayIcon className="size-4" />
                  <span className="text-sm">
                    {t("starting")} {countdown}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
