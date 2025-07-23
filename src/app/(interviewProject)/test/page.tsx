"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, Plus, Users } from "lucide-react";
import Link from "next/link";

export default function TestPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Interview Project System Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the new interview project functionality
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Interview Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create and manage research interview projects
              </p>
              <Link href="/projects">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Go to Projects
                </Button>
              </Link>
              <div className="mt-2 text-xs text-gray-500">Create and manage interview projects</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Human Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share links for real people to participate in interviews
              </p>
              <Link href="/projects">
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Create Share Link
                </Button>
              </Link>
              <div className="mt-2 text-xs text-gray-500">Available after creating a project</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                AI Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Interview AI personas to gather insights
              </p>
              <Link href="/projects">
                <Button variant="outline" className="w-full">
                  <Bot className="h-4 w-4 mr-2" />
                  Start AI Interview
                </Button>
              </Link>
              <div className="mt-2 text-xs text-gray-500">
                Select a persona from project details
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>• Create interview projects with research briefs</p>
                <p>• Generate secure share links for participants</p>
                <p>• Interview AI personas automatically</p>
                <p>• Manage all sessions in one place</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works:</h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>Create an interview project with your research brief</li>
            <li>Share a secure link with participants or select an AI persona</li>
            <li>Conduct interviews through our chat interface</li>
            <li>Manage and review all sessions from your project dashboard</li>
          </ol>

          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <div className="flex justify-center">
              <Link href="/projects">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Get Started Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
