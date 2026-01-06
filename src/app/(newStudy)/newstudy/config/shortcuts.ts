export interface StudyShortcut {
  title: string;
  description: string;
  tags: string[];
  category: string;
}

// Note: Static shortcuts are no longer used.
// ShortcutsGrid now uses AI-generated shortcuts via generateAIShortcuts server action.
