import { fetchGameSession } from "@/app/(game-theory)/actions";
import { NotFound } from "@/components/NotFound";
import { GameView } from "./GameView";

export const dynamic = "force-dynamic";

export default async function GameSessionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await fetchGameSession(token);

  if (!result.success) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <GameView initialData={result.data} token={token} />
    </div>
  );
}
