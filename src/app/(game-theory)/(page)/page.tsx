import { fetchSessionCountsByGameType } from "@/app/(game-theory)/actions";
import { GameTheoryHome } from "./HomeView";

export default async function HomePage() {
  const countsResult = await fetchSessionCountsByGameType();
  const sessionCounts = countsResult.success ? countsResult.data : {};
  return <GameTheoryHome sessionCounts={sessionCounts} />;
}
