import { prismaRO } from "@/prisma/prisma";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

// Type definitions for maintenance config
interface MaintenanceConfig {
  isActive: boolean;
  startTime: Date | string;
  endTime: Date | string;
  notificationTime: Date | string;
  affectedAreas: string;
  maintenanceMessage: string;
}

// System config key for maintenance settings
const MAINTENANCE_CONFIG_KEY = "maintenance_settings";

// Cache the maintenance status check for 5 minutes
const getCachedMaintenanceStatus = unstable_cache(
  async () => {
    const now = new Date();

    // Get maintenance config
    const configRecord = await prismaRO.systemConfig.findUnique({
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
      maintenanceData:
        isInMaintenance || showNotification
          ? {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              message: config.maintenanceMessage,
            }
          : null,
    };
  },
  ["maintenance-status"],
  {
    revalidate: 300, // 5 minutes in seconds
    tags: ["maintenance-status"],
  },
);

export async function GET() {
  try {
    const status = await getCachedMaintenanceStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking maintenance status:", error);
    return NextResponse.json(
      {
        isInMaintenance: false,
        showNotification: false,
        maintenanceData: null,
        error: "Failed to check maintenance status",
      },
      { status: 500 },
    );
  }
}
