"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLinkIcon, Loader2Icon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { testGeneratePodcastAudioAction } from "./actions";

interface PodcastTestResult {
  podcastToken: string;
  generatedAt: Date;
}

const LOCALES = [
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "en-US", label: "English (US)" },
];

// Sample podcast scripts for testing
const SAMPLE_SCRIPTS = {
  "zh-CN": `【凯】AI，也就是人工智能现在这么火，但它到底能不能像我们人一样进行那种，你懂的，勾心斗角式的策略思考？今天我们就来看一个由Atypical AI设计的特别有意思的博弈论测试，看看AI到底行不行。

【艾拉】没错，我们今天要聊的核心问题——AI真的能像一个策略大师那样思考吗？你看这已经不是简单的算算术了，这里面涉及到预测、反预测，甚至可以说是读心术，这可就复杂了。

【凯】对，就是这样。所以在这个测试中，我们请AI去扮演不同的角色，让它们在一个博弈环境中进行决策。结果会怎样呢？`,
  "en-US": `【Guy】AI, artificial intelligence is so hot right now, but can it really think strategically like us humans do? Today we're looking at a particularly interesting game theory test designed by Atypical AI to see if AI really has what it takes.

【Ira】Exactly, the core question we're discussing today—can AI really think like a strategic master? Look, this isn't just simple arithmetic anymore, this involves prediction, counter-prediction, you could even say mind-reading, and that's complicated.

【Guy】That's right. So in this test, we ask AI to play different roles and make decisions in a game theory environment. What are the results?`,
};

export function PodcastAudioTestClient() {
  const [script, setScript] = useState(SAMPLE_SCRIPTS["zh-CN"]);
  const [locale, setLocale] = useState("zh-CN");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PodcastTestResult | null>(null);

  const handleLoadSample = useCallback((selectedLocale: string) => {
    setScript(SAMPLE_SCRIPTS[selectedLocale as keyof typeof SAMPLE_SCRIPTS] || "");
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!script.trim()) {
      setError("Script cannot be empty");
      return;
    }

    if (!locale) {
      setError("Please select a locale");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await testGeneratePodcastAudioAction({
        script: script.trim(),
        locale,
      });

      if (!response.success || !response.podcastToken) {
        setError(response.error || "Failed to generate podcast audio");
        toast.error(response.error || "Failed to generate podcast audio");
        return;
      }

      setResult({
        podcastToken: response.podcastToken,
        generatedAt: new Date(),
      });

      toast.success("Podcast audio generated successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [script, locale]);

  const handleLocaleChange = useCallback(
    (newLocale: string) => {
      setLocale(newLocale);
      handleLoadSample(newLocale);
    },
    [handleLoadSample],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold">Podcast Audio Generation Test</h1>
        <p className="text-muted-foreground">
          Test the podcast audio generation functionality with custom scripts and locales.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Configure script and locale for podcast audio generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Locale Selection */}
          <div className="space-y-2">
            <Label htmlFor="locale">Locale</Label>
            <Select value={locale} onValueChange={handleLocaleChange}>
              <SelectTrigger id="locale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Script Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="script">Podcast Script</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleLoadSample(locale)}
              >
                Load Sample
              </Button>
            </div>
            <Textarea
              id="script"
              placeholder="Enter podcast script with speaker markers like 【Host Name】"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="font-mono text-sm min-h-[300px]"
            />
            <p className="text-xs text-muted-foreground">
              Script size: {script.length} characters. Use 【Host Name】 format for speaker markers.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <p className="font-medium">Error:</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !script.trim()}
            size="lg"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Generating Audio... (This may take 2-5 minutes)
              </>
            ) : (
              <>
                <PlayIcon className="mr-2 h-4 w-4" />
                Generate Podcast Audio
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Card */}
      {result && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-200">
              Generation Successful!
            </CardTitle>
            <CardDescription className="text-green-800 dark:text-green-300">
              Your podcast audio has been generated and stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Podcast Token */}
            <div className="rounded-lg bg-white p-4 dark:bg-slate-950">
              <Label className="text-xs font-medium text-muted-foreground">
                Podcast Token
              </Label>
              <Input
                type="text"
                value={result.podcastToken}
                readOnly
                className="font-mono text-sm mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Generated at: {result.generatedAt.toLocaleString()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="default"
                asChild
                className="flex-1"
              >
                <Link
                  href={`/artifacts/podcast/${result.podcastToken}/share`}
                  target="_blank"
                  className="flex items-center justify-center gap-2"
                >
                  <PlayIcon className="h-4 w-4" />
                  Play Audio
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
              >
                <Link
                  href={`/admin/podcast-audio-test`}
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  New Test
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This test tool generates podcast audio directly from your script using the
            production <code className="bg-muted px-1">generatePodcastAudio</code> function.
          </p>
          <div>
            <p className="font-medium text-foreground mb-2">Script Format:</p>
            <p>
              Use speaker markers like <code className="bg-muted px-1">【Host Name】</code> to
              indicate speaker changes. The system will automatically:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Detect the number of speakers in your script</li>
              <li>Parse and clean the text</li>
              <li>Split long segments into manageable chunks</li>
              <li>Generate high-quality audio using Volcano TTS</li>
              <li>Upload the final audio to S3 storage</li>
            </ul>
          </div>
          <p>
            After generation, you can play the audio directly or share it using the provided
            link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

