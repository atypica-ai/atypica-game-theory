import type { Team, TeamExtra, User } from "@/prisma/client";

/**
 * API Key owner type
 * Either a personal user or a team
 */
export type ApiKeyOwner =
  | {
      type: "user";
      user: Pick<User, "id" | "name"> & {
        password?: never;
      } & (
          | {
              email: null;
              teamIdAsMember: number;
              teamAsMember: Pick<Team, "id" | "name">;
              personalUserId: number;
              personalUser: Pick<User, "id" | "name"> & { email: string };
            }
          | {
              email: string;
              teamIdAsMember?: null;
              personalUserId?: null;
            }
        );
    }
  | {
      type: "team";
      team: Pick<Team, "id" | "name" | "seats"> & {
        extra: TeamExtra;
      };
    };

/**
 * API Key data returned to client
 */
export interface ApiKeyData {
  id: number;
  key: string;
  createdAt: Date;
  createdByEmail: string;
}
