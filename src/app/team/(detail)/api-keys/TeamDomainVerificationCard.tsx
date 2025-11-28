"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Team } from "@/prisma/client";
import {
  CheckCircleIcon,
  CircleAlertIcon,
  CopyIcon,
  GlobeIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addDomainAction,
  getDomainWhitelistAction,
  removeDomainAction,
  verifyDomainAction,
} from "../actions";

interface DomainEntry {
  domain: string;
  verificationToken: string;
  status: "pending" | "verified";
  verifiedAt?: string;
  addedBy: number;
  addedAt: string;
}

export default function TeamDomainVerificationCard({ team, isOwner }: { team: Team; isOwner: boolean }) {
  const t = useTranslations("Team.DomainVerificationCard");
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);

  const loadDomains = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getDomainWhitelistAction();
      if (!result.success) throw result;
      setDomains(result.data.domains);
    } catch (error) {
      console.error("Failed to load domains:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleAddDomain = useCallback(async () => {
    if (!newDomain.trim()) {
      toast.error(t("toast.enterDomain"));
      return;
    }

    setIsAdding(true);
    try {
      const result = await addDomainAction(team.id, newDomain.trim().toLowerCase());
      if (!result.success) {
        toast.error(result.message || t("toast.addError"));
        return;
      }
      setDomains([...domains, result.data]);
      setNewDomain("");
      toast.success(t("toast.addSuccess"));
    } catch (error) {
      console.error("Failed to add domain:", error);
      toast.error(t("toast.addError"));
    } finally {
      setIsAdding(false);
    }
  }, [newDomain, team.id, domains, t]);

  const handleVerifyDomain = useCallback(
    async (domain: string) => {
      setVerifyingDomain(domain);
      try {
        const result = await verifyDomainAction(team.id, domain);
        if (!result.success) {
          toast.error(result.message || t("toast.verifyError"));
          return;
        }
        // Update local state
        setDomains(
          domains.map((d) =>
            d.domain === domain
              ? { ...d, status: "verified" as const, verifiedAt: result.data.verifiedAt }
              : d,
          ),
        );
        toast.success(t("toast.verifySuccess"));
      } catch (error) {
        console.error("Failed to verify domain:", error);
        toast.error(t("toast.verifyError"));
      } finally {
        setVerifyingDomain(null);
      }
    },
    [team.id, domains, t],
  );

  const handleRemoveDomain = useCallback(
    async (domain: string) => {
      setRemovingDomain(domain);
      try {
        const result = await removeDomainAction(team.id, domain);
        if (!result.success) {
          toast.error(result.message || t("toast.removeError"));
          return;
        }
        setDomains(domains.filter((d) => d.domain !== domain));
        toast.success(t("toast.removeSuccess"));
      } catch (error) {
        console.error("Failed to remove domain:", error);
        toast.error(t("toast.removeError"));
      } finally {
        setRemovingDomain(null);
      }
    },
    [team.id, domains, t],
  );

  const handleCopyVerificationRecord = useCallback(
    (token: string) => {
      const record = `atypica-verification=${token}`;
      navigator.clipboard.writeText(record);
      toast.success(t("toast.copiedVerificationRecord"));
    },
    [t],
  );

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeIcon className="w-5 h-5" />
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
          <GlobeIcon className="w-5 h-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Domain */}
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("addDomainLabel")}</div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t("domainPlaceholder")}
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isOwner) {
                  handleAddDomain();
                }
              }}
              className="flex-1"
              disabled={!isOwner}
            />
            {/* 非 owner 不能添加域名 */}
            <Button onClick={handleAddDomain} disabled={!isOwner || isAdding || !newDomain.trim()}>
              <PlusIcon className="size-4" />
              {isAdding ? t("addingButton") : t("addButton")}
            </Button>
          </div>
        </div>

        {/* Domain List */}
        {domains.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium">{t("domainsListLabel")}</div>
            <div className="space-y-2">
              {domains.map((domainEntry) => (
                <div
                  key={domainEntry.domain}
                  className="border rounded-lg p-3 space-y-2 bg-muted/30"
                >
                  {/* Domain name and status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{domainEntry.domain}</span>
                      {domainEntry.status === "verified" ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircleIcon className="w-3 h-3" />
                          {t("statusVerified")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                          <CircleAlertIcon className="w-3 h-3" />
                          {t("statusPending")}
                        </span>
                      )}
                    </div>
                    {/* 非 owner 不能删除域名 */}
                    <ConfirmDialog
                      title={t("removeDialog.title")}
                      description={t("removeDialog.description", { domain: domainEntry.domain })}
                      variant="destructive"
                      onConfirm={() => handleRemoveDomain(domainEntry.domain)}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={!isOwner || removingDomain === domainEntry.domain}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </ConfirmDialog>
                  </div>

                  {/* Verification instructions for pending domains */}
                  {domainEntry.status === "pending" && (
                    <div className="space-y-2 text-xs">
                      <div className="text-muted-foreground">{t("verificationInstructions")}</div>
                      <div className="bg-background border rounded p-2 space-y-1">
                        <div>
                          <span className="text-muted-foreground">{t("recordType")}: </span>
                          <span className="font-mono">TXT</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("recordHost")}: </span>
                          <span className="font-mono">@</span>
                          <span className="text-muted-foreground text-xs ml-1">
                            ({t("recordHostHint")})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <span className="text-muted-foreground">{t("recordValue")}: </span>
                            <span className="font-mono break-all">
                              atypica-verification={domainEntry.verificationToken}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() =>
                              handleCopyVerificationRecord(domainEntry.verificationToken)
                            }
                          >
                            <CopyIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {/* 非 owner 不能验证域名 */}
                      <Button
                        onClick={() => handleVerifyDomain(domainEntry.domain)}
                        disabled={!isOwner || verifyingDomain === domainEntry.domain}
                        size="sm"
                        className="w-full"
                      >
                        {verifyingDomain === domainEntry.domain
                          ? t("verifyingButton")
                          : t("verifyButton")}
                      </Button>
                    </div>
                  )}

                  {/* Verified info */}
                  {domainEntry.status === "verified" && domainEntry.verifiedAt && (
                    <div className="text-xs text-muted-foreground">
                      {t("verifiedAt", {
                        date: new Date(domainEntry.verifiedAt).toLocaleString(),
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">{t("noDomains")}</div>
        )}
      </CardContent>
    </Card>
  );
}
