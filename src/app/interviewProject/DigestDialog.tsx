import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useCompletion } from "@ai-sdk/react";
import { CheckIcon, CopyIcon, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function StreamingText({ text }: { text: string | null }) {
  const t = useTranslations("InterviewProject.digestDialog");
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  return (
    <div ref={messagesContainerRef} className="overflow-y-auto scrollbar-thin h-full p-4">
      {text ? (
        <div className="prose dark:prose-invert max-w-full text-sm">
          <Markdown>{text}</Markdown>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">{t("noDigestYet")}</div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface DigestDialogProps {
  projectToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDigest?: string | null;
}

export function DigestDialog({
  projectToken,
  open,
  onOpenChange,
  initialDigest,
}: DigestDialogProps) {
  const t = useTranslations("InterviewProject.digestDialog");
  const [digest, setDigest] = useState<string | null>(initialDigest || null);
  const [isCopied, setIsCopied] = useState(false);

  const {
    completion: streamingDigest,
    complete: handleGenerateDigest,
    isLoading: isGenerating,
    stop,
  } = useCompletion({
    api: "/api/chat/interviewProject/digest",
    body: {
      projectToken: projectToken,
    },
  });

  // Reset streaming content when dialog closes
  useEffect(() => {
    if (!open) {
      stop();
    }
  }, [open, stop]);

  // When opening the dialog, use existing digest if available
  useEffect(() => {
    if (open && initialDigest) {
      setDigest(initialDigest);
    }
  }, [open, initialDigest]);

  const displayContent = isGenerating ? streamingDigest : digest;

  const handleCopyToClipboard = async () => {
    if (!displayContent) return;
    try {
      await navigator.clipboard.writeText(displayContent);
      setIsCopied(true);
      toast.info("Digest copied to clipboard");
      // Reset the copied status after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy digest");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-none sm:w-[50vw] max-h-[80vh]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] my-4 border rounded-md bg-muted/20 relative">
          <StreamingText text={displayContent} />
          {displayContent && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyToClipboard}
              className="absolute top-2 right-2 h-9 w-9"
              title="Copy to clipboard"
            >
              {isCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            onClick={() => handleGenerateDigest("")}
            disabled={isGenerating}
            variant={digest ? "outline" : "default"}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("generating")}
              </>
            ) : digest ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("regenerate")}
              </>
            ) : (
              t("generate")
            )}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
