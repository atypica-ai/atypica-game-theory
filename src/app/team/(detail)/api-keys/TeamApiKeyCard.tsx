"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Team } from "@/prisma/client";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, KeyIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { generateTeamApiKeyAction, getTeamApiKeyAction, revokeTeamApiKeyAction } from "../actions";

export function TeamApiKeyCard({ team, isOwner }: { team: Team; isOwner: boolean }) {
  const t = useTranslations("Team.ApiKeyCard");
  const [apiKey, setApiKey] = useState<{
    key: string;
    createdAt: string;
    createdBy: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadApiKey = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getTeamApiKeyAction();
      if (!result.success) throw result;
      setApiKey(result.data);
    } catch (error) {
      console.error("Failed to load API key:", error);
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
      setApiKey({
        key: result.data.key,
        createdAt: result.data.createdAt,
        createdBy: team.ownerUserId,
      });
      setShowKey(true);
      toast.success(t("toast.generateSuccess"));
    } catch (error) {
      console.error("Failed to generate API key:", error);
      toast.error(t("toast.generateError"));
    } finally {
      setIsGenerating(false);
    }
  }, [team.id, team.ownerUserId, t]);

  const handleRevoke = useCallback(async () => {
    setIsRevoking(true);
    try {
      const result = await revokeTeamApiKeyAction(team.id);
      if (!result.success) throw result;
      setApiKey(null);
      setShowKey(false);
      toast.success(t("toast.revokeSuccess"));
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      toast.error(t("toast.revokeError"));
    } finally {
      setIsRevoking(false);
    }
  }, [team.id, t]);

  const handleCopy = useCallback(() => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    toast.success(t("toast.copySuccess"));
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey, t]);

  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

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
        <CardTitle className="flex items-center gap-2">
          <KeyIcon className="w-5 h-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}{" "}
          <Link href="/docs/api" className="text-primary hover:underline" target="_blank">
            {t("viewDocsLink")}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!apiKey ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("noKeyDescription")}</p>
            <Button onClick={handleGenerate} disabled={!isOwner || isGenerating} className="w-full">
              {isGenerating ? t("generatingButton") : t("generateButton")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* API Key Display */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{t("apiKeyLabel")}</div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey.key}
                    readOnly
                    className="font-mono text-xs pr-10"
                  />
                  {/* 非 owner 不能显示/隐藏 API key */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowKey(!showKey)}
                    disabled={!isOwner}
                  >
                    {showKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </Button>
                </div>
                {/* 非 owner 不能复制 API key */}
                <Button variant="outline" size="sm" onClick={handleCopy} className="px-3" disabled={!isOwner}>
                  {copied ? (
                    <CheckIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Created At */}
            <div className="text-xs text-muted-foreground">
              {t("createdAt", { date: new Date(apiKey.createdAt).toLocaleString() })}
            </div>

            {/* Actions - 非 owner 不能重新生成或撤销 */}
            <div className="flex gap-2 pt-2 border-t">
              <ConfirmDialog
                title={t("regenerateDialog.title")}
                description={t("regenerateDialog.description")}
                cancelLabel={t("regenerateDialog.cancelButton")}
                confirmLabel={
                  isGenerating
                    ? t("regenerateDialog.regeneratingButton")
                    : t("regenerateDialog.confirmButton")
                }
                onConfirm={handleGenerate}
              >
                <Button disabled={!isOwner || isGenerating} variant="outline" className="flex-1">
                  {isGenerating ? t("generatingButton") : t("regenerateButton")}
                </Button>
              </ConfirmDialog>
              <ConfirmDialog
                title={t("revokeDialog.title")}
                description={t("revokeDialog.description")}
                cancelLabel={t("revokeDialog.cancelButton")}
                confirmLabel={
                  isRevoking ? t("revokeDialog.revokingButton") : t("revokeDialog.confirmButton")
                }
                variant="destructive"
                onConfirm={handleRevoke}
              >
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={!isOwner || isRevoking}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </ConfirmDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
