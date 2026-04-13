import { fetchGameStats, fetchGameStatsBatch } from "@/app/(game-theory)/actions";
import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { StatsPageView } from "./StatsPageView";

const GAME_TYPES = Object.keys(gameTypeRegistry);

// Games that support discussion (discussionRounds > 0 by default)
const DISCUSSION_GAMES = Object.values(gameTypeRegistry)
  .filter((gt) => gt.discussionRounds > 0)
  .map((gt) => gt.name);

export default async function StatsPage() {
  // Fetch all stats in parallel
  const modelCompKeys = GAME_TYPES.map((gt) => `model-comparison:${gt}`);
  const discussionKeys = DISCUSSION_GAMES.map((gt) => `discussion-effect:${gt}`);

  const [
    modelWinRate,
    modelCompBatch,
    discussionBatch,
    leaderboard,
    tagWinRate,
  ] = await Promise.all([
    fetchGameStats("model-winrate:overall"),
    fetchGameStatsBatch(modelCompKeys),
    fetchGameStatsBatch(discussionKeys),
    fetchGameStats("leaderboard:overall"),
    fetchGameStats("tag-winrate:overall"),
  ]);

  return (
    <StatsPageView
      modelWinRate={modelWinRate.success ? modelWinRate.data : null}
      modelComparisons={modelCompBatch.success ? modelCompBatch.data : {}}
      discussionEffects={discussionBatch.success ? discussionBatch.data : {}}
      leaderboard={leaderboard.success ? leaderboard.data : null}
      tagWinRate={tagWinRate.success ? tagWinRate.data : null}
      gameTypes={GAME_TYPES}
      discussionGames={DISCUSSION_GAMES}
    />
  );
}
