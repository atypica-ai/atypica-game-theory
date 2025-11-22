import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { beforeAll, describe, expect, it, vi } from "vitest";

// import "../scripts/mock-server-only";
vi.mock("server-only", () => ({}));

describe("mergeExtra", () => {
  let testUserProfileId: number;

  beforeAll(async () => {
    // Create user and userProfile for testing
    const existingUser = await prisma.user.findUnique({
      where: { email: "test-merge-extra@example.com" },
      include: { profile: true },
    });

    if (!existingUser) {
      const user = await prisma.user.create({
        data: {
          email: "test-merge-extra@example.com",
          name: "Test User for mergeExtra",
          password: "",
          profile: {
            create: {
              extra: {},
            },
          },
        },
        include: { profile: true },
      });
      testUserProfileId = user.profile!.id;
    } else {
      if (!existingUser.profile) {
        const profile = await prisma.userProfile.create({
          data: {
            userId: existingUser.id,
            extra: {},
          },
        });
        testUserProfileId = profile.id;
      } else {
        testUserProfileId = existingUser.profile.id;
      }
    }
  });

  it("should merge extra data with simple key-value", async () => {
    // First merge: simple string value
    await mergeExtra({
      tableName: "UserProfile",
      extra: { preference: "dark_mode" },
      id: testUserProfileId,
    });

    const userProfile = await prisma.userProfile.findUnique({
      where: { id: testUserProfileId },
      select: { extra: true },
    });

    expect(userProfile?.extra).toMatchObject({
      preference: "dark_mode",
    });
  });

  it("should merge extra data with value containing apostrophe", async () => {
    // Second merge: value with apostrophe (')
    await mergeExtra({
      tableName: "UserProfile",
      extra: { note: "user's favorite setting" },
      id: testUserProfileId,
    });

    const userProfile = await prisma.userProfile.findUnique({
      where: { id: testUserProfileId },
      select: { extra: true },
    });

    expect(userProfile?.extra).toMatchObject({
      preference: "dark_mode",
      note: "user's favorite setting",
    });
  });
});
