"use client";
import { InterviewProjectWithSessions } from "@/app/interviewProject/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Markdown } from "@/components/markdown";
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
import { cn, formatDate } from "@/lib/utils";
import { InterviewSessionStatus } from "@prisma/client";
import {
  Calendar,
  DownloadIcon,
  ExternalLink,
  FileText,
  PlusCircle,
  SendIcon,
  Share2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClarifySession, createCollectSession } from "../actions";

export function InterviewProjectDetail({ project }: { project: InterviewProjectWithSessions }) {
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleStartNewSession = async () => {
    setIsCreatingSession(true);
    try {
      const result = await createClarifySession(project.token);
      if (result.success) {
        router.push(`/interviewProject/clarify/${result.data.token}`);
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
  const mySessions = project.sessions.filter((s) => s.kind === "clarify");
  const collectSessions = project.sessions.filter((s) => s.kind === "collect");

  return (
    <>
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col space-y-8 container mx-auto py-8 px-6">
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
                Create Collect Session
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
                    <div className="text-sm font-medium">Project Category</div>
                    <div className="text-muted-foreground">{project.category}</div>
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
              <Tabs defaultValue="clarify-sessions">
                <TabsList className="mb-4">
                  <TabsTrigger value="clarify-sessions" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Clarify Sessions
                    <Badge className="ml-2 bg-primary/20 text-foreground" variant="secondary">
                      {mySessions.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="collect-sessions" className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    Collect Sessions
                    <Badge className="ml-2 bg-primary/20 text-foreground" variant="secondary">
                      {collectSessions.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="clarify-sessions">
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

                <TabsContent value="collect-sessions">
                  {collectSessions.length === 0 ? (
                    <div className="text-center p-12 border border-dashed rounded-lg">
                      <div className="flex justify-center mb-4">
                        <Share2 className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No collect sessions yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Create collect sessions to collect insights from others without requiring
                        them to create an account.
                      </p>
                      <Button onClick={() => setIsShareDialogOpen(true)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Create Collect Session
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {collectSessions.map((session) => (
                        <CollectSessionCard
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

      <CreateCollectSessionDialog
        projectToken={project.token}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </>
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
  // projectToken,
}: {
  session: InterviewProjectWithSessions["sessions"][0];
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

        {session.keyInsights && session.keyInsights.length > 0 ? (
          <div>
            <div className="text-sm font-medium mb-2">Key Insights</div>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {session.keyInsights.slice(0, 3).map((point, i) => (
                <li key={i} className="line-clamp-1">
                  {point}
                </li>
              ))}
              {session.keyInsights.length > 3 && (
                <li className="text-primary">+{session.keyInsights.length - 3} more points</li>
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
          onClick={() => router.push(`/interviewProject/clarify/${session.token}`)}
        >
          {session.status === InterviewSessionStatus.active ? "Continue Interview" : "View Results"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function CollectSessionCard({
  session,
  // projectToken,
}: {
  session: InterviewProjectWithSessions["sessions"][0];
  projectToken: string;
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const collectLink = `${window.location.origin}/interviewProject/collect/${session.token}`;

  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-500",
    completed: "bg-blue-500/20 text-blue-700 dark:text-blue-500",
    pending: "bg-amber-500/20 text-amber-700 dark:text-amber-500",
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(collectLink);
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
            {session.status === InterviewSessionStatus.pending ? "Not used yet" : session.status}
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
          <span className="truncate flex-1">{collectLink}</span>
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

        {(session.keyInsights?.length > 0 || session.summary || session.analysis) && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setShowInsights(true)}
          >
            <FileText className="mr-2 h-4 w-4" />
            View Insights
          </Button>
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
          onClick={() => window.open(`/interviewProject/collect/${session.token}`, "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open
        </Button>
      </CardFooter>

      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Insights</DialogTitle>
            <DialogDescription>
              Key information and analysis from this interview session
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-2">
            {session.keyInsights && session.keyInsights.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Key Insights</h3>
                <div className="space-y-2">
                  {session.keyInsights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="bg-primary/20 text-primary rounded-full size-5 flex items-center justify-center text-xs font-medium mt-0.5">
                        {index + 1}
                      </div>
                      <p>{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session.summary && (
              <div>
                <h3 className="text-lg font-medium mb-2">Summary</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{session.summary}</Markdown>
                </div>
              </div>
            )}

            {session.analysis && (
              <div>
                <h3 className="text-lg font-medium mb-2">Analysis</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{session.analysis}</Markdown>
                </div>
              </div>
            )}

            {!session.keyInsights?.length && !session.summary && !session.analysis && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  No insights available yet. Complete an interview session to generate insights.
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateCollectSessionDialog({
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

  const handleCreateCollectSession = async () => {
    if (!title.trim()) {
      toast.error("Please provide a title for the collect session");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays || "30"));

      const result = await createCollectSession(projectToken, {
        title: title.trim(),
        description: description.trim() || undefined,
        expiresAt: expiresAt,
      });

      if (result.success) {
        toast.success("Collect session created successfully!");
        onOpenChange(false);
      } else {
        toast.error(`Failed to create collect session: ${result.message}`);
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
          <DialogTitle>Create Collect Session</DialogTitle>
          <DialogDescription>
            Create a collect session link that you can send to others to collect information.
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
              The collect link will expire after this many days.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateCollectSession} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Creating..." : "Create Collect Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
