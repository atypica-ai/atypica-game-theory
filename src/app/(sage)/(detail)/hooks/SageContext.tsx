"use client";
import { getSageByTokenAction } from "@/app/(sage)/(detail)/actions";
import { SageExtra } from "@/app/(sage)/types";
import { ExtractServerActionData } from "@/lib/serverAction";
import type { Sage } from "@/prisma/client";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type SageStatus = "ready" | "processing" | "timeout" | "error";

// Sage type with typed fields
export type SageWithTypedFields = ExtractServerActionData<typeof getSageByTokenAction>;

// Helper function to determine sage status
export function sageProcessingStatus(sage: Pick<Sage, "id"> & { extra: SageExtra }): SageStatus {
  if (sage.extra.error) {
    return "error";
  } else if (sage.extra.processing) {
    if (Date.now() - sage.extra.processing.startsAt < 30 * 60 * 1000) {
      return "processing";
    } else {
      return "timeout";
    }
  } else {
    return "ready";
  }
}

// Context type
interface SageContextValue {
  sage: SageWithTypedFields;
  status: SageStatus;
  updateSage: (newSage: SageWithTypedFields) => void;
}

// Create context
const SageContext = createContext<SageContextValue | null>(null);

// Provider component
export function SageStatusProvider({
  initialSage,
  children,
}: {
  initialSage: SageWithTypedFields;
  children: ReactNode;
}) {
  const [sage, setSage] = useState<SageWithTypedFields>(initialSage);
  const status = sageProcessingStatus(sage);

  useEffect(() => {
    setSage(initialSage);
  }, [initialSage]);

  const updateSage = (newSage: SageWithTypedFields) => {
    setSage(newSage);
  };

  return (
    <SageContext.Provider value={{ sage, status, updateSage }}>{children}</SageContext.Provider>
  );
}

// Hook to use the context
export function useSageContext() {
  const context = useContext(SageContext);
  if (!context) {
    throw new Error("useSageContext must be used within SageStatusProvider");
  }
  return context;
}
