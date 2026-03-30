import { z } from "zod";
import { launchGameSession } from "@/app/(game-theory)/lib/launch";

const bodySchema = z.object({
  gameType: z.string().min(1),
  personaIds: z.array(z.number().int().positive()).min(1),
});

export async function POST(request: Request): Promise<Response> {
  // Optional API key check — required when GAME_API_KEY env var is set.
  const expectedKey = process.env.GAME_API_KEY;
  if (expectedKey) {
    const provided = request.headers.get("x-api-key");
    if (provided !== expectedKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { gameType, personaIds } = parsed.data;

  try {
    const { token } = await launchGameSession(gameType, personaIds); // useAfter: true (default)
    return Response.json({ token }, { status: 200 });
  } catch (error) {
    const message = (error as Error).message;
    // Distinguish between client errors (bad input) and server errors
    if (
      message.includes("Unknown game type") ||
      message.includes("requires") ||
      message.includes("already running")
    ) {
      const status = message.includes("already running") ? 409 : 400;
      return Response.json({ error: message }, { status });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
