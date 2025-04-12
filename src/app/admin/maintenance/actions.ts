"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";
import { checkAdminAuth } from "../utils";

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

// Public action to check if system is in maintenance mode
export async function checkMaintenanceStatus(): Promise<{
  isInMaintenance: boolean;
  showNotification: boolean;
  maintenanceData: {
    startTime: Date;
    endTime: Date;
    message: string;
  } | null;
}> {
  const now = new Date();

  // Get maintenance config
  const configRecord = await prisma.systemConfig.findUnique({
    where: { key: MAINTENANCE_CONFIG_KEY },
  });

  if (!configRecord) {
    return {
      isInMaintenance: false,
      showNotification: false,
      maintenanceData: null,
    };
  }

  const config = configRecord.value as unknown as MaintenanceConfig;

  if (!config.isActive) {
    return {
      isInMaintenance: false,
      showNotification: false,
      maintenanceData: null,
    };
  }

  const startTime = new Date(config.startTime);
  const endTime = new Date(config.endTime);
  const notificationTime = new Date(config.notificationTime);

  // Check if current time is within maintenance window
  const isInMaintenance = now >= startTime && now <= endTime;

  // Check if notification should be shown (after notification time but before maintenance ends)
  const showNotification = now >= notificationTime && now <= endTime;

  return {
    isInMaintenance,
    showNotification,
    maintenanceData: {
      startTime: startTime,
      endTime: endTime,
      message: config.maintenanceMessage,
    },
  };
}
