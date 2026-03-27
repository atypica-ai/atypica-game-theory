import { fetchGameSession } from "@/app/(game-theory)/actions";
import { NotFound } from "@/components/NotFound";
import { GameView } from "../GameView";

export const dynamic = "force-dynamic";

export default async function GameReplayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await fetchGameSession(token);

  // Only completed sessions have a replay
  if (!result.success || result.data.status !== "completed") {
    return <NotFound />;
  }

  return <GameView initialData={result.data} token={token} replay={true} />;
}
