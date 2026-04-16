import { fetchGameSession } from "@/app/(game-theory)/actions";
import { NotFound } from "@/components/NotFound";
import { redirect } from "next/navigation";
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

  // Redirect completed games to cinematic replay
  if (result.data.status === "completed") {
    redirect(`/game/${token}/replay`);
  }

  return <GameView initialData={result.data} token={token} />;
}
