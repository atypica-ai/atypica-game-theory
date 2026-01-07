import { MemoryPageClient } from "./MemoryPageClient";

interface MemoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MemoryPage({ searchParams }: MemoryPageProps) {
  const params = await searchParams;
  const userId = params.userId ? parseInt(String(params.userId), 10) : undefined;
  const teamId = params.teamId ? parseInt(String(params.teamId), 10) : undefined;

  return <MemoryPageClient userId={userId} teamId={teamId} />;
}
