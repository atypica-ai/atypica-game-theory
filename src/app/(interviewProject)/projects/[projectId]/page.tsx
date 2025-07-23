import { ProjectDetails } from "@/app/(interviewProject)/components/ProjectDetails";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { fetchInterviewProjectById } from "../../actions";

interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const projectId = parseInt(params.projectId, 10);

  if (isNaN(projectId)) {
    return {
      title: "Project Not Found",
    };
  }

  const result = await fetchInterviewProjectById(projectId);

  if (!result.success) {
    return {
      title: "Project Not Found",
    };
  }

  return {
    title: `Interview Project #${projectId}`,
    description: result.data.brief.slice(0, 160),
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const projectId = parseInt(params.projectId, 10);

  if (isNaN(projectId)) {
    notFound();
  }

  const result = await fetchInterviewProjectById(projectId);

  if (!result.success) {
    if (result.code === "not_found") {
      notFound();
    }

    throw new Error(result.message || "Failed to load project");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>
        }
      >
        <ProjectDetails project={result.data} />
      </Suspense>
    </div>
  );
}
