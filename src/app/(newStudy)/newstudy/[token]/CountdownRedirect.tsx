"use client";

import { Button } from "@/components/ui/button";
import { RotateCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { continueToStudyUserChat } from "../actions";

interface CountdownRedirectProps {
  studyBrief: string;
  userChatId: number;
}

export function CountdownRedirect({ studyBrief, userChatId }: CountdownRedirectProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [isPending, startTransition] = useTransition();
  const hasStarted = useRef(false);

  const startResearch = useCallback(() => {
    if (hasStarted.current || isPending) return;
    hasStarted.current = true;

    startTransition(async () => {
      const result = await continueToStudyUserChat(userChatId, studyBrief);
      if (result.success) {
        router.push(`/study/${result.data.token}`);
      } else {
        // TODO: Better error handling, maybe show a toast
        console.error("Failed to continue to study chat:", result.message);
        alert("Could not start research. Please try again.");
        hasStarted.current = false; // Allow retrying if it fails
      }
    });
  }, [isPending, router, startTransition, studyBrief, userChatId]);

  useEffect(() => {
    if (countdown <= 0) {
      startResearch();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, startResearch]);

  const handleStartResearchClick = () => {
    // Stop the timer and start immediately by triggering the useEffect
    setCountdown(0);
  };

  return (
    <div className="text-center">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Starting research in {countdown > 0 ? `${countdown}s` : "a moment"}...
      </p>
      <Button
        onClick={handleStartResearchClick}
        disabled={isPending || countdown === 0}
        size="lg"
        className="rounded-xl"
      >
        {isPending && <RotateCwIcon className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Starting..." : "Start Research Now"}
      </Button>
    </div>
  );
}
