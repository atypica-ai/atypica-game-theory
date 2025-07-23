"use client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Bot, Copy, ExternalLink, MessageSquare, Share2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  createPersonaInterviewSession,
  fetchAvailablePersonas,
  generateProjectShareToken,
} from "../actions";
import { InterviewProjectWithSessions } from "../types";

interface ProjectDetailsProps {
  project: InterviewProjectWithSessions;
}

interface Persona {
  id: number;
  name: string;
  prompt: string;
  source: string;
}

export function ProjectDetails({ project }: ProjectDetailsProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [personaLoading, setPersonaLoading] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getSessionStats = () => {
    const humanSessions = project.sessions.filter((s) => s.intervieweeUserId).length;
    const personaSessions = project.sessions.filter((s) => s.intervieweePersonaId).length;
    return { humanSessions, personaSessions, total: project.sessions.length };
  };

  const handleGenerateShareLink = async () => {
    setLoading(true);
    try {
      const result = await generateProjectShareToken(project.id, 24);
      if (result.success) {
        setShareToken(result.data.shareToken);
        setShareUrl(`${window.location.origin}${result.data.shareUrl}`);
        toast.success("Share link generated successfully");
      } else {
        toast.error(result.message || "Failed to generate share link");
      }
    } catch (error) {
      toast.error("Failed to generate share link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const loadPersonas = async () => {
    try {
      const result = await fetchAvailablePersonas();
      if (result.success) {
        setPersonas(result.data);
      } else {
        toast.error(result.message || "Failed to load personas");
      }
    } catch (error) {
      toast.error("Failed to load personas");
    }
  };

  const handleCreatePersonaInterview = async () => {
    if (!selectedPersonaId) {
      toast.error("Please select a persona");
      return;
    }

    setPersonaLoading(true);
    try {
      const result = await createPersonaInterviewSession({
        projectId: project.id,
        personaId: parseInt(selectedPersonaId, 10),
      });

      if (result.success) {
        toast.success("Interview session created successfully");
        setPersonaDialogOpen(false);
        setSelectedPersonaId("");
        // Navigate to the interview session
        window.location.href = `/chat/${result.data.chatToken}`;
      } else {
        toast.error(result.message || "Failed to create interview session");
      }
    } catch (error) {
      toast.error("Failed to create interview session");
    } finally {
      setPersonaLoading(false);
    }
  };

  const stats = getSessionStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Interview Project #{project.id}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Created {formatDate(project.createdAt)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={handleGenerateShareLink}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Share Interview Project</DialogTitle>
                <DialogDescription>
                  Generate a shareable link for others to participate in interviews for this
                  project. The link will expire in 24 hours.
                </DialogDescription>
              </DialogHeader>
              {shareUrl && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="share-url">Share URL</Label>
                    <div className="flex space-x-2">
                      <Input id="share-url" value={shareUrl} readOnly className="flex-1" />
                      <Button onClick={handleCopyLink} size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Note:</strong> Anyone with this link can participate in an interview
                      for this project. The link will expire in 24 hours for security.
                    </p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={personaDialogOpen} onOpenChange={setPersonaDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={loadPersonas}>
                <Bot className="h-4 w-4 mr-2" />
                Interview AI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Interview AI Persona</DialogTitle>
                <DialogDescription>
                  Select an AI persona to conduct an interview with. The interview will start
                  automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="persona-select">Select Persona</Label>
                  <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a persona to interview" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id.toString()}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{persona.name}</span>
                            <span className="text-xs text-gray-500 truncate max-w-[300px]">
                              {persona.prompt.slice(0, 100)}...
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPersonaDialogOpen(false)}
                  disabled={personaLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePersonaInterview}
                  disabled={!selectedPersonaId || personaLoading}
                >
                  {personaLoading ? "Creating..." : "Start Interview"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Project Brief */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Project Brief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {project.brief}
          </p>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Interview sessions conducted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Human Interviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.humanSessions}</div>
            <p className="text-xs text-muted-foreground">Real people interviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Interviews</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.personaSessions}</div>
            <p className="text-xs text-muted-foreground">AI personas interviewed</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Sessions</CardTitle>
          <CardDescription>All interview sessions conducted for this project</CardDescription>
        </CardHeader>
        <CardContent>
          {project.sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No interviews yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Share the project link or interview an AI persona to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {session.intervieweeUserId ? (
                      <Badge variant="default" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        Human
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Bot className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    )}
                    <div>
                      <p className="font-medium text-sm">Session #{session.id}</p>
                      <p className="text-xs text-gray-500">{formatDate(session.createdAt)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
