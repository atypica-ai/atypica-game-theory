"use client";

import { listWorkspaceFiles, WorkspaceFile } from "@/app/(universal)/actions";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, FileIcon, FolderIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface WorkspaceFilesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceFilesPanel({ open, onOpenChange }: WorkspaceFilesPanelProps) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await listWorkspaceFiles();
      if (result.success) {
        setFiles(result.data);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open]);

  const handleDownload = (file: WorkspaceFile) => {
    const downloadUrl = `/api/export?${file.type === "directory" ? "folderPath" : "filePath"}=workspace/${file.path}`;
    window.open(downloadUrl, "_blank");
  };

  // Build file tree structure
  const fileTree = buildFileTree(files);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] p-6">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>Workspace Files</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadFiles}
              disabled={loading}
              className="size-8"
            >
              <RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </DrawerTitle>
        </DrawerHeader>

        <div className="mt-6 space-y-2 overflow-y-auto">
          {files.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No files in workspace yet
            </p>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          )}

          {!loading && <FileTreeNode node={fileTree} onDownload={handleDownload} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileTreeNode[];
}

function buildFileTree(files: WorkspaceFile[]): FileTreeNode {
  const root: FileTreeNode = {
    name: "workspace",
    path: "",
    type: "directory",
    children: [],
  };

  // Sort files by path
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: isLast ? file.type : "directory",
          size: isLast && file.type === "file" ? file.size : undefined,
          children: isLast && file.type === "file" ? undefined : [],
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  return root;
}

function FileTreeNode({
  node,
  level = 0,
  onDownload,
}: {
  node: FileTreeNode;
  level?: number;
  onDownload: (file: WorkspaceFile) => void;
}) {
  const [expanded, setExpanded] = useState(level === 0);

  const hasChildren = node.children && node.children.length > 0;

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload({ name: node.name, path: node.path, type: node.type, size: node.size });
  };

  return (
    <div>
      <div
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md text-sm transition-colors group"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/Collapse button for directories */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 flex-1 min-w-0"
          >
            {expanded ? (
              <ChevronDownIcon className="size-3 flex-shrink-0" />
            ) : (
              <ChevronRightIcon className="size-3 flex-shrink-0" />
            )}
            <FolderIcon className="size-4 text-blue-500 flex-shrink-0" />
            <span className="flex-1 text-left truncate">{node.name}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0 pl-4">
            <FileIcon className="size-4 text-gray-500 flex-shrink-0" />
            <span className="flex-1 text-left truncate">{node.name}</span>
          </div>
        )}

        {/* File size */}
        {node.type === "file" && node.size && (
          <span className="text-xs text-muted-foreground">{formatFileSize(node.size)}</span>
        )}

        {/* Download button */}
        <button
          onClick={handleDownloadClick}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent-foreground/10 rounded"
          title={node.type === "directory" ? "Download as ZIP" : "Download file"}
        >
          <DownloadIcon className="size-3.5" />
        </button>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children?.map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} onDownload={onDownload} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
