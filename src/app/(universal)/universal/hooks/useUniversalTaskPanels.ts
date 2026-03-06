"use client";

import { UniversalTaskVM } from "@/app/(universal)/universal/task-vm";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useUniversalTaskPanels(tasks: UniversalTaskVM[]) {
  const [selectedTaskCallId, setSelectedTaskCallId] = useState<string | null>(null);
  const [autoFollowLatestTask, setAutoFollowLatestTask] = useState(true);

  const hasTasks = tasks.length > 0;
  const allTasksCompleted = useMemo(
    () => hasTasks && tasks.every((task) => task.status !== "running"),
    [hasTasks, tasks],
  );
  const collapseMiddlePanel = hasTasks && allTasksCompleted;

  useEffect(() => {
    if (!tasks.length) {
      if (selectedTaskCallId !== null) setSelectedTaskCallId(null);
      return;
    }

    const fallbackTask = tasks.find((task) => task.status === "running") ?? tasks[0];
    if (autoFollowLatestTask) {
      if (selectedTaskCallId !== fallbackTask.toolCallId) {
        setSelectedTaskCallId(fallbackTask.toolCallId);
      }
      return;
    }

    if (selectedTaskCallId && !tasks.some((task) => task.toolCallId === selectedTaskCallId)) {
      setSelectedTaskCallId(fallbackTask.toolCallId);
    }
  }, [autoFollowLatestTask, selectedTaskCallId, tasks]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.toolCallId === selectedTaskCallId) ?? null,
    [tasks, selectedTaskCallId],
  );

  const selectTask = useCallback((toolCallId: string) => {
    setSelectedTaskCallId(toolCallId);
    setAutoFollowLatestTask(false);
  }, []);

  const openTaskDetailFromToolUI = useCallback(
    ({ toolCallId }: { toolCallId: string }) => {
      const task = tasks.find((item) => item.toolCallId === toolCallId);
      if (!task) return;
      selectTask(task.toolCallId);
    },
    [selectTask, tasks],
  );

  return {
    hasTasks,
    collapseMiddlePanel,
    selectedTaskCallId,
    selectedTask,
    selectTask,
    openTaskDetailFromToolUI,
  };
}
