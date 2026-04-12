import { fetchSessionCountsByGameType, fetchGameStatsBatch } from "@/app/(game-theory)/actions";
import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { GameTheoryHome } from "./HomeView";

export default async function HomePage() {
  const distKeys = Object.keys(gameTypeRegistry).map((gt) => `distribution:${gt}`);
  const [countsResult, statsResult] = await Promise.all([
    fetchSessionCountsByGameType(),
    fetchGameStatsBatch(distKeys),
  ]);
  const sessionCounts = countsResult.success ? countsResult.data : {};
  const distributionStats = statsResult.success ? statsResult.data : {};
  return <GameTheoryHome sessionCounts={sessionCounts} distributionStats={distributionStats} />;
}
