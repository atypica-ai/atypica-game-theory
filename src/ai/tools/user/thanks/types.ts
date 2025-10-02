import z from "zod/v3";

export const thanksInputSchema = z.object({
  name: z.string().describe("User's full name for follow-up contact"),
  company: z.string().describe("Company or organization name"),
  title: z.string().describe("Professional job title or role"),
  contact: z.string().describe("Contact information (email or phone number for follow-up)"),
});

export const thanksOutputSchema = z.object({
  plainText: z.string(),
});

export type ThanksResult = z.infer<typeof thanksOutputSchema>;
