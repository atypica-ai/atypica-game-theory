"use client";
import { continueToStudyUserChat } from "@/app/(newStudy)/actions";
import { Button } from "@/components/ui/button";
import { BrainCircuitIcon, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const COUNTDOWN_SECONDS = 5;

interface CountdownRedirectProps {
  studyBrief: string;
  userChatId: number;
}

export function CountdownRedirect({ studyBrief, userChatId }: CountdownRedirectProps) {
  const router = useRouter();
  const t = useTranslations("NewStudyChatPage");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isPending, startTransition] = useTransition();
  const hasStarted = useRef(false);

  const startStudy = useCallback(() => {
    if (hasStarted.current || isPending) return;
    hasStarted.current = true;

    startTransition(async () => {
      const result = await continueToStudyUserChat(userChatId, studyBrief);
      if (result.success) {
        router.push(`/study/${result.data.token}`);
      } else {
        // TODO: Better error handling, maybe show a toast
        console.error(t("continueStudyError"), result.message);
        alert(t("couldNotStartStudy"));
        hasStarted.current = false; // Allow retrying if it fails
      }
    });
  }, [isPending, router, startTransition, studyBrief, userChatId, t]);

  useEffect(() => {
    if (countdown <= 0) {
      startStudy();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, startStudy]);

  const handleStartStudyClick = () => {
    // Stop the timer and start immediately by triggering the useEffect
    setCountdown(0);
  };

  return (
    <div className="relative text-center space-y-4 p-6">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-48 h-48 rounded-full blur-[60px] opacity-30 dark:opacity-40"
          style={{ backgroundColor: "oklch(0.87 0.29 142.57)" }}
        />
      </div>

      <div className="relative z-10 space-y-4">
        {/* AI Working Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <BrainCircuitIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400 animate-pulse" />
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("aiPreparing")}
          </div>
        </div>

        {/* Countdown Display */}
        <div className="relative">
          <div className="text-4xl font-bold text-zinc-800 dark:text-zinc-200 mb-1 font-mono">
            {countdown > 0 ? countdown : "0"}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            {countdown > 0 ? t("secondsRemaining") : t("startingNow")}
          </div>

          {/* Progress Animation */}
          <div className="w-24 h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-green-400 dark:via-emerald-400 dark:to-cyan-400 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%` }}
            />
          </div>
        </div>

        {/* Secondary Action Button */}
        <Button
          onClick={handleStartStudyClick}
          disabled={isPending || countdown === 0}
          variant="ghost"
          size="sm"
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs hover:bg-[#1bff1b]/10"
        >
          {isPending && <RotateCwIcon className="h-3 w-3 animate-spin mr-1" />}
          {isPending ? t("starting") : t("startImmediately")}
        </Button>
      </div>
    </div>
  );
}
