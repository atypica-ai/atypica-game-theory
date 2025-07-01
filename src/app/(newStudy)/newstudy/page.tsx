"use client";

import { Button } from "@/components/ui/button";
import { Ear, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createNewStudyChat } from "./actions";

export default function NewStudyPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("NewStudyPage");

  const handleStartInterview = async () => {
    try {
      const result = await createNewStudyChat();
      if (result.success) {
        router.push(`/newstudy/${result.data.token}`);
      } else {
        // TODO: Better error handling, maybe show a toast
        console.error(t("createChatError"), result.message);
        alert(t("createChatErrorGeneric"));
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      alert(t("unexpectedError"));
    }
  };

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center w-full overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-full h-full max-w-2xl max-h-2xl rounded-full blur-[150px] opacity-20 dark:opacity-30"
          style={{ backgroundColor: "oklch(0.87 0.29 142.57)" }}
        />
      </div>
      <div className="relative z-10 text-center p-8 max-w-md">
        <div className="flex justify-center items-center mb-6">
          <Ear className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
          <span className="ml-2 text-zinc-500 dark:text-zinc-400">{t("studyHelper")}</span>
        </div>
        <h1 className="text-xl font-EuclidCircularA font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          {t("title")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">{t("description")}</p>
        <Button
          onClick={() => {
            startTransition(handleStartInterview);
          }}
          disabled={isPending}
          variant="ghost"
          size="lg"
          className="hover:bg-[#1bff1b]/10 rounded-full"
        >
          {isPending && <RotateCwIcon className="h-4 w-4 animate-spin" />}
          {isPending ? t("starting") : t("startPlanning")}
        </Button>
      </div>
    </div>
  );
}
