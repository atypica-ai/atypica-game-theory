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
  return withAuth(async (user, userType) => {
    try {
      // Get email based on user type
      let email: string;
      if (userType === "Personal") {
        // Personal user must have email
        if (!user.email) {
          return {
            success: false,
            message: "Personal user email is required",
            code: "internal_server_error",
          };
        }
        email = user.email;
      } else {
        // Team member user - get email from personalUser
        if (!user.personalUser?.email) {
          return {
            success: false,
            message: "Team member email is required",
            code: "internal_server_error",
          };
        }
        email = user.personalUser.email;
      }

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
