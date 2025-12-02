"use client";

import { createOrGetSageChat } from "@/app/(sage)/(chat)/actions";
import type { SageExtra } from "@/app/(sage)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { proxiedImageLoader } from "@/lib/utils";
import type { Sage, User } from "@/prisma/client";
import { Edit2Icon, MessageCircleIcon } from "lucide-react";
import { useSession } from "next-auth/react";
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
  const t = useTranslations("Sage.PublicProfilePage");
  const router = useRouter();
  const { data: session } = useSession();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const handleStartChat = async (initialUserMessage?: string) => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=/sage/profile/${sage.token}`);
      return;
    }
    setIsCreatingChat(true);
    try {
      const result = await createOrGetSageChat({ sageToken: sage.token, initialUserMessage });
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
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm p-8 md:p-12">
          {/* Header with Avatar and Name */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative size-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                {sage.avatar.url ? (
                  <Image
                    loader={proxiedImageLoader}
                    src={sage.avatar.url}
                    alt={sage.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <HippyGhostAvatar className="size-24 scale-75" seed={sage.id} />
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  {sage.name}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{sage.domain}</p>
              </div>
            </div>

            {isOwner && (
              <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                <Link href={`/sage/${sage.token}`}>
                  <Edit2Icon className="size-3" />
                  {t("editSage")}
                </Link>
              </Button>
            )}
          </div>

          {/* Expertise Tags */}
          {sage.expertise.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {sage.expertise.map((exp, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 text-xs font-medium border border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 rounded-md"
                >
                  {exp}
                </span>
              ))}
            </div>
          )}

          {/* Introduction Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              {t("introduction")}
            </h2>
            {sage.bio ? (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{sage.bio}</p>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-500 italic">
                {t("noIntroduction")}
              </p>
            )}
          </div>

          {/* Recommended Questions Section */}
          {recommendedQuestions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                {t("chatWithMeAbout")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendedQuestions.slice(0, 4).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleStartChat(question)}
                    disabled={isCreatingChat}
                    className="group text-left p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800
                             hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:shadow-md
                             border border-zinc-200 dark:border-zinc-700
                             hover:border-zinc-300 dark:hover:border-zinc-600
                             transition-all disabled:opacity-50 disabled:cursor-not-allowed
                             min-h-[120px] flex items-center relative overflow-hidden cursor-pointer"
                  >
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 line-clamp-3 transition-colors">
                      {question}
                    </p>
                    <MessageCircleIcon className="absolute bottom-3 right-3 size-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ask Me Anything CTA */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              {t("askMeAnything")}
            </h2>
            <Button
              onClick={() => handleStartChat()}
              disabled={isCreatingChat}
              size="lg"
              className="w-full h-14 text-base rounded-xl"
            >
              <MessageCircleIcon className="size-5" />
              {isAuthenticated ? t("chatWithSage") : t("signInToChat")}
            </Button>
            {session?.user && (
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mt-3">
                <span>@{session.user.name || session.user.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
