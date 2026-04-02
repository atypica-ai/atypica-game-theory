import { fetchAllSessions } from "@/app/(game-theory)/actions";
import { PastGamesView } from "./PastGamesView";

export default async function GamesPage() {
  const result = await fetchAllSessions();
  const sessions = result.success ? result.data : [];
  return <PastGamesView sessions={sessions} />;
}
