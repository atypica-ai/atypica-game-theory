"use client";

import { listSkillsAction, uploadSkillAction } from "@/app/(universal)/actions";
import { Textarea } from "@/components/ui/textarea";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  FileSearch,
  History,
  Mic,
  Plus,
  Search,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createUniversalUserChatAction, fetchUniversalUserChatsAction } from "./actions";

type SkillItem = {
  id: number;
  name: string;
  description: string;
  createdAt: Date | string;
};

type ChatItem = {
  id: number;
  token: string;
  title: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function UniversalChatPageClient() {
  const t = useTranslations("UniversalAgent");
  const locale = useLocale();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [recentChats, setRecentChats] = useState<ChatItem[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [loadingChats, setLoadingChats] = useState(true);

  const quickPrompts = [
    t("quickPromptStudy"),
    t("quickPromptInterview"),
    t("quickPromptReport"),
    t("quickPromptIdeas"),
  ];

  const loadHomeData = useCallback(async () => {
    setLoadingSkills(true);
    setLoadingChats(true);

    const [skillsResult, chatsResult] = await Promise.all([
      listSkillsAction(),
      fetchUniversalUserChatsAction({ take: 12 }),
    ]);

    if (skillsResult.success) {
      setSkills(skillsResult.data);
    } else {
      toast.error(t("loadSkillsError"), { description: skillsResult.message });
    }

    if (chatsResult.success) {
      setRecentChats(chatsResult.data);
    } else {
      toast.error(t("loadChatsError"), { description: chatsResult.message });
    }

    setLoadingSkills(false);
    setLoadingChats(false);
  }, [t]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".skill") && !file.name.endsWith(".zip")) {
      toast.error(t("uploadError"), {
        description: t("invalidFileType"),
      });
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const base64Content = base64.split(",")[1]; // Remove data:application/zip;base64, prefix

        const result = await uploadSkillAction(base64Content, file.name);

        if (result.success) {
          toast.success(t("uploadSuccess"), {
            description: t("skillUploaded", { name: result.data.skillName }),
          });
          await loadHomeData();
        } else {
          toast.error(t("uploadError"), {
            description: result.message,
          });
        }

        setUploading(false);
      };

      reader.onerror = () => {
        toast.error(t("uploadError"));
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch {
      toast.error(t("uploadError"));
      setUploading(false);
    }
  }

  async function createNewChat(content: string) {
    const normalized = content.trim();
    if (!normalized) return;
    setCreating(true);

    const result = await createUniversalUserChatAction({
      role: "user",
      content: normalized,
    });

    if (result.success) {
      router.push(`/universal/${result.data.token}`);
    } else {
      toast.error(t("createChatError"), {
        description: result.message,
      });
      setCreating(false);
    }
  }

  function formatTime(value: Date | string) {
    const date = new Date(value);
    return date.toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim()) return;
    await createNewChat(input);
  }

  const quickActions = [
    { key: "quickActionMarketResearch", icon: Search, prompt: quickPrompts[0] },
    { key: "quickActionUserResearch", icon: Users, prompt: quickPrompts[1] },
    { key: "quickActionCompetitorResearch", icon: BarChart3, prompt: quickPrompts[2] },
    { key: "quickActionTrendResearch", icon: FileSearch, prompt: quickPrompts[3] },
    { key: "quickActionMore", icon: Plus, prompt: quickPrompts[0] },
  ] as const;

  return (
    <FitToViewport className="bg-[#f5f5f5]">
      <main className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 pb-8 pt-8 lg:pt-14">
        <section className="flex flex-1 flex-col items-center justify-start">
          <div className="mb-8 inline-flex items-center rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600">
            <span>{t("freePlan")}</span>
            <span className="mx-2 h-3 w-px bg-zinc-300" />
            <span className="text-[#18FF19]">{t("startFreeTrial")}</span>
          </div>

          <h1 className="mb-10 text-center text-4xl font-semibold tracking-tight text-zinc-800 lg:text-6xl">
            {t("landingQuestion")}
          </h1>

          <form
            onSubmit={handleSubmit}
            className="w-full max-w-5xl rounded-[28px] border border-zinc-300 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.06)]"
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("composerPlaceholder")}
              className="min-h-[170px] resize-none rounded-[28px] border-none bg-transparent px-6 py-6 text-lg text-zinc-800 placeholder:text-zinc-400 focus-visible:ring-0"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (input.trim()) event.currentTarget.form?.requestSubmit();
                }
              }}
            />

            <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3">
              <div className="flex items-center gap-2">
                <label htmlFor="skill-upload" className="cursor-pointer">
                  <span className="flex size-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700">
                    <Upload className="size-4" />
                  </span>
                  <input
                    id="skill-upload"
                    type="file"
                    accept=".skill,.zip"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setInput(t("quickPromptIdeas"))}
                  className="flex size-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
                >
                  <Sparkles className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
                >
                  <Mic className="size-4" />
                </button>
                <Button
                  type="submit"
                  disabled={creating || !input.trim()}
                  className="h-10 w-10 rounded-full bg-zinc-800 p-0 text-white hover:bg-zinc-700 disabled:bg-zinc-300"
                >
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-2.5 text-sm text-zinc-500">
              <div className="line-clamp-1 flex items-center gap-2">
                <Plus className="size-4" />
                {uploading ? t("uploading") : t("connectToolsHint")}
              </div>
              <div className="text-xs text-zinc-400">{t("composerHint")}</div>
            </div>
          </form>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => setInput(action.prompt)}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <Icon className="size-4 text-zinc-500" />
                  <span>{t(action.key)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-300 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700">
              <History className="size-4" />
              {t("recentChats")}
            </div>
            {loadingChats ? (
              <div className="py-8 text-center text-sm text-zinc-500">{t("loading")}</div>
            ) : recentChats.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">{t("noChats")}</div>
            ) : (
              <div className="space-y-2">
                {recentChats.slice(0, 6).map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => router.push(`/universal/${chat.token}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left hover:bg-zinc-50"
                  >
                    <span className="line-clamp-1 text-sm text-zinc-700">
                      {chat.title || t("untitledChat")}
                    </span>
                    <span className="ml-3 shrink-0 text-xs text-zinc-400">{formatTime(chat.updatedAt)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-300 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Upload className="size-4" />
              {t("mySkills")}
            </div>
            {loadingSkills ? (
              <div className="py-8 text-center text-sm text-zinc-500">{t("loading")}</div>
            ) : skills.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">{t("noSkills")}</div>
            ) : (
              <div className="space-y-2">
                {skills.slice(0, 6).map((skill) => (
                  <div key={skill.id} className="rounded-lg border border-zinc-200 px-3 py-2">
                    <div className="line-clamp-1 text-sm text-zinc-700">{skill.name}</div>
                    <div className="line-clamp-1 text-xs text-zinc-500">{skill.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </FitToViewport>
  );
}
