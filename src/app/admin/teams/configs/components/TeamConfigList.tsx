"use client";

import { TeamConfigName } from "@/app/team/teamConfig/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate } from "@/lib/utils";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  FlaskConicalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Fragment, useState } from "react";

interface TeamWithConfigs {
  id: number;
  name: string;
  configs: Array<{
    key: string;
    value: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

interface TeamConfigListProps {
  teams: TeamWithConfigs[];
  onAddConfig: (team: TeamWithConfigs) => void;
  onEditConfig: (team: TeamWithConfigs, key: string, value: unknown) => void;
  onDeleteConfig: (teamId: number, key: TeamConfigName) => void;
  onTestMcp: (teamId: number) => void;
}

export function TeamConfigList({
  teams,
  onAddConfig,
  onEditConfig,
  onDeleteConfig,
  onTestMcp,
}: TeamConfigListProps) {
  const locale = useLocale();
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());

  const toggleExpand = (teamId: number) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Team ID</TableHead>
            <TableHead>Team Name</TableHead>
            <TableHead>Configs</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No teams found.
              </TableCell>
            </TableRow>
          ) : (
            teams.map((team) => (
              <Fragment key={team.id}>
                <TableRow className={cn(expandedTeams.has(team.id) && "bg-muted/50")}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleExpand(team.id)}
                    >
                      {expandedTeams.has(team.id) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{team.id}</TableCell>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-sm">
                      {team.configs.length} configs
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddConfig(team)}
                      className="h-8"
                    >
                      <PlusIcon className="h-3.5 w-3.5 mr-1" />
                      Add Config
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedTeams.has(team.id) && (
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={5} className="p-4 pt-0">
                      <div className="rounded-md border bg-background">
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
                            {team.configs.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="h-24 text-center text-muted-foreground"
                                >
                                  No configurations set for this team.
                                </TableCell>
                              </TableRow>
                            ) : (
                              team.configs.map((config) => {
                                const valuePreview =
                                  typeof config.value === "object"
                                    ? JSON.stringify(config.value).substring(0, 100) + "..."
                                    : String(config.value).substring(0, 100);

                                return (
                                  <TableRow key={config.key}>
                                    <TableCell className="font-mono text-sm">
                                      <Badge variant="outline">{config.key}</Badge>
                                    </TableCell>
                                    <TableCell
                                      className="font-mono text-xs text-muted-foreground max-w-md truncate"
                                      title={JSON.stringify(config.value, null, 2)}
                                    >
                                      {valuePreview}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                      {formatDate(config.updatedAt, locale)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        {config.key === TeamConfigName.mcp && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => onTestMcp(team.id)}
                                            title="Test MCP metadata"
                                          >
                                            <FlaskConicalIcon className="h-4 w-4 text-blue-500" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() =>
                                            onEditConfig(team, config.key, config.value)
                                          }
                                        >
                                          <EditIcon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive"
                                          onClick={() =>
                                            onDeleteConfig(team.id, config.key as TeamConfigName)
                                          }
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
