import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { beforeAll, describe, expect, it, vi } from "vitest";

// import "../scripts/mock-server-only";
vi.mock("server-only", () => ({}));

describe("mergeExtra", () => {
  beforeAll(async () => {
    // Create user with id 2 if it doesn't exist
    const existingUser = await prisma.user.findUnique({
      where: { id: 2 },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: 2,
          email: "test-merge-extra@example.com",
          name: "Test User for mergeExtra",
          password: "",
          extra: {},
        },
      });
    }
  });

  it("should merge extra data with simple key-value", async () => {
    // First merge: simple string value
    await mergeExtra({
      tableName: "User",
      extra: { preference: "dark_mode" },
      id: 2,
    });

    const user = await prisma.user.findUnique({
      where: { id: 2 },
      select: { extra: true },
    });

    expect(user?.extra).toMatchObject({
      preference: "dark_mode",
    });
  });

  it("should merge extra data with value containing apostrophe", async () => {
    // Second merge: value with apostrophe (')
    await mergeExtra({
      tableName: "User",
      extra: { note: "user's favorite setting" },
      id: 2,
    });

    const user = await prisma.user.findUnique({
      where: { id: 2 },
      select: { extra: true },
    });

    expect(user?.extra).toMatchObject({
      preference: "dark_mode",
      note: "user's favorite setting",
    });
  });
});
