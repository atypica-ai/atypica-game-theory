"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { generatePodcastAudioFromScriptAction } from "./actions";

interface GenerationResult {
  podcastId: number;
  token: string;
  objectUrl: string;
  mimeType: string;
}

export function PodcastTestPageClient() {
  const [script, setScript] = useState("");
  const [locale, setLocale] = useState<"zh-CN" | "en-US" | "auto">("auto");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!script.trim()) {
      setError("Please enter a script");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await generatePodcastAudioFromScriptAction({
        script: script.trim(),
        locale,
      });

      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.success === false ? response.message : "Failed to generate audio");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setScript("");
    setLocale("auto");
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Podcast Audio Test</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Test audio generation and script parsing by inputting a script directly. This skips script
          generation and only tests the audio generation pipeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Script Input</CardTitle>
            <CardDescription>
              Enter the podcast script. Use markers like 【Guy】, 【Ira】, 【凯】, 【艾拉】 to
              indicate different speakers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locale">Language</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as typeof locale)}>
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="zh-CN">Chinese (zh-CN)</SelectItem>
                  <SelectItem value="en-US">English (en-US)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="script">Podcast Script</Label>
              <Textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Enter your podcast script here...&#10;&#10;Example:&#10;【Guy】Welcome to today's podcast...&#10;【Ira】That's a great point..."
                className="min-h-[300px] font-mono text-sm"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                The script will be parsed to detect speakers and generate audio accordingly.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Audio generated successfully!</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/artifacts/podcast/${result.token}/share`}
                      target="_blank"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Listen to Podcast
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/admin/studies/podcasts?search=${result.token}`}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View in Podcasts
                    </Link>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Podcast ID: {result.podcastId}</p>
                  <p>Token: {result.token}</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isGenerating || !script.trim()}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Audio...
              </>
            ) : (
              "Generate Audio"
            )}
          </Button>
          {result && (
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
