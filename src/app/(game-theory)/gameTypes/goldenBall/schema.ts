import z from "zod/v3";

export const goldenBallActionSchema = z.object({
  action: z
    .enum(["split", "steal"])
    .describe(
      '"split": share the pot if no one steals, or keep your share if 2+ players steal. "steal": take the entire pot (50 pts) if you are the only one who steals — but get nothing if others also steal.',
    ),
});

export type GoldenBallAction = z.infer<typeof goldenBallActionSchema>;
