import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InterviewProjectExtra } from "@/prisma/client";
import { AlertCircle, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  disablePermanentInviteLinkAction,
  generateInterviewShareTokenAction,
  generatePermanentInterviewShareTokenAction,
} from "./actions";

export function InviteDialog({
  open,
  onOpenChange,
  projectId,
  projectExtra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectExtra?: InterviewProjectExtra;
}) {
  const t = useTranslations("InterviewProject.projectDetails");
  const [temporaryShareUrl, setTemporaryShareUrl] = useState("");
  const [permanentShareUrl, setPermanentShareUrl] = useState("");
  const [temporaryLoading, setTemporaryLoading] = useState(false);
  const [permanentLoading, setPermanentLoading] = useState(false);
  const [selectedExpiryHours, setSelectedExpiryHours] = useState<number>(72); // 默认3天
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [hasPermanentLink, setHasPermanentLink] = useState<boolean>(
    !!projectExtra?.permanentShareToken,
  );
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // 生成临时链接
  const handleGenerateTemporaryLink = useCallback(async () => {
    setTemporaryLoading(true);
    try {
      const result = await generateInterviewShareTokenAction(projectId, selectedExpiryHours);
      if (!result.success) throw result;

      setTemporaryShareUrl(`${window.location.origin}/interview/invite/${result.data.shareToken}`);

      // 计算过期日期并格式化显示
      const expiryDate = new Date(Date.now() + selectedExpiryHours * 60 * 60 * 1000);
      setExpiryDate(expiryDate.toLocaleString());
    } catch {
      toast.error(t("generateShareLinkFailed"));
    } finally {
      setTemporaryLoading(false);
    }
  }, [projectId, t, selectedExpiryHours]);

  // 生成/获取永久链接
  const handleGeneratePermanentLink = useCallback(async () => {
    setPermanentLoading(true);
    try {
      const result = await generatePermanentInterviewShareTokenAction(projectId);
      if (!result.success) throw result;

      setPermanentShareUrl(`${window.location.origin}/interview/invite/${result.data.shareToken}`);
      setHasPermanentLink(true);
    } catch {
      toast.error(t("generateShareLinkFailed"));
    } finally {
      setPermanentLoading(false);
    }
  }, [projectId, t]);

  // 禁用永久链接
  const handleDisablePermanentLink = useCallback(async () => {
    setPermanentLoading(true);
    try {
      const result = await disablePermanentInviteLinkAction(projectId);
      if (!result.success) throw result;

      setPermanentShareUrl("");
      setHasPermanentLink(false);
      toast.success(t("permanentLinkDisabled"));
    } catch {
      toast.error(t("disablePermanentLinkFailed"));
    } finally {
      setPermanentLoading(false);
    }
  }, [projectId, t]);

  // 当对话框打开时或有效期变化时，生成临时链接
  useEffect(() => {
    if (open) {
      handleGenerateTemporaryLink();

      // 如果项目启用了永久链接，获取永久链接
      if (projectExtra?.permanentShareToken) {
        handleGeneratePermanentLink();
      }
    }
  }, [
    open,
    selectedExpiryHours,
    handleGenerateTemporaryLink,
    handleGeneratePermanentLink,
    projectExtra?.permanentShareToken,
  ]);

  const handleCopyTemporaryLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(temporaryShareUrl);
      toast.success(t("copySuccess"));
    } catch {
      toast.error(t("copyLinkFailed"));
    }
  }, [temporaryShareUrl, t]);

  const handleCopyPermanentLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(permanentShareUrl);
      toast.success(t("copySuccess"));
    } catch {
      toast.error(t("copyLinkFailed"));
    }
  }, [permanentShareUrl, t]);

  const handleExpiryChange = useCallback((value: string) => {
    setSelectedExpiryHours(parseInt(value, 10));
  }, []);

  const togglePermanentLink = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        handleGeneratePermanentLink();
        toast.success(t("permanentLinkEnabled"));
      } else {
        // 显示确认对话框
        setShowDisableConfirm(true);
      }
    },
    [handleGeneratePermanentLink, t],
  );

  const handleConfirmDisable = useCallback(() => {
    setShowDisableConfirm(false);
    handleDisablePermanentLink();
  }, [handleDisablePermanentLink]);

  const handleCancelDisable = useCallback(() => {
    setShowDisableConfirm(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("shareProject")}</DialogTitle>
          <DialogDescription>{t("shareDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 临时链接区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("temporaryLinkSection")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expiry-select">{t("linkExpiry")}</Label>
                <Select value={String(selectedExpiryHours)} onValueChange={handleExpiryChange}>
                  <SelectTrigger id="expiry-select" className="w-full">
                    <SelectValue placeholder={t("selectExpiry")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="72">{t("expiry3Days")}</SelectItem>
                    <SelectItem value="168">{t("expiry7Days")}</SelectItem>
                    <SelectItem value="720">{t("expiry30Days")}</SelectItem>
                  </SelectContent>
                </Select>
                {expiryDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("expiryDate", { date: expiryDate })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="temp-share-url">{t("shareUrl")}</Label>
                <div className="flex space-x-2">
                  <Input
                    id="temp-share-url"
                    value={temporaryLoading ? t("loading") : temporaryShareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCopyTemporaryLink}
                    size="sm"
                    disabled={temporaryLoading || !temporaryShareUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 永久链接区域 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t("permanentLinkSection")}</CardTitle>
                <Switch
                  checked={hasPermanentLink}
                  onCheckedChange={togglePermanentLink}
                  disabled={permanentLoading}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasPermanentLink ? (
                <>
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-800 dark:text-amber-200 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {t("permanentLinkWarning")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="permanent-share-url">{t("shareUrl")}</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="permanent-share-url"
                        value={permanentLoading ? t("loading") : permanentShareUrl}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        onClick={handleCopyPermanentLink}
                        size="sm"
                        disabled={permanentLoading || !permanentShareUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">{t("enablePermanentLink")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>

      {/* 确认关闭永久链接对话框 */}
      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDisablePermanentLink")}</AlertDialogTitle>
            <AlertDialogDescription>{t("disablePermanentLinkWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDisable}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDisable}>{t("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
