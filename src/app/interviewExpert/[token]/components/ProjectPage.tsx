"use client";
import { InterviewExpertProjectWithSessions } from "@/app/interviewExpert/actions";
import GlobalHeader from "@/components/GlobalHeader";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import UserTokensBalance from "@/components/UserTokensBalance";
import { cn, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  DownloadIcon,
  ExternalLink,
  FileText,
  PlusCircle,
  SendIcon,
  Share2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createInterviewSession, createShareableSession } from "../../actions";

export function ProjectPage({ project }: { project: InterviewExpertProjectWithSessions }) {
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleStartNewSession = async () => {
    setIsCreatingSession(true);
    try {
      const result = await createInterviewSession(project.token);
      if (result.success) {
        router.push(`/interviewExpert/session/${result.data.token}`);
      } else {
        toast.error(`Failed to create session: ${result.message}`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Group sessions by type and status
  const mySessions = project.sessions.filter((s) => s.type !== "shareable");
  const shareableSessions = project.sessions.filter((s) => s.type === "shareable");

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalHeader>
        <Button variant="ghost" asChild>
          <Link href="/interviewExpert">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        <UserTokensBalance />
      </GlobalHeader>

      <main className="flex-1 container max-w-6xl mx-auto py-8">
        <div className="flex flex-col space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <HippyGhostAvatar seed={project.token} className="h-10 w-10" />
                <h1 className="text-3xl font-bold">{project.title}</h1>
              </div>
              <p className="text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Create Shared Interview
              </Button>

              <Button onClick={handleStartNewSession} disabled={isCreatingSession}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {isCreatingSession ? "Creating..." : "Start New Interview"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium">Project Type</div>
                    <div className="text-muted-foreground">{project.type}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Created</div>
                    <div className="text-muted-foreground">{formatDate(project.createdAt)}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Last Updated</div>
                    <div className="text-muted-foreground">{formatDate(project.updatedAt)}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Research Objectives</div>
                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                      {project.objectives.map((objective, i) => (
                        <li key={i}>{objective}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button variant="outline" size="sm">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </CardFooter>
            </Card>

            <div className="lg:col-span-2">
              <Tabs defaultValue="my-interviews">
                <TabsList className="mb-4">
                  <TabsTrigger value="my-interviews" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    My Interviews
                    <Badge className="ml-2 bg-primary/20 text-foreground" variant="secondary">
                      {mySessions.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="shared-interviews" className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    Shared Interviews
                    <Badge className="ml-2 bg-primary/20 text-foreground" variant="secondary">
                      {shareableSessions.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="my-interviews">
                  {mySessions.length === 0 ? (
                    <EmptySessionsState onStartNewSession={handleStartNewSession} />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mySessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          projectToken={project.token}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="shared-interviews">
                  {shareableSessions.length === 0 ? (
                    <div className="text-center p-12 border border-dashed rounded-lg">
                      <div className="flex justify-center mb-4">
                        <Share2 className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No shared interviews yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Create shared interviews to collect insights from others without requiring
                        them to create an account.
                      </p>
                      <Button onClick={() => setIsShareDialogOpen(true)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Create Shared Interview
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {shareableSessions.map((session) => (
                        <ShareableSessionCard
                          key={session.id}
                          session={session}
                          projectToken={project.token}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      <CreateShareableSessionDialog
        projectToken={project.token}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </div>
  );
}

function EmptySessionsState({ onStartNewSession }: { onStartNewSession: () => void }) {
  return (
    <div className="text-center p-12 border border-dashed rounded-lg">
      <div className="flex justify-center mb-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No interviews yet</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        Start a new interview to gather information and insights for your project.
      </p>
      <Button onClick={onStartNewSession}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Start New Interview
      </Button>
    </div>
  );
}

function SessionCard({
  session,
  projectToken,
}: {
  session: InterviewExpertProjectWithSessions["sessions"][0];
  projectToken: string;
}) {
  const router = useRouter();

  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-500",
    completed: "bg-blue-500/20 text-blue-700 dark:text-blue-500",
    pending: "bg-amber-500/20 text-amber-700 dark:text-amber-500",
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{session.title}</CardTitle>
          <Badge className={cn("ml-2", statusColors[session.status as keyof typeof statusColors])}>
            {session.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 py-0">
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <Calendar className="mr-1 h-4 w-4" />
          <span>{formatDate(session.createdAt)}</span>
        </div>

        {session.summaryPoints && session.summaryPoints.length > 0 ? (
          <div>
            <div className="text-sm font-medium mb-2">Key Insights</div>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {session.summaryPoints.slice(0, 3).map((point, i) => (
                <li key={i} className="line-clamp-1">
                  {point}
                </li>
              ))}
              {session.summaryPoints.length > 3 && (
                <li className="text-primary">+{session.summaryPoints.length - 3} more points</li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No insights gathered yet.</p>
        )}
      </CardContent>
      <CardFooter className="pt-3">
        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={() => router.push(`/interviewExpert/session/${session.token}`)}
        >
          {session.status === "active" ? "Continue Interview" : "View Results"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ShareableSessionCard({
  session,
  projectToken,
}: {
  session: InterviewExpertProjectWithSessions["sessions"][0];
  projectToken: string;
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  const shareableLink = `${window.location.origin}/interviewExpert/shared/${session.token}`;

  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-500",
    completed: "bg-blue-500/20 text-blue-700 dark:text-blue-500",
    pending: "bg-amber-500/20 text-amber-700 dark:text-amber-500",
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{session.title}</CardTitle>
          <Badge className={cn("ml-2", statusColors[session.status as keyof typeof statusColors])}>
            {session.status === "pending" ? "Not used yet" : session.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 py-0">
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <Calendar className="mr-1 h-4 w-4" />
          <span>Created: {formatDate(session.createdAt)}</span>
        </div>

        {session.description && (
          <p className="text-sm text-muted-foreground mb-3">{session.description}</p>
        )}

        <div className="bg-muted rounded-md p-2 flex items-center text-xs overflow-hidden my-2">
          <span className="truncate flex-1">{shareableLink}</span>
          <Button variant="ghost" size="sm" className="ml-2 h-7 w-7 p-0" onClick={handleCopyLink}>
            {copySuccess ? (
              <Badge variant="outline" className="bg-green-500/20 text-green-700 border-0">
                Copied!
              </Badge>
            ) : (
              <SendIcon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {session.expiresAt && (
          <div className="text-xs text-muted-foreground">
            Expires: {formatDate(session.expiresAt)}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyLink}>
          Copy Link
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => window.open(`/interviewExpert/shared/${session.token}`, "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open
        </Button>
      </CardFooter>
    </Card>
  );
}

function CreateShareableSessionDialog({
  projectToken,
  open,
  onOpenChange,
}: {
  projectToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateShareable = async () => {
    if (!title.trim()) {
      toast.error("Please provide a title for the shared interview");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays || "30"));

      const result = await createShareableSession(projectToken, {
        title: title.trim(),
        description: description.trim() || undefined,
        expiresAt: expiresAt,
      });

      if (result.success) {
        toast.success("Shared interview created successfully!");
        onOpenChange(false);
      } else {
        toast.error(`Failed to create shared interview: ${result.message}`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Shared Interview</DialogTitle>
          <DialogDescription>
            Create a sharable interview link that you can send to others to collect information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="E.g., Customer Feedback Survey"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              placeholder="Provide context for the person being interviewed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Expires After (days)</label>
            <Input
              type="number"
              min="1"
              max="365"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The shared link will expire after this many days.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateShareable} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Creating..." : "Create Shared Interview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
