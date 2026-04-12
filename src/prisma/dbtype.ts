import type { GameTimeline } from "@/app/(game-theory)/types";
import type { StatsData as StatsDataType } from "@/app/(game-theory)/lib/stats/types";
import type { TournamentState as TournamentStateType } from "@/app/(game-theory)/tournament/types";
import type { Locale as LocaleType } from "next-intl";
import type * as client from "./client";

// https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields#typed-json-fields
// 文件放在哪都行，只需要被 tsconfig.json 引用，同时在项目里被引入 (在 ./prisma.ts 里) 就可以
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Prisma requires global namespace for JSON field types
  namespace PrismaJson {
    // User and Team
    type TeamExtra = client.TeamExtra;

    // Persona
    type PersonaExtra = client.PersonaExtra;

    // GameSession
    type GameSessionTimeline = GameTimeline;

    // Tournament
    type TournamentState = TournamentStateType;

    // GameStats
    type StatsData = StatsDataType;

    // Locale (used in Persona.locale)
    type Locale = LocaleType;
  }
}

export {};
