import { fetchPersonasForGame } from "@/app/(game-theory)/actions";
import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { Metadata } from "next";
import { GameTypeInfo, NewGameClient } from "./NewGameClient";

export const metadata: Metadata = {
  title: "New Experiment · Game Theory Lab",
};

export default async function NewGamePage() {
  const personasResult = await fetchPersonasForGame();
  const personas = personasResult.success ? personasResult.data : [];

  const gameTypes: GameTypeInfo[] = Object.values(gameTypeRegistry).map((gt) => ({
    name: gt.name,
    displayName: gt.displayName,
    tagline: gt.tagline,
    punchline: gt.punchline,
    minPlayers: gt.minPlayers,
    maxPlayers: gt.maxPlayers,
    horizonLabel:
      gt.horizon.type === "fixed"
        ? `FIXED · ${gt.horizon.rounds} ROUNDS`
        : gt.horizon.type === "indefinite"
          ? `INDEFINITE · δ=${gt.horizon.discountFactor}`
          : "CONDITION-BASED",
    discussionRounds: gt.discussionRounds,
  }));

  return <NewGameClient gameTypes={gameTypes} personas={personas} />;
}
