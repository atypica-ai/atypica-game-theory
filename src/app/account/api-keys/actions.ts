"use server";

import { deleteApiKey, generateApiKey, listApiKeys } from "@/lib/apiKey/lib";
import type { ApiKeyData } from "@/lib/apiKey/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { getTranslations } from "next-intl/server";

/**
 * List user API keys
 */
export async function listUserApiKeysAction(): Promise<ServerActionResult<ApiKeyData[]>> {
  const t = await getTranslations("AccountPage.ApiKeyActions");
  return withAuth(async (user) => {
    try {
      const apiKeys = await listApiKeys({ userId: user.id });

      return {
        success: true,
        data: apiKeys,
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to list user API keys", error });
      return {
        success: false,
        message: t("list.failed"),
        code: "internal_server_error",
      };
    }
  });
}

/**
 * Generate API Key for user (personal user or team member)
 */
export async function generateUserApiKeyAction(): Promise<ServerActionResult<ApiKeyData>> {
  const t = await getTranslations("AccountPage.ApiKeyActions");
  return withAuth(async (user) => {
    try {
      const email = user.email; // session 上的 user 永远有 email 的
      const apiKeyData = await generateApiKey({
        userId: user.id,
        createdByEmail: email,
      });
      return {
        success: true,
        data: apiKeyData,
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to generate user API key", error });
      return {
        success: false,
        message: t("generate.failed"),
        code: "internal_server_error",
      };
    }
  });
}

/**
 * Delete user API key by ID with ownership verification
 */
export async function deleteUserApiKeyAction(apiKeyId: number): Promise<ServerActionResult<null>> {
  const t = await getTranslations("AccountPage.ApiKeyActions");
  return withAuth(async (user) => {
    try {
      // Delete with userId verification - ensures user can only delete their own keys
      await deleteApiKey(apiKeyId, { userId: user.id });

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      rootLogger.error({ msg: "Failed to delete user API key", error });
      return {
        success: false,
        message: t("delete.failed"),
        code: "internal_server_error",
      };
    }
  });
}
