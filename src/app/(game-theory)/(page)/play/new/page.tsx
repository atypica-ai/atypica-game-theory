import authOptions from "@/app/(auth)/authOptions";
import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { GameTypeInfo } from "../../game/new/NewGameClient";
import { HumanNewGameClient } from "./HumanNewGameClient";

export const metadata: Metadata = {
  title: "Play · Game Theory Lab",
};

export default async function PlayNewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/play/new")}`);
  }

  const gameTypes: GameTypeInfo[] = Object.values(gameTypeRegistry).map((gt) => ({
    name: gt.name,
    displayName: gt.displayName,
    tagline: gt.tagline,
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

  return (
    <HumanNewGameClient
      gameTypes={gameTypes}
      user={{ id: session.user.id, name: session.user.name ?? "You" }}
    />
  );
}
