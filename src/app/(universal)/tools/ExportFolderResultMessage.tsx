"use client";

import { Button } from "@/components/ui/button";
import { UniversalToolName, UniversalUITools } from "@/app/(universal)/tools/types";
import { ToolUIPart } from "ai";
import { Download } from "lucide-react";

export const ExportFolderResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<UniversalUITools, UniversalToolName.exportFolder>>,
    { state: "output-available" }
  >;
}) => {
  const { success, downloadToken, message, fileCount } = toolInvocation.output;

  if (!success || !downloadToken) {
    return (
      <div className="text-sm text-destructive mt-2">
        {message || "Export failed"}
      </div>
    );
  }

  const handleDownload = () => {
    window.open(`/api/download/${downloadToken}`, "_blank");
  };

  return (
    <div className="mt-3 p-4 border border-border rounded-lg bg-muted/30">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Download className="size-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm mb-1">Export Ready</div>
          <div className="text-sm text-muted-foreground mb-3">
            {fileCount ? `${fileCount} files` : "Files"} packaged and ready to download
          </div>
          <Button onClick={handleDownload} size="sm" className="gap-2">
            <Download className="size-4" />
            Download ZIP
          </Button>
        </div>
      </div>
    </div>
  );
};
