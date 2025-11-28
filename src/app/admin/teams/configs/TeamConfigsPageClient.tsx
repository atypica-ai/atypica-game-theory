"use client";

import type { MCPMetadata } from "@/ai/tools/mcp/client";
import { PaginationInfo } from "@/app/admin/types";
import { TeamConfigName } from "@/app/team/teamConfig/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { RefreshCwIcon, SearchIcon } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchTeamsWithConfigs,
  removeTeamConfig,
  testTeamMcpMetadata,
  upsertTeamConfig,
} from "./actions";
import { ConfigDialog } from "./components/ConfigDialog";
import { McpTestDialog } from "./components/McpTestDialog";
import { TeamConfigList } from "./components/TeamConfigList";

type TeamWithConfigs = ExtractServerActionData<typeof fetchTeamsWithConfigs>[number];

const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
};

type TeamsSearchParams = {
  page: number;
  search: string;
};

interface TeamConfigsPageClientProps {
  initialSearchParams: Record<string, string | number>;
}

export function TeamConfigsPageClient({ initialSearchParams }: TeamConfigsPageClientProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWithConfigs[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | undefined>();
  const [error, setError] = useState("");

  // Search state
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    values: params,
    setParam,
    setParams,
  } = useListQueryParams({
    params: SearchParamsConfig,
    initialValues: initialSearchParams as unknown as Partial<TeamsSearchParams>,
  });

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithConfigs | null>(null);
  const [selectedConfigKey, setSelectedConfigKey] = useState<string>("");
  const [configValue, setConfigValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MCP Test state
  const [isMcpTestDialogOpen, setIsMcpTestDialogOpen] = useState(false);
  const [mcpTestTeamId, setMcpTestTeamId] = useState<number | null>(null);
  const [mcpMetadata, setMcpMetadata] = useState<MCPMetadata[]>([]);
  const [isLoadingMcpMetadata, setIsLoadingMcpMetadata] = useState(false);
  const [mcpTestError, setMcpTestError] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchTeamsWithConfigs(params.page, 10, params.search);
    if (result.success) {
      if (result.data) {
        setTeams(result.data);
      }
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } else {
      setError(result.message);
      toast.error("Failed to fetch teams");
    }
    setIsLoading(false);
  }, [params.page, params.search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const searchValue = inputRef.current?.value || "";
    setParams({ search: searchValue, page: 1 });
  };

  const openAddDialog = (team: TeamWithConfigs) => {
    setSelectedTeam(team);
    setSelectedConfigKey("");
    setConfigValue("");
    setIsEditing(false);
    setError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (team: TeamWithConfigs, key: string, value: unknown) => {
    setSelectedTeam(team);
    setSelectedConfigKey(key);
    setConfigValue(JSON.stringify(value, null, 2));
    setIsEditing(true);
    setError("");
    setIsDialogOpen(true);
  };

  const handleDelete = async (teamId: number, key: TeamConfigName) => {
    if (!confirm(`Are you sure you want to delete config "${key}"?`)) {
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

    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setMcpTestError(errorMessage);
      toast.error("Failed to load MCP metadata", {
        description: errorMessage,
      });
    } finally {
      setIsLoadingMcpMetadata(false);
    }
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

  const getAvailableKeys = (team: TeamWithConfigs) => {
    const existingKeys = new Set(team.configs.map((c) => c.key));
    return Object.values(TeamConfigName).filter((key) => !existingKeys.has(key));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Configurations</h1>
          <p className="text-muted-foreground mt-1">
            Manage team-specific configurations for MCP and system prompts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search teams..."
            className="pl-9"
            defaultValue={params.search}
          />
        </form>
      </div>

      <TeamConfigList
        teams={teams}
        onAddConfig={openAddDialog}
        onEditConfig={openEditDialog}
        onDeleteConfig={handleDelete}
        onTestMcp={handleTestMcp}
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setParam("page", page)}
          />
          <div className="text-sm text-muted-foreground">
            Total: {pagination.totalCount.toLocaleString()}
          </div>
        </div>
      )}

      <ConfigDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditing={isEditing}
        teamName={selectedTeam?.name}
        configKey={selectedConfigKey}
        onConfigKeyChange={setSelectedConfigKey}
        availableKeys={selectedTeam ? getAvailableKeys(selectedTeam) : []}
        configValue={configValue}
        onConfigValueChange={setConfigValue}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        error={error}
      />

      <McpTestDialog
        open={isMcpTestDialogOpen}
        onOpenChange={setIsMcpTestDialogOpen}
        isLoading={isLoadingMcpMetadata}
        error={mcpTestError}
        metadata={mcpMetadata}
        teamId={mcpTestTeamId}
        onRetry={() => mcpTestTeamId && handleTestMcp(mcpTestTeamId)}
      />
    </div>
  );
}
