"use client";

import { useState, useEffect } from "react";
import { fetchPulsesForMapPublic } from "./actions";
import { throwServerActionError } from "@/lib/serverAction";

interface Pulse {
  id: number;
  title: string;
  category: string;
  heatScore: number | null;
  heatDelta: number | null;
  createdAt: Date;
}

interface HeatHistoryPoint {
  date: string;
  heatScore: number;
}

interface PulseMapData {
  pulses: Pulse[];
  heatHistory: Record<number, HeatHistoryPoint[]>;
  dates: string[];
}

export function usePulseMapData(daysBack: number = 7) {
  const [data, setData] = useState<PulseMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchPulsesForMapPublic(daysBack);
        if (!result.success) {
          throwServerActionError(result);
          return;
        }

        if (!cancelled) {
          setData(result.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Failed to load pulse data");
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [daysBack]);

  return { data, isLoading, error };
}

