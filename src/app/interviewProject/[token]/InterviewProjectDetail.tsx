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
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("InterviewProject.projectDetail");
  const locale = useLocale();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // If there's no clarify session yet, we should redirect to create one (shouldn't happen with new design)
  const handleStartClarifySession = () => {
    if (project.clarifySession) {
      router.push(`/interviewProject/clarify/${project.clarifySession.token}`);
    } else {
      toast.error(t("noClarifySessionError"));
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
                <p className="text-muted-foreground mt-2 max-w-2xl">{t("clarifyPrompt")}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                {t("createCollectSession")}
              </Button>

              <Button onClick={handleStartClarifySession} disabled={isCreatingSession}>
                <Users className="mr-2 h-4 w-4" />
                {isCreatingSession ? t("loadingClarify") : t("clarifyProject")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>{t("projectDetails")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium">{t("projectCategory")}</div>
                    <div className="text-muted-foreground">{project.category}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">{t("created")}</div>
                    <div className="text-muted-foreground">
                      {formatDate(project.createdAt, locale)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">{t("lastUpdated")}</div>
                    <div className="text-muted-foreground">
                      {formatDate(project.updatedAt, locale)}
                    </div>
                  </div>

                  {project.objectives && project.objectives.length > 0 && (
                    <div>
                      <div className="text-sm font-medium">{t("researchObjectives")}</div>
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
                        <div className="text-sm font-medium">{t("researchObjectives")}</div>
                        <div className="text-muted-foreground mt-1 italic">{t("noObjectives")}</div>
                      </div>
                    )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button variant="outline" size="sm">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  {t("exportData")}
                </Button>
              </CardFooter>
            </Card>

            <div className="lg:col-span-2">
              <Tabs defaultValue="collect-sessions">
                <TabsList className="mb-4">
                  <TabsTrigger value="collect-sessions" className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    {t("collectSessionsTab")}
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
                      <h3 className="text-lg font-medium mb-2">{t("noCollectSessions")}</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        {t("noCollectSessionsDesc")}
                      </p>
                      <Button onClick={() => setIsShareDialogOpen(true)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        {t("createCollectSession")}
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
  const t = useTranslations("InterviewProject.projectDetail");
  const locale = useLocale();

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
    toast.success(t("linkCopied"));
  }, [collectLink, t]);

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
          <span>
            {t("created")} {formatDate(session.createdAt, locale)}
          </span>
          {session.expiresAt && (
            <span>
              {t("expiresOn")} {formatDate(session.expiresAt, locale)}
            </span>
          )}
        </div>

        {session.notes && (
          <div className="text-sm text-muted-foreground mt-1 mb-2">{session.notes}</div>
        )}

        <div className="mt-2">
          <div className="text-sm font-medium mb-1">{t("shareLink")}:</div>
          <div className="bg-muted p-2 rounded-md flex items-center justify-between">
            <span className="text-xs truncate mr-2">{collectLink}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={handleCopyLink} className="h-6 px-2">
                    {copySuccess ? t("copied") : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("copyLink")}</TooltipContent>
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
              {t("keyInsights")}:
              <Button variant="ghost" size="sm" className="ml-1 h-5 px-1">
                {showInsights ? t("hide") : t("show")}
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
          {t("viewSession")}
        </Button>
      </CardFooter>
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
  const [isCreating, setIsCreating] = useState(false);
  const t = useTranslations("InterviewProject.createCollectSession");

  const collectSessionSchema = z.object({
    title: z.string().min(3, t("validation.titleMin")),
    notes: z.string().optional(),
    expiresIn: z.string(),
    expirationEnabled: z.boolean(),
  });

  const form = useForm<z.infer<typeof collectSessionSchema>>({
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
        toast.success(t("toast.success"));
        form.reset(); // Reset form for next time
        onOpenChange(false); // Close dialog
      } else {
        toast.error(`${t("toast.error")}: ${result.message}`);
      }
    } catch (error) {
      toast.error(t("toast.unexpectedError"));
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("sessionTitle")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>{t("sessionTitleDesc")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notesPlaceholder")}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t("notesDesc")}</FormDescription>
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
                    <FormLabel className="text-base">{t("expiration")}</FormLabel>
                    <FormDescription>{t("expirationDesc")}</FormDescription>
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
                    <FormLabel>{t("expiresOn")}</FormLabel>
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
                            {t("day.one")}
                            <span className="text-muted-foreground"> {t("day.oneDesc")}</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="7" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t("day.seven")}
                            <span className="text-muted-foreground"> {t("day.sevenDesc")}</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="30" />
                          </FormControl>
                          <FormLabel className="font-normal">{t("day.thirty")}</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mr-2"
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
