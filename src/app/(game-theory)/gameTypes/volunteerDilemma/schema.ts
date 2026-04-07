import z from "zod/v3";

export const volunteerDilemmaActionSchema = z.object({
  action: z
    .enum(["volunteer", "not_volunteer"])
    .describe(
      '"volunteer": risk paying cost to ensure public good. "not_volunteer": hope someone else volunteers so you can free-ride.',
    ),
});

export type VolunteerDilemmaAction = z.infer<typeof volunteerDilemmaActionSchema>;
