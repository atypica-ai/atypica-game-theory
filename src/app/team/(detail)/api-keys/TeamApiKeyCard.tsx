"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Team } from "@/prisma/client";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteTeamApiKeyAction,
  generateTeamApiKeyAction,
  listTeamApiKeysAction,
} from "../actions";

interface ApiKey {
  id: number;
  key: string;
  createdAt: Date;
  createdByEmail: string;
}

export function TeamApiKeyCard({ team, isOwner }: { team: Team; isOwner: boolean }) {
  const t = useTranslations("Team.ApiKeyCard");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listTeamApiKeysAction();
      if (!result.success) throw result;
      setApiKeys(result.data);
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await generateTeamApiKeyAction(team.id);
      if (!result.success) throw result;
      setApiKeys((prev) => [result.data, ...prev]);
      setVisibleKeys((prev) => new Set(prev).add(result.data.id));
      toast.success(t("toast.generateSuccess"));
    } catch (error) {
      console.error(`Failed to generate API key: ${(error as Error).message}`);
      toast.error(t("toast.generateError"));
    } finally {
      setIsGenerating(false);
    }
  }, [team.id, t]);

  const handleDelete = useCallback(
    async (apiKeyId: number) => {
      setDeletingIds((prev) => new Set(prev).add(apiKeyId));
      try {
        const result = await deleteTeamApiKeyAction(team.id, apiKeyId);
        if (!result.success) throw result;
        setApiKeys((prev) => prev.filter((k) => k.id !== apiKeyId));
        setVisibleKeys((prev) => {
          const next = new Set(prev);
          next.delete(apiKeyId);
          return next;
        });
        toast.success(t("toast.revokeSuccess"));
      } catch (error) {
        console.error("Failed to delete API key:", error);
        toast.error(t("toast.revokeError"));
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(apiKeyId);
          return next;
        });
      }
    },
    [team.id, t],
  );

  const toggleVisibility = useCallback((apiKeyId: number) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(apiKeyId)) {
        next.delete(apiKeyId);
      } else {
        next.add(apiKeyId);
      }
      return next;
    });
  }, []);

  const handleCopy = useCallback(
    (apiKey: ApiKey) => {
      navigator.clipboard.writeText(apiKey.key);
      setCopiedId(apiKey.id);
      toast.success(t("toast.copySuccess"));
      setTimeout(() => setCopiedId(null), 2000);
    },
    [t],
  );

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="w-5 h-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{t("loading")}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="w-5 h-5" />
              {t("title")}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {t("description")}{" "}
              <Link href="/docs/api" className="text-primary hover:underline" target="_blank">
                {t("viewDocsLink")}
              </Link>
            </CardDescription>
          </div>
          {isOwner && (
            <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
              <PlusIcon className="w-4 h-4" />
              {isGenerating ? t("generatingButton") : t("generateButton")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <KeyIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">{t("noKeyDescription")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((apiKey) => {
              const isVisible = visibleKeys.has(apiKey.id);
              const isDeleting = deletingIds.has(apiKey.id);
              const isCopied = copiedId === apiKey.id;

              return (
                <div
                  key={apiKey.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={isVisible ? "text" : "password"}
                        value={apiKey.key}
                        readOnly
                        className="font-mono text-xs pr-10"
                      />
                      {/* Owner can toggle visibility */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleVisibility(apiKey.id)}
                        disabled={!isOwner}
                      >
                        {isVisible ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {/* Owner can copy */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(apiKey)}
                      className="px-3"
                      disabled={!isOwner}
                    >
                      {isCopied ? (
                        <CheckIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <CopyIcon className="w-4 h-4" />
                      )}
                    </Button>
                    {/* Only owner can delete */}
                    {isOwner && (
                      <ConfirmDialog
                        title={t("revokeDialog.title")}
                        description={t("revokeDialog.description")}
                        cancelLabel={t("revokeDialog.cancelButton")}
                        confirmLabel={t("revokeDialog.confirmButton")}
                        variant="destructive"
                        onConfirm={() => handleDelete(apiKey.id)}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive px-3"
                          disabled={isDeleting}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </ConfirmDialog>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t("createdAt", { date: new Date(apiKey.createdAt).toLocaleString() })}
                    </span>
                    {isOwner && apiKey.createdByEmail && (
                      <span className="font-mono">{apiKey.createdByEmail}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
