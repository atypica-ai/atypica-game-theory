"use client";
import { generateProjectShareToken } from "@/app/(interviewProject)/actions";
import { InterviewProjectWithSessions } from "@/app/(interviewProject)/types";
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
import { ArrowLeft, Bot, Copy, ExternalLink, MessageSquare, Share2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SelectPersonaDialog } from "./SelectPersonaDialog";

interface ProjectDetailsProps {
  project: InterviewProjectWithSessions;
}

export function ProjectDetails({ project }: ProjectDetailsProps) {
  const router = useRouter();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handlePersonaInterviewSuccess = () => {
    // Refresh the page to show new sessions
    router.refresh();
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

          <Button onClick={() => setPersonaDialogOpen(true)}>
            <Bot className="h-4 w-4 mr-2" />
            Interview AI
          </Button>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Navigate to chat session
                      router.push(`/projects/${project.id}/sessions/${session.id}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SelectPersonaDialog
        open={personaDialogOpen}
        onOpenChange={setPersonaDialogOpen}
        projectId={project.id}
        onSuccess={handlePersonaInterviewSuccess}
      />
    </div>
  );
}
