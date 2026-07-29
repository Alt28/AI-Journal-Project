import type { Mood } from '../types';

/**
 * Integration boundary for the future AI module.
 *
 * This file contains types only. The current app does not import, initialize,
 * or execute an AI model.
 */

export interface AIJournalDocument {
  id: string;
  entryDate: string;
  title: string;
  content: string;
  mood: Mood | null;
  tags: string[];
  updatedAt: string;
}

export type AIJournalChange =
  | {
      type: 'upsert';
      documents: AIJournalDocument[];
    }
  | {
      type: 'remove';
      entryIds: string[];
    }
  | {
      type: 'clear';
    };

export interface AIJournalQuery {
  prompt: string;
  maximumSources?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface AIJournalAnswer {
  text: string;
  sourceEntryIds: string[];
}

export interface JournalAIAdapter {
  isAvailable(): Promise<boolean>;
  applyChange(change: AIJournalChange): Promise<void>;
  rebuildIndex(documents: AIJournalDocument[]): Promise<void>;
  answer(query: AIJournalQuery): Promise<AIJournalAnswer>;
}
