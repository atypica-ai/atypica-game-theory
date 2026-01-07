"use client";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { ArrowLeftIcon, EditIcon, EyeIcon, RefreshCwIcon } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { fetchMemoryVersions, reorganizeMemoryVersion, saveMemoryVersion } from "./actions";

type MemoryVersion = ExtractServerActionData<typeof fetchMemoryVersions>[number];

interface MemoryPageClientProps {
  userId?: number;
  teamId?: number;
}

export function MemoryPageClient({ userId, teamId }: MemoryPageClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const [versions, setVersions] = useState<MemoryVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<MemoryVersion | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editChangeNotes, setEditChangeNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [userId, teamId]);

  const loadVersions = async () => {
    setIsLoading(true);
    setError("");
    const result = await fetchMemoryVersions({ userId, teamId });
    if (!result.success) {
      setError(result.message || "Failed to load memory versions");
    } else {
      setVersions(result.data);
    }
    setIsLoading(false);
  };

  const handleView = (version: MemoryVersion) => {
    setSelectedVersion(version);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (version: MemoryVersion) => {
    setSelectedVersion(version);
    setEditContent(version.core);
    setEditChangeNotes("");
    setIsEditDialogOpen(true);
  };

  const handleSaveNewVersion = async (e: FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) {
      setError("Content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await saveMemoryVersion({
      userId,
      teamId,
      content: editContent,
      changeNotes: editChangeNotes || `Admin edit based on version ${selectedVersion?.version}`,
    });

    if (!result.success) {
      setError(result.message || "Failed to save memory version");
      setIsSubmitting(false);
      return;
    }

    setIsEditDialogOpen(false);
    setSelectedVersion(null);
    setEditContent("");
    setEditChangeNotes("");
    await loadVersions();
    setIsSubmitting(false);
  };

  const handleReorganize = async () => {
    setIsSubmitting(true);
    setError("");

    const result = await reorganizeMemoryVersion({
      userId,
      teamId,
    });

    if (!result.success) {
      setError(result.message || "Failed to reorganize memory");
      setIsSubmitting(false);
      return;
    }

    await loadVersions();
    setIsSubmitting(false);
  };

  const backUrl = userId ? `/admin/users` : `/admin/teams`;
  const entityType = userId ? "User" : "Team";
  const entityId = userId ?? teamId;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={backUrl}>
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Memory Management</h1>
            <p className="text-sm text-muted-foreground">
              {entityType} ID: {entityId}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/50 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading memory versions...</div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No memory versions found. Memory will be created when first updated.
        </div>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Content Length</TableHead>
                <TableHead>Change Notes</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell className="font-mono text-sm">{version.version}</TableCell>
                  <TableCell className="text-sm">{version.core.length} chars</TableCell>
                  <TableCell className="text-sm max-w-md truncate">
                    {version.changeNotes || "-"}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(version.createdAt, locale)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(version.updatedAt, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleView(version)}
                      >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleEdit(version)}
                      >
                        <EditIcon className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleReorganize}
                        disabled={isSubmitting}
                      >
                        <RefreshCwIcon className="h-3 w-3 mr-1" />
                        Reorganize
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Memory Version {selectedVersion?.version}</DialogTitle>
            <DialogDescription>
              Created: {selectedVersion && formatDate(selectedVersion.createdAt, locale)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVersion?.changeNotes && (
              <div>
                <Label>Change Notes</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedVersion.changeNotes}</p>
              </div>
            )}
            <div>
              <Label>Content ({selectedVersion?.core.length} characters)</Label>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-[60vh] overflow-y-auto">
                {selectedVersion?.core || ""}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Memory (Based on Version {selectedVersion?.version})</DialogTitle>
            <DialogDescription>
              Editing will create a new version. Original version {selectedVersion?.version} will be
              preserved.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNewVersion}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="font-mono text-sm min-h-[400px]"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {editContent.length} characters. Changes will be saved as a new version.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-change-notes">Change Notes (Optional)</Label>
                <Input
                  id="edit-change-notes"
                  value={editChangeNotes}
                  onChange={(e) => setEditChangeNotes(e.target.value)}
                  placeholder="Describe what was changed..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !editContent.trim()}>
                {isSubmitting ? "Saving..." : "Save as New Version"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
