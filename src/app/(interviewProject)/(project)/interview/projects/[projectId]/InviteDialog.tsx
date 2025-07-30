import { generateInterviewShareTokenAction } from "@/app/(interviewProject)/actions";
import { Button } from "@/components/ui/button";
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
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function InviteDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}) {
  const t = useTranslations("InterviewProject.projectDetails");
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateShareLink = useCallback(async () => {
    setLoading(true);
    try {
      const result = await generateInterviewShareTokenAction(projectId, 72);
      if (!result.success) throw result;
      setShareUrl(`${window.location.origin}/interview/invite/${result.data.shareToken}`);
      // toast.success(t("generateShareLink"));
    } catch {
      toast.error(t("generateShareLinkFailed"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    if (open) {
      handleGenerateShareLink();
    }
  }, [open, handleGenerateShareLink]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("copySuccess"));
    } catch {
      toast.error(t("copyLinkFailed"));
    }
  }, [shareUrl, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("shareProject")}</DialogTitle>
          <DialogDescription>{t("shareDescription")}</DialogDescription>
        </DialogHeader>
        {
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-url">{t("shareUrl")}</Label>
              <div className="flex space-x-2">
                <Input
                  id="share-url"
                  value={loading ? t("loading") : shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={handleCopyLink} size="sm" disabled={loading}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">{t("securityNote")}</p>
            </div>
          </div>
        }
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
