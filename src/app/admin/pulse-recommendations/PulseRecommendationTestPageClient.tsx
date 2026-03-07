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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExtractServerActionData } from "@/lib/serverAction";
import { throwServerActionError } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "next-intl";
import { testPulseRecommendation } from "./actions";

type TestResult = ExtractServerActionData<typeof testPulseRecommendation>;

export function PulseRecommendationTestPageClient() {
  const locale = useLocale();
  const [userId, setUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const userIdNum = parseInt(userId, 10);

    if (!userId || isNaN(userIdNum) || userIdNum <= 0) {
      toast.error("Please enter a valid user ID");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const testResult = await testPulseRecommendation(userIdNum);
      if (!testResult.success) {
        throwServerActionError(testResult);
      }
      setResult(testResult.data);
      toast.success(`Successfully generated ${testResult.data.pulseCount} recommendations`);
    } catch (err) {
      const errorMessage = (err as Error).message || "Failed to test recommendation";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pulse Recommendation Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the pulse recommendation system for a specific user
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Recommendation</CardTitle>
          <CardDescription>
            Enter a user ID to generate personalized pulse recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                type="number"
                placeholder="Enter user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isLoading}
                min="1"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Generating Recommendations...
                </>
              ) : (
                <>
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendation Results</CardTitle>
              <CardDescription>
                Generated {result.pulseCount} pulse recommendation{result.pulseCount !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Success</Label>
                  <p className="font-medium">{result.success ? "Yes" : "No"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Pulse Count</Label>
                  <p className="font-medium">{result.pulseCount}</p>
                </div>
                {result.recommendation?.method && (
                  <div>
                    <Label className="text-muted-foreground">Method</Label>
                    <div className="mt-1">
                      <Badge variant={result.recommendation.method === "memory_based" ? "default" : "secondary"}>
                        {result.recommendation.method}
                      </Badge>
                    </div>
                  </div>
                )}
                {result.recommendation?.createdAt && (
                  <div>
                    <Label className="text-muted-foreground">Generated At</Label>
                    <p className="font-medium">{formatDate(result.recommendation.createdAt, locale)}</p>
                  </div>
                )}
              </div>

              {result.recommendation?.reasoning && (
                <div>
                  <Label className="text-muted-foreground">Reasoning</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {result.recommendation.reasoning}
                  </p>
                </div>
              )}

              {result.pulseIds.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Pulse IDs</Label>
                  <p className="mt-1 text-sm font-mono bg-muted p-3 rounded-md">
                    [{result.pulseIds.join(", ")}]
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

              {result.pulses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Pulses</CardTitle>
                <CardDescription>
                  Details of the {result.pulses.length} recommended pulse{result.pulses.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Angle</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.pulses.map((pulse) => {
                      const recommendation = result.recommendations?.find((r) => r.pulseId === pulse.id);
                      return (
                        <TableRow key={pulse.id}>
                          <TableCell className="font-mono">{pulse.id}</TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="font-medium">{pulse.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {pulse.content}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {recommendation?.angle ? (
                              <div className="max-w-md">
                                <p className="text-sm italic text-primary">{recommendation.angle}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">No angle provided</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{pulse.category.name}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(pulse.createdAt, locale)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {result.pulses.length === 0 && result.pulseCount === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No pulses were recommended. This could be because:
                </p>
                <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
                  <li>No fresh pulses are available (created in last 24 hours)</li>
                  <li>The user has no memory and random selection found no pulses</li>
                  <li>An error occurred during recommendation generation</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
