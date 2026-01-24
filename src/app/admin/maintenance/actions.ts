"use server";
import { checkAdminAuth } from "@/app/admin/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { InputJsonValue } from "@prisma/client/runtime/client";
import { revalidatePath } from "next/cache";

// Type definitions for maintenance config
export interface MaintenanceConfig {
  isActive: boolean;
  startTime: Date;
  endTime: Date;
  notificationTime: Date;
  affectedAreas: string;
  maintenanceMessage: string;
}

// System config key for maintenance settings
const MAINTENANCE_CONFIG_KEY = "maintenance_settings";

// Get current maintenance schedule from system config
export async function getCurrentMaintenanceSchedule(): Promise<
  ServerActionResult<MaintenanceConfig | null>
> {
  await checkAdminAuth("SUPER_ADMIN");

  const config = await prisma.systemConfig.findUnique({
    where: { key: MAINTENANCE_CONFIG_KEY },
  });

  if (!config) {
    return {
      success: true,
      data: null,
    };
  }

  const maintenanceConfig = config.value as unknown as MaintenanceConfig;

  // Parse date strings back to Date objects
  return {
    success: true,
    data: {
      ...maintenanceConfig,
      startTime: new Date(maintenanceConfig.startTime),
      endTime: new Date(maintenanceConfig.endTime),
      notificationTime: new Date(maintenanceConfig.notificationTime),
    },
  };
}

// Create or update maintenance schedule in system config
export async function upsertMaintenanceSchedule(
  data: MaintenanceConfig,
): Promise<ServerActionResult<MaintenanceConfig>> {
  await checkAdminAuth("SUPER_ADMIN");

  // Validate inputs
  if (data.startTime >= data.endTime) {
    return {
      success: false,
      message: "Start time must be before end time",
    };
  }

  if (data.notificationTime > data.startTime) {
    return {
      success: false,
      message: "Notification time must be before or equal to start time",
    };
  }

  // Upsert the maintenance config
  await prisma.systemConfig.upsert({
    where: { key: MAINTENANCE_CONFIG_KEY },
    update: {
      value: data as unknown as InputJsonValue,
      updatedAt: new Date(),
    },
    create: {
      key: MAINTENANCE_CONFIG_KEY,
      value: data as unknown as InputJsonValue,
    },
  });

  revalidatePath("/admin/maintenance");

  return {
    success: true,
    data: data,
  };
}
