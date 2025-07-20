"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageCircle, Target, Upload, Users } from "lucide-react";
import Link from "next/link";

export default function PersonaHomePage() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Persona Management</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Import interview records, analyze completeness, and generate interactive personas for
            your research and analysis needs.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5" />
                Import Interview
              </CardTitle>
              <CardDescription>
                Upload PDF interview records and convert them to structured, LLM-compatible format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-4" />
                  <span>PDF to Markdown conversion</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="size-4" />
                  <span>4-dimension analysis & scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4" />
                  <span>Supplementary question generation</span>
                </div>
              </div>
              <Link href="/persona-import">
                <Button className="w-full">Start Import Process</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Chat with Personas
              </CardTitle>
              <CardDescription>
                Interact with generated personas based on your interview data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4" />
                  <span>Natural conversation interface</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="size-4" />
                  <span>Behavior-driven responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4" />
                  <span>Multi-dimensional personality</span>
                </div>
              </div>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Dimensions */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Dimensions</CardTitle>
            <CardDescription>
              Our system evaluates interview completeness across four key socio-psychological
              dimensions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-blue-500" />
                  <h4 className="font-medium">Demographic</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Social identity and growth trajectory analysis including age, education,
                  occupation, and background.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-green-500" />
                  <h4 className="font-medium">Psychological</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Personality traits, emotional patterns, and internal motivations reflected in
                  behavior.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="size-5 text-orange-500" />
                  <h4 className="font-medium">Behavioral Economics</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consumer behavior, decision preferences, and social influence patterns.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-purple-500" />
                  <h4 className="font-medium">Political Cognition</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cultural stance, information trust structures, and community belonging analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these simple steps to create your first persona
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Upload Interview PDF</h4>
                  <p className="text-sm text-muted-foreground">
                    Start by uploading a PDF containing your interview transcripts or records.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Review Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Examine the completeness scores and identify areas that need additional
                    information.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Gather Additional Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the generated supplementary questions to collect missing information.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted-foreground text-muted text-sm font-bold flex items-center justify-center mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground">
                    Generate Persona (Coming Soon)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Create an interactive persona that embodies the analyzed characteristics.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
