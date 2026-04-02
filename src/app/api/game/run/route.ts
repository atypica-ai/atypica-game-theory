import { NextResponse } from "next/server";

// Moved to /api/internal/game-run
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "This endpoint has moved to /api/internal/game-run" },
    { status: 410 },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
