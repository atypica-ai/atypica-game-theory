"use client";

import type { MCPMetadata } from "@/ai/tools/mcp/client";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import {
  AlertTriangleIcon,
  EditIcon,
  FileTextIcon,
  FlaskConicalIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  TrashIcon,
  WrenchIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchTeamsWithConfigs,
  removeTeamConfig,
  testTeamMcpMetadata,
  upsertTeamConfig,
} from "./actions";

type TeamWithConfigs = ExtractServerActionData<typeof fetchTeamsWithConfigs>[number];

export function TeamConfigsPageClient() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWithConfigs[]>([]);
  const [error, setError] = useState("");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithConfigs | null>(null);
  const [selectedConfigKey, setSelectedConfigKey] = useState<TeamConfigName | "">("");
  const [configValue, setConfigValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MCP Test Dialog state
  const [isMcpTestDialogOpen, setIsMcpTestDialogOpen] = useState(false);
  const [mcpTestTeamId, setMcpTestTeamId] = useState<number | null>(null);
  const [mcpMetadata, setMcpMetadata] = useState<MCPMetadata[]>([]);
  const [isLoadingMcpMetadata, setIsLoadingMcpMetadata] = useState(false);
  const [mcpTestError, setMcpTestError] = useState<string>("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const result = await fetchTeamsWithConfigs();
    if (!result.success) {
      setError(result.message);
      toast.error("Failed to load teams", {
        description: result.message,
      });
    } else {
      setTeams(result.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/team-configs");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const openAddDialog = (team: TeamWithConfigs) => {
    setSelectedTeam(team);
    setSelectedConfigKey("");
    setConfigValue("");
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (team: TeamWithConfigs, key: string, value: unknown) => {
    setSelectedTeam(team);
    setSelectedConfigKey(key as TeamConfigName);
    setConfigValue(JSON.stringify(value, null, 2));
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (teamId: number, key: TeamConfigName) => {
    if (!confirm(`Are you sure you want to delete config "${key}" for this team?`)) {
      return;
    }

    const result = await removeTeamConfig(teamId, key);
    if (result.success) {
      toast.success("Config deleted successfully");
      fetchData();
    } else {
      toast.error("Failed to delete config", {
        description: result.message,
      });
    }
  };

  const handleTestMcp = async (teamId: number) => {
    setMcpTestTeamId(teamId);
    setIsMcpTestDialogOpen(true);
    setIsLoadingMcpMetadata(true);
    setMcpTestError("");
    setMcpMetadata([]);

    const result = await testTeamMcpMetadata(teamId);
    if (result.success && result.data) {
      setMcpMetadata(result.data);
      toast.success("MCP metadata loaded successfully");
    } else {
      const errorMessage = "message" in result ? result.message : "Failed to load MCP metadata";
      setMcpTestError(errorMessage);
      toast.error("Failed to load MCP metadata", {
        description: errorMessage,
      });
    }
    setIsLoadingMcpMetadata(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !selectedConfigKey) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Validate JSON
      const parsedValue = JSON.parse(configValue);

      const result = await upsertTeamConfig(
        selectedTeam.id,
        selectedConfigKey as TeamConfigName,
        parsedValue,
      );

      if (result.success) {
        toast.success(isEditing ? "Config updated successfully" : "Config added successfully");
        setIsDialogOpen(false);
        fetchData();
      } else {
        setError(result.message);
        toast.error("Failed to save config", {
          description: result.message,
        });
      }
    } catch (parseError) {
      const message = `Invalid JSON: ${(parseError as Error).message}`;
      setError(message);
      toast.error("Invalid JSON", {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available config keys (not yet set for the team)
  const getAvailableKeys = (team: TeamWithConfigs): TeamConfigName[] => {
    const existingKeys = new Set(team.configs.map((c) => c.key));
    return Object.values(TeamConfigName).filter((key) => !existingKeys.has(key));
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading team configs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Configurations</h1>
          <p className="text-muted-foreground mt-1">
            Manage team-specific configurations for MCP and system prompts
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={isLoading}>
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">No teams found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Team: {team.name}</CardTitle>
                    <CardDescription>Team ID: {team.id}</CardDescription>
                  </div>
                  {getAvailableKeys(team).length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => openAddDialog(team)}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Config
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {team.configs.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No configurations set for this team
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Value Preview</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.configs.map((config) => {
                        const valuePreview =
                          typeof config.value === "object"
                            ? JSON.stringify(config.value).substring(0, 100) + "..."
                            : String(config.value).substring(0, 100);
                        return (
                          <TableRow key={config.key}>
                            <TableCell className="font-mono text-sm">
                              <Badge variant="secondary">{config.key}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground max-w-md truncate">
                              {valuePreview}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(config.updatedAt, locale)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {config.key === TeamConfigName.mcp && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTestMcp(team.id)}
                                    title="Test MCP metadata"
                                  >
                                    <FlaskConicalIcon className="h-4 w-4 text-blue-500" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(team, config.key, config.value)}
                                >
                                  <EditIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDelete(team.id, config.key as TeamConfigName)
                                  }
                                >
                                  <TrashIcon className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Configuration" : "Add Configuration"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? `Edit config "${selectedConfigKey}" for team "${selectedTeam?.name}"`
                : `Add a new configuration for team "${selectedTeam?.name}"`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="config-key">Config Key</Label>
                {isEditing ? (
                  <Input id="config-key" value={selectedConfigKey} disabled className="font-mono" />
                ) : (
                  <select
                    id="config-key"
                    value={selectedConfigKey}
                    onChange={(e) => setSelectedConfigKey(e.target.value as TeamConfigName | "")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">Select a config key...</option>
                    {selectedTeam &&
                      getAvailableKeys(selectedTeam).map((key) => (
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
                  onChange={(e) => setConfigValue(e.target.value)}
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
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedConfigKey}>
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

      {/* MCP Test Dialog */}
      <Dialog open={isMcpTestDialogOpen} onOpenChange={setIsMcpTestDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>MCP Metadata Test</DialogTitle>
            <DialogDescription>
              Testing MCP configuration for team ID: {mcpTestTeamId}
            </DialogDescription>
          </DialogHeader>

          {isLoadingMcpMetadata ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading MCP metadata...</p>
              </div>
            </div>
          ) : mcpTestError ? (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-600 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="h-4 w-4" />
                {mcpTestError}
              </div>
            </div>
          ) : mcpMetadata.length === 0 ? (
            <div className="text-center py-8">
              <ServerIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No MCP servers configured for this team.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mcpMetadata.map((mcp) => (
                <Card key={mcp.name}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ServerIcon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">{mcp.name}</CardTitle>
                        <Badge variant="secondary">{mcp.tools.length} tools</Badge>
                        {mcp.resources.length > 0 && (
                          <Badge variant="outline">{mcp.resources.length} resources</Badge>
                        )}
                        {mcp.prompts.length > 0 && (
                          <Badge variant="outline">{mcp.prompts.length} prompts</Badge>
                        )}
                      </div>
                    </div>
                    {mcp.prompt && <CardDescription className="mt-2">{mcp.prompt}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="tools" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="tools">
                          <WrenchIcon className="h-4 w-4 mr-2" />
                          Tools ({mcp.tools.length})
                        </TabsTrigger>
                        <TabsTrigger value="resources">
                          <FileTextIcon className="h-4 w-4 mr-2" />
                          Resources ({mcp.resources.length + mcp.resourceTemplates.length})
                        </TabsTrigger>
                        <TabsTrigger value="prompts">
                          <FileTextIcon className="h-4 w-4 mr-2" />
                          Prompts ({mcp.prompts.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="tools" className="mt-4">
                        {mcp.tools.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {mcp.tools.map((toolName) => (
                              <div
                                key={toolName}
                                className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                              >
                                <div className="font-medium text-sm mb-1">{toolName}</div>
                                {mcp.toolDescriptions[toolName] ? (
                                  <p className="text-xs text-muted-foreground">
                                    {mcp.toolDescriptions[toolName]}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">
                                    No description available
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No tools available for this MCP server
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="resources" className="mt-4">
                        <div className="space-y-4">
                          {mcp.resources.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <FileTextIcon className="h-4 w-4" />
                                Available Resources ({mcp.resources.length})
                              </h3>
                              <div className="grid gap-3 md:grid-cols-2">
                                {mcp.resources.map((resource) => (
                                  <div
                                    key={resource.uri}
                                    className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                                  >
                                    <div className="font-medium text-sm mb-1">
                                      {resource.title || resource.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      <code className="bg-background px-1 py-0.5 rounded">
                                        {resource.uri}
                                      </code>
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
                            <p className="text-sm text-muted-foreground">
                              No resources or resource templates available for this MCP server
                            </p>
                          )}
                        </div>
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
                                {prompt.title && (
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {prompt.title}
                                  </div>
                                )}
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
                                        <div
                                          key={arg.name}
                                          className="text-xs text-muted-foreground"
                                        >
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
                          <p className="text-sm text-muted-foreground">
                            No prompts available for this MCP server
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsMcpTestDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
