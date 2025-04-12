"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { MaintenanceSchedule } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { checkAdminAuth } from "../utils";

// Get current maintenance schedule
export async function getCurrentMaintenanceSchedule(): Promise<
  ServerActionResult<MaintenanceSchedule | null>
> {
  await checkAdminAuth("SUPER_ADMIN");

  const schedule = await prisma.maintenanceSchedule.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  return {
    success: true,
    data: schedule,
  };
}

// Create or update maintenance schedule
export async function upsertMaintenanceSchedule(data: {
  isActive: boolean;
  startTime: Date;
  endTime: Date;
  notificationTime: Date;
  affectedAreas: string;
  maintenanceMessage: string;
}): Promise<ServerActionResult<MaintenanceSchedule>> {
  const user = await checkAdminAuth("SUPER_ADMIN");

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

  const currentSchedule = await prisma.maintenanceSchedule.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  let result;
  if (currentSchedule) {
    // Update existing schedule
    result = await prisma.maintenanceSchedule.update({
      where: { id: currentSchedule.id },
      data,
    });
  } else {
    // Create new schedule
    result = await prisma.maintenanceSchedule.create({
      data,
    });
  }

  revalidatePath("/admin/maintenance");

  return {
    success: true,
    data: result,
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

  // Find active maintenance schedule
  const schedule = await prisma.maintenanceSchedule.findFirst({
    where: {
      isActive: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!schedule) {
    return {
      isInMaintenance: false,
      showNotification: false,
      maintenanceData: null,
    };
  }

  // Check if current time is within maintenance window
  const isInMaintenance = now >= schedule.startTime && now <= schedule.endTime;

  // Check if notification should be shown (after notification time but before maintenance ends)
  const showNotification = now >= schedule.notificationTime && now <= schedule.endTime;

  return {
    isInMaintenance,
    showNotification,
    maintenanceData: {
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      message: schedule.maintenanceMessage,
    },
  };
}
