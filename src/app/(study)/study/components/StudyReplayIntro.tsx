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

const COUNTDOWN_SECONDS = 2;

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
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
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
      setTimeout(() => onComplete(), 300);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

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
      setTimeout(() => setStage(IntroStage.Countdown), 300);
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
          <div className="relative w-full max-w-3xl px-4 md:px-8">
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
                className="text-center"
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
                className="text-center max-h-[80vh] overflow-y-auto scrollbar-thin"
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
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.1, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center space-y-8"
              >
                <div className="text-sm text-white/50 uppercase tracking-wider">
                  {t("starting")}
                </div>

                {/* 倒计时数字 */}
                <motion.div
                  key={countdown}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-8xl md:text-9xl font-bold text-white"
                >
                  {countdown}
                </motion.div>

                {/* 进度条 */}
                <div className="w-full max-w-md mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%`,
                    }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="h-full bg-linear-to-r from-emerald-500 via-green-500 to-teal-500"
                  />
                </div>

                {/* 播放图标动画 */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex justify-center"
                >
                  <PlayIcon className="size-12 text-white/70" />
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
