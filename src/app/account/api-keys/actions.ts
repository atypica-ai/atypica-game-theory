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
  return withAuth(async (user, userType) => {
    try {
      // Only personal users can access personal API keys
      if (userType !== "Personal") {
        return {
          success: false,
          message: "Only personal users can access personal API keys",
          code: "forbidden",
        };
      }

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
 * Generate API Key for personal user
 */
export async function generateUserApiKeyAction(): Promise<ServerActionResult<ApiKeyData>> {
  const t = await getTranslations("AccountPage.ApiKeyActions");
  return withAuth(async (user, userType) => {
    try {
      // Only personal users can generate personal API keys
      if (userType !== "Personal") {
        return {
          success: false,
          message: "Only personal users can generate personal API keys",
          code: "forbidden",
        };
      }

      if (!user.email) {
        return {
          success: false,
          message: "User email is required",
          code: "internal_server_error",
        };
      }

      const apiKeyData = await generateApiKey({
        userId: user.id,
        createdByEmail: user.email,
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
 * Delete user API key by ID
 */
export async function deleteUserApiKeyAction(apiKeyId: number): Promise<ServerActionResult<null>> {
  const t = await getTranslations("AccountPage.ApiKeyActions");
  return withAuth(async (user, userType) => {
    try {
      // Only personal users can delete personal API keys
      if (userType !== "Personal") {
        return {
          success: false,
          message: "Only personal users can delete personal API keys",
          code: "forbidden",
        };
      }

      await deleteApiKey(apiKeyId);

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
