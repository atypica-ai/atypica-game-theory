"use client";

import { listSkillsAction, uploadSkillAction } from "@/app/(universal)/actions";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { MessageSquare, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createUniversalUserChat } from "./actions";

export function UniversalChatPageClient() {
  const t = useTranslations("UniversalAgent");
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [skills, setSkills] = useState<
    Array<{ id: number; name: string; description: string; createdAt: Date }>
  >([]);
  const [loading, setLoading] = useState(true);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    const result = await listSkillsAction();
    if (result.success) {
      setSkills(result.data);
    }
    setLoading(false);
  }, []);

  // Load skills on mount
  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

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
          await loadSkills();
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

  async function createNewChat() {
    const content = prompt(t("newChatPrompt"));
    if (!content || content.trim() === "") return;

    const result = await createUniversalUserChat({
      role: "user",
      content: content.trim(),
    });

    if (result.success) {
      router.push(`/universal/${result.data.token}`);
    } else {
      toast.error(t("createChatError"), {
        description: result.message,
      });
    }
  }

  return (
    <FitToViewport className="bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="skill-upload">
              <Button disabled={uploading} asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  {uploading ? t("uploading") : t("uploadSkill")}
                </span>
              </Button>
              <input
                id="skill-upload"
                type="file"
                accept=".skill,.zip"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            <Button onClick={createNewChat}>
              <MessageSquare className="h-4 w-4" />
              {t("newChat")}
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Skills Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("mySkills")}</h2>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
            ) : skills.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{t("noSkills")}</p>
                <label htmlFor="skill-upload-empty">
                  <Button asChild variant="outline">
                    <span className="cursor-pointer">{t("uploadFirstSkill")}</span>
                  </Button>
                  <input
                    id="skill-upload-empty"
                    type="file"
                    accept=".skill,.zip"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            ) : (
              <div className="grid gap-4">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="border rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <h3 className="font-semibold mb-1">{skill.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {skill.description}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(skill.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Chats Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("recentChats")}</h2>
            <div className="text-center py-12 border border-dashed rounded-lg">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">{t("noChats")}</p>
              <Button onClick={createNewChat}>{t("startFirstChat")}</Button>
            </div>
          </div>
        </div>
      </section>
    </FitToViewport>
  );
}
