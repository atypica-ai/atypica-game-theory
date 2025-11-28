"use client";

import type { MCPMetadata } from "@/ai/tools/mcp/client";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  FileTextIcon,
  RefreshCwIcon,
  ServerIcon,
  WrenchIcon,
} from "lucide-react";

interface McpTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  error: string;
  metadata: MCPMetadata[];
  teamId: number | null;
  onRetry: () => void;
}

export function McpTestDialog({
  open,
  onOpenChange,
  isLoading,
  error,
  metadata,
  teamId,
  onRetry,
}: McpTestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ServerIcon className="h-5 w-5" />
            MCP Client Status
          </DialogTitle>
          <DialogDescription>
            Inspecting MCP client status and capabilities for Team ID: {teamId}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onRetry} disabled={isLoading}>
              <RefreshCwIcon className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {isLoading && metadata.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshCwIcon className="h-8 w-8 animate-spin mb-4" />
              <p>Loading MCP metadata...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center gap-3">
              <AlertTriangleIcon className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && metadata.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <ServerIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No MCP servers configured or connected for this team.</p>
            </div>
          )}

          <div className="space-y-6">
            {metadata.map((mcp, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      {mcp.name}
                    </CardTitle>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Tabs defaultValue="tools">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="tools">Tools ({mcp.tools.length})</TabsTrigger>
                      <TabsTrigger value="resources">
                        Resources ({mcp.resources.length + mcp.resourceTemplates.length})
                      </TabsTrigger>
                      <TabsTrigger value="prompts">Prompts ({mcp.prompts.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="tools" className="mt-4">
                      {mcp.tools.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          {mcp.tools.map((toolName) => (
                            <div
                              key={toolName}
                              className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="font-medium text-sm mb-1 flex items-center gap-2">
                                <WrenchIcon className="h-3 w-3 text-muted-foreground" />
                                {toolName}
                              </div>
                              {mcp.toolDescriptions?.[toolName] && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {mcp.toolDescriptions[toolName]}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No tools available for this MCP server
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="resources" className="mt-4 space-y-4">
                      {mcp.resources.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4" />
                            Direct Resources ({mcp.resources.length})
                          </h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            {mcp.resources.map((resource) => (
                              <div
                                key={resource.uri}
                                className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                              >
                                <div className="font-medium text-sm mb-1">{resource.name}</div>
                                <div className="text-xs text-muted-foreground mb-1 break-all">
                                  {resource.uri}
                                </div>
                                {resource.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {resource.description}
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  {resource.mimeType && (
                                    <Badge variant="outline" className="text-xs">
                                      {resource.mimeType}
                                    </Badge>
                                  )}
                                  {resource.size !== undefined && (
                                    <Badge variant="outline" className="text-xs">
                                      {resource.size} bytes
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {mcp.resourceTemplates.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4" />
                            Resource Templates ({mcp.resourceTemplates.length})
                          </h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            {mcp.resourceTemplates.map((template) => (
                              <div
                                key={template.uriTemplate}
                                className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                              >
                                <div className="font-medium text-sm mb-1">
                                  {template.title || template.name}
                                </div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  <code className="bg-background px-1 py-0.5 rounded">
                                    {template.uriTemplate}
                                  </code>
                                </div>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {template.description}
                                  </p>
                                )}
                                {template.mimeType && (
                                  <Badge variant="outline" className="text-xs mt-2">
                                    {template.mimeType}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {mcp.resources.length === 0 && mcp.resourceTemplates.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No resources or resource templates available for this MCP server
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="prompts" className="mt-4">
                      {mcp.prompts.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          {mcp.prompts.map((prompt) => (
                            <div
                              key={prompt.name}
                              className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="font-medium text-sm mb-1">{prompt.name}</div>
                              {prompt.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {prompt.description}
                                </p>
                              )}
                              {prompt.arguments && prompt.arguments.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold mb-1">Arguments:</p>
                                  <div className="space-y-1">
                                    {prompt.arguments.map((arg) => (
                                      <div key={arg.name} className="text-xs text-muted-foreground">
                                        <code className="bg-background px-1 py-0.5 rounded">
                                          {arg.name}
                                        </code>
                                        {arg.required && (
                                          <Badge variant="outline" className="ml-1 text-xs">
                                            required
                                          </Badge>
                                        )}
                                        {arg.description && (
                                          <span className="ml-1">- {arg.description}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No prompts available for this MCP server
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
