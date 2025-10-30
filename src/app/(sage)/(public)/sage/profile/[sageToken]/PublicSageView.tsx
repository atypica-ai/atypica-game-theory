"use client";

import { createNewSageChat } from "@/app/(sage)/actions";
import type { SageExtra } from "@/app/(sage)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import type { Sage, User } from "@/prisma/client";
import { MessageCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function PublicSageView({
  sage,
  isOwner,
  isAuthenticated,
}: {
  sage: Omit<Sage, "expertise" | "extra" | "avatar"> & {
    extra: SageExtra;
    expertise: string[];
    avatar: { url?: string };
    user: Pick<User, "id" | "name" | "email">;
  };
  isOwner: boolean;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("Sage.detail");
  const tPublic = useTranslations("Sage.public");
  const router = useRouter();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const handleStartChat = async (initialMessage?: string) => {
    if (!isAuthenticated) {
      router.push("/auth/signin");
      return;
    }

    setIsCreatingChat(true);
    try {
      const result = await createNewSageChat(sage.id, initialMessage);
      if (!result.success) throw result;
      const { userChat } = result.data;

      // Navigate to chat page
      router.push(`/sage/chat/${userChat.token}`);
    } catch (error) {
      console.log("Error creating chat:", error);
      toast.error(t("createChatFailed"));
      setIsCreatingChat(false);
    }
  };

  const recommendedQuestions = sage.extra.recommendedQuestions || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative size-16 rounded-full overflow-hidden bg-muted">
                  {sage.avatar.url ? (
                    <Image src={sage.avatar.url} alt={sage.name} fill className="object-cover" />
                  ) : (
                    <HippyGhostAvatar className="size-16" seed={sage.id} />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{sage.name}</h1>
                  <p className="text-base text-zinc-600 dark:text-zinc-400">{sage.domain}</p>
                </div>
              </div>

              {/* Bio */}
              {sage.bio && (
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{sage.bio}</p>
              )}

              {/* Expertise Tags */}
              {sage.expertise.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sage.expertise.map((exp, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {isOwner && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sage/${sage.token}`}>{tPublic("manage")}</Link>
                </Button>
              )}
              <Button onClick={() => handleStartChat()} disabled={isCreatingChat}>
                <MessageCircleIcon className="size-4" />
                {isAuthenticated ? t("chatWithSage") : tPublic("signInToChat")}
              </Button>
            </div>
          </div>
        </div>

        {/* Recommended Questions */}
        {recommendedQuestions.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Recommended Questions
            </h3>
            <div className="space-y-3">
              {recommendedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleStartChat(question)}
                  disabled={isCreatingChat}
                  className="w-full text-left p-4 rounded-lg border border-zinc-200 dark:border-zinc-700
                           hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{question}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
