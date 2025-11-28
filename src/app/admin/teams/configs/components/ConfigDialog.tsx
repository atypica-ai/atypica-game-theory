"use client";

import { TeamConfigName } from "@/app/team/teamConfig/types";
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
import { Textarea } from "@/components/ui/textarea";
import { RefreshCwIcon } from "lucide-react";
import { FormEvent } from "react";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  teamName?: string;
  configKey: string;
  onConfigKeyChange: (key: string) => void;
  availableKeys: string[];
  configValue: string;
  onConfigValueChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  error?: string;
}

export function ConfigDialog({
  open,
  onOpenChange,
  isEditing,
  teamName,
  configKey,
  onConfigKeyChange,
  availableKeys,
  configValue,
  onConfigValueChange,
  onSubmit,
  isSubmitting,
  error,
}: ConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Configuration" : "Add Configuration"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Edit config "${configKey}" for team "${teamName}"`
              : `Add a new configuration for team "${teamName}"`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="config-key">Config Key</Label>
              {isEditing ? (
                <Input id="config-key" value={configKey} disabled className="font-mono" />
              ) : (
                <select
                  id="config-key"
                  value={configKey}
                  onChange={(e) => onConfigKeyChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Select a config key...</option>
                  {availableKeys.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted-foreground">
                Available keys: {Object.values(TeamConfigName).join(", ")}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="config-value">Config Value (JSON)</Label>
              <Textarea
                id="config-value"
                value={configValue}
                onChange={(e) => onConfigValueChange(e.target.value)}
                placeholder={[
                  "{",
                  '  "mcp_name": {',
                  '    "type": "http",',
                  '    "url": "https://.."',
                  "  }",
                  "}",
                ].join("\n")}
                className="font-mono text-sm min-h-[300px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter valid JSON. For MCP config, use: {"{"}
                &quot;type&quot;: &quot;http&quot;, &quot;url&quot;: &quot;...&quot;,
                &quot;headers&quot;: {"{"}&quot;...&quot;{"}"}
                {"}"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !configKey}>
              {isSubmitting ? (
                <>
                  <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
