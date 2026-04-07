import z from "zod/v3";

export const trolleyProblemActionSchema = z.object({
  classicScenario: z
    .enum(["pull_lever", "do_nothing"])
    .describe(
      'Classic Trolley: Pull lever to divert trolley (kill 1, save 5) or do nothing (5 die). Choose "pull_lever" or "do_nothing".',
    ),
  fatManScenario: z
    .enum(["push_man", "do_nothing"])
    .describe(
      'Fat Man variant: Push large man off bridge to stop trolley (kill 1, save 5) or do nothing (5 die). Choose "push_man" or "do_nothing".',
    ),
});

export type TrolleyProblemAction = z.infer<typeof trolleyProblemActionSchema>;
