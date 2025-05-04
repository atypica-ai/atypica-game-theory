"use client";
import { InterviewProjectWithSessions } from "@/app/interviewProject/actions";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { InterviewSession } from "@prisma/client";
import { Copy, DownloadIcon, Share2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createCollectSession } from "../actions";

type ExtendedInterviewProject = InterviewProjectWithSessions & {
  clarifySession?: (InterviewSession & { userChat?: { id: number } }) | null;
  brief?: string | null;
};

export function InterviewProjectDetail({ project }: { project: ExtendedInterviewProject }) {
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // If there's no clarify session yet, we should redirect to create one (shouldn't happen with new design)
  const handleStartClarifySession = () => {
    if (project.clarifySession) {
      router.push(`/interviewProject/clarify/${project.clarifySession.token}`);
    } else {
      toast.error("No clarify session found. Please contact support.");
    }
  };

  // Group sessions by type (collect only since clarify is special now)
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
              {project.brief && (
                <p className="text-muted-foreground mt-2 max-w-2xl">{project.brief}</p>
              )}
              {!project.brief && project.clarifySession && (
                <p className="text-muted-foreground mt-2 max-w-2xl">
                  Click "Clarify Project" to define your research brief and objectives.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Create Collect Session
              </Button>

              <Button onClick={handleStartClarifySession} disabled={isCreatingSession}>
                <Users className="mr-2 h-4 w-4" />
                {isCreatingSession ? "Loading..." : "Clarify Project"}
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

                  {project.objectives && project.objectives.length > 0 && (
                    <div>
                      <div className="text-sm font-medium">Research Objectives</div>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                        {project.objectives.map((objective, i) => (
                          <li key={i}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(!project.objectives || project.objectives.length === 0) &&
                    project.clarifySession && (
                      <div>
                        <div className="text-sm font-medium">Research Objectives</div>
                        <div className="text-muted-foreground mt-1 italic">
                          No objectives defined yet. Use the "Clarify Project" button to define your
                          research objectives.
                        </div>
                      </div>
                    )}
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
              <Tabs defaultValue="collect-sessions">
                <TabsList className="mb-4">
                  <TabsTrigger value="collect-sessions" className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    Collect Sessions
                    <Badge className="ml-2 bg-primary/20 text-foreground" variant="secondary">
                      {collectSessions.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

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
                        <CollectSessionCard key={session.id} session={session} />
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

function CollectSessionCard({ session }: { session: InterviewProjectWithSessions["sessions"][0] }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [collectLink, setCollectLink] = useState<string | null>(null);

  useEffect(() => {
    setCollectLink(`${window.location.origin}/interviewProject/collect/${session.token}`);
  }, [session.token]);

  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-500",
    completed: "bg-blue-500/20 text-blue-700 dark:text-blue-500",
    pending: "bg-amber-500/20 text-amber-700 dark:text-amber-500",
  };

  const handleCopyLink = useCallback(() => {
    if (!collectLink) return;
    navigator.clipboard.writeText(collectLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    toast.success("Link copied to clipboard");
  }, [collectLink]);

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HippyGhostAvatar seed={session.token} className="w-6 h-6 mr-2" />
            <CardTitle className="text-base">{session.title}</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={cn("ml-2 capitalize", statusColors[session.status])}
          >
            {session.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-3 flex-grow">
        <div className="text-xs text-muted-foreground flex justify-between mb-2">
          <span>Created {formatDate(session.createdAt)}</span>
          {session.expiresAt && <span>Expires {formatDate(session.expiresAt)}</span>}
        </div>

        {session.notes && (
          <div className="text-sm text-muted-foreground mt-1 mb-2">{session.notes}</div>
        )}

        <div className="mt-2">
          <div className="text-sm font-medium mb-1">Share Link:</div>
          <div className="bg-muted p-2 rounded-md flex items-center justify-between">
            <span className="text-xs truncate mr-2">{collectLink}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={handleCopyLink} className="h-6 px-2">
                    {copySuccess ? "Copied!" : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy link</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {session.keyInsights && session.keyInsights.length > 0 && (
          <div className="mt-3">
            <div
              className="text-sm font-medium mb-1 flex items-center cursor-pointer"
              onClick={() => setShowInsights(!showInsights)}
            >
              Key Insights:
              <Button variant="ghost" size="sm" className="ml-1 h-5 px-1">
                {showInsights ? "Hide" : "Show"}
              </Button>
            </div>
            {showInsights && (
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                {session.keyInsights.map((insight, i) => (
                  <li key={i} className="line-clamp-2">
                    {insight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="px-4 py-3 border-t bg-muted/30 flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => window.open(`/interviewProject/collect/${session.token}`, "_blank")}
        >
          View Session
        </Button>
      </CardFooter>
    </Card>
  );
}

const collectSessionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  notes: z.string().optional(),
  expiresIn: z.string(),
  expirationEnabled: z.boolean(),
});

type CollectSessionFormValues = z.infer<typeof collectSessionSchema>;

function CreateCollectSessionDialog({
  projectToken,
  open,
  onOpenChange,
}: {
  projectToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const form = useForm<CollectSessionFormValues>({
    resolver: zodResolver(collectSessionSchema),
    defaultValues: {
      title: "",
      expiresIn: "7", // 7 days default
      expirationEnabled: true,
    },
  });

  const watchExpirationEnabled = form.watch("expirationEnabled");

  const onSubmit = async (data: z.infer<typeof collectSessionSchema>) => {
    setIsCreating(true);
    try {
      // Calculate expiration date if enabled
      let expiresAt = undefined;
      if (data.expirationEnabled) {
        const days = parseInt(data.expiresIn);
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }

      const result = await createCollectSession(projectToken, {
        title: data.title,
        notes: data.notes,
        expiresAt,
      });

      if (result.success) {
        toast.success("Collect session created successfully");
        form.reset(); // Reset form for next time
        onOpenChange(false); // Close dialog
      } else {
        toast.error(`Failed to create collect session: ${result.message}`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a collect session</DialogTitle>
          <DialogDescription>
            Share this with anyone to collect research data without requiring them to create an
            account.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Customer Feedback" {...field} />
                  </FormControl>
                  <FormDescription>This will be visible to respondents.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Briefly describe what this session is for..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expirationEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Expiration <span className="text-muted-foreground">(Optional)</span>
                    </FormLabel>
                    <FormDescription>Set a time limit for collecting responses.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-readonly />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchExpirationEnabled && (
              <FormField
                control={form.control}
                name="expiresIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires After</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="1" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            1 day
                            <span className="text-muted-foreground"> (Expires in 24 hours)</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="7" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            7 days
                            <span className="text-muted-foreground"> (Recommended)</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="30" />
                          </FormControl>
                          <FormLabel className="font-normal">30 days</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="sm:justify-start">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create & Copy Link"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
