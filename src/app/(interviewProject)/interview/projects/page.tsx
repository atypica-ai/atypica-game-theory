import { Metadata } from "next";
import { Suspense } from "react";
import { InterviewProjectsList } from "./InterviewProjectsList";

export const metadata: Metadata = {
  title: "Interview Projects",
  description: "Manage your interview projects",
};

export default function InterviewProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Interview Projects
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage your research interview projects
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          }
        >
          <InterviewProjectsList />
        </Suspense>
      </div>
    </div>
  );
}
