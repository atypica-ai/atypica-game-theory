/**
 * Client-side types for Sage detail pages
 * These types are used by both server and client components
 */

/**
 * Sage statistics data structure
 */
export interface SageStats {
  /** Core memory version (latest memory document version) */
  memoryVersion: number;
  /** Number of unresolved knowledge gaps */
  gapsCount: number;
  /** Total number of interviews */
  interviewsCount: number;
  /** Total number of user chats */
  chatsCount: number;

  /** Total number of knowledge sources */
  sourcesTotal: number;
  /** Number of sources with extracted text */
  sourcesExtracted: number;

  /** Number of pending working memory items */
  workingMemoryPendingCount: number;
}

/**
 * Sage activity item for timeline display
 */
export type SageActivity = {
  /** Composite ID: "source-123" | "gap-456" | "memory-1" */
  id: string;
  /** Activity type for visual styling */
  type: "info" | "success" | "warning" | "error";
  /** Activity title */
  title: string;
  /** Activity description */
  description: string;
  /** Activity timestamp */
  timestamp: Date;
  /** Lucide icon name */
  icon: string;
  /** Optional link to view details */
  link?: {
    href: string;
    label: string;
  };
};

/**
 * Sage processing status
 */
export type SageProcessingStatus = "ready" | "processing" | "timeout" | "error";
