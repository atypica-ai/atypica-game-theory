import { AnalysisResult } from "@/app/(persona)/persona/import/[personaImportId]/AnalysisResult";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { ChatMessageAttachment, PersonaImport } from "@/prisma/client";
import { CalendarIcon, DownloadIcon, FileIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchPersonaImportDetails } from "./actions";

interface PersonaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaImportId: number | null;
}

export function PersonaImportDialog({
  open,
  onOpenChange,
  personaImportId,
}: PersonaImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    personaImport: PersonaImport;
    attachments: ChatMessageAttachment[];
    userEmail: string | null;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!personaImportId) return;

    setLoading(true);
    try {
      const result = await fetchPersonaImportDetails(personaImportId);
      if (!result.success) throw result;
      setData(result.data);
    } catch (error) {
      console.error("Failed to load persona import details:", error);
      toast.error("Failed to load persona import details");
    } finally {
      setLoading(false);
    }
  }, [personaImportId]);

  useEffect(() => {
    if (open && personaImportId) {
      loadData();
    } else {
      setData(null);
    }
  }, [open, personaImportId, loadData]);

  const handleViewFile = useCallback(async (attachment: ChatMessageAttachment) => {
    if (attachment?.objectUrl && attachment?.mimeType) {
      window.open(
        await getS3SignedCdnUrl(attachment.objectUrl),
        // proxiedObjectCdnUrl({
        //   name: attachment.name,
        //   objectUrl: attachment.objectUrl,
        //   mimeType: attachment.mimeType,
        // }),
        "_blank",
      );
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Persona Import Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-6">
            {/* User and Creation Info */}
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Import Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created by:</span>
                  <span className="font-medium">{data.userEmail || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created at:</span>
                  <span className="font-medium">
                    {new Date(data.personaImport.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Source Files */}
            <div className="bg-card rounded-lg p-4 border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <FileIcon className="size-5" />
                Source Files
              </h3>
              <div className="space-y-3">
                {data.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded border"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="size-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{attachment.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)} • {attachment.mimeType}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFile(attachment)}
                      className="flex items-center gap-2"
                    >
                      <DownloadIcon className="size-3" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis Result */}
            {data.personaImport.analysis && (
              <div>
                <h3 className="text-lg font-medium mb-4">Analysis Result</h3>
                <AnalysisResult analysis={data.personaImport.analysis.analysis} />
              </div>
            )}

            {/* Processing Status */}
            {data.personaImport.extra?.processing && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <span className="text-yellow-800 font-medium">Processing in progress...</span>
                </div>
              </div>
            )}

            {/* Error Status */}
            {data.personaImport.extra?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800">
                  <div className="font-medium mb-2">Processing Error:</div>
                  <div className="text-sm">{data.personaImport.extra.error}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
