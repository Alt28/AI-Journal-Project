import {
  AIJournalDocument,
  JournalAIAdapter,
} from './integrations/aiContract';
import {
  clearDraft,
  loadDraft,
  loadJournal,
  saveDraft,
  saveJournal,
} from './storage';
import { JournalEntry, PersistedJournal } from './types';

type IndexAdapter = Pick<JournalAIAdapter, 'applyChange' | 'rebuildIndex'>;

let indexAdapter: IndexAdapter | null = null;
let lastIndexed = new Map<string, string>();

export const toAIJournalDocument = (
  entry: JournalEntry,
): AIJournalDocument => ({
  id: entry.id,
  entryDate: entry.entryDate,
  title: entry.title,
  content: entry.body,
  mood: entry.mood,
  tags: entry.tags,
  updatedAt: entry.updatedAt,
});

/**
 * The future on-device AI module registers here. Daybook itself does not load
 * or call an AI model; it only emits journal changes after local persistence.
 */
export const registerJournalIndexAdapter = async (
  adapter: IndexAdapter | null,
  entries: JournalEntry[] = [],
) => {
  indexAdapter = adapter;
  lastIndexed = new Map(entries.map((entry) => [entry.id, entry.updatedAt]));
  if (adapter) await adapter.rebuildIndex(entries.map(toAIJournalDocument));
};

const updateOptionalIndex = async (entries: JournalEntry[]) => {
  if (!indexAdapter) return;
  const next = new Map(entries.map((entry) => [entry.id, entry.updatedAt]));
  const changed = entries.filter(
    (entry) => lastIndexed.get(entry.id) !== entry.updatedAt,
  );
  const removed = [...lastIndexed.keys()].filter((id) => !next.has(id));
  if (changed.length) {
    await indexAdapter.applyChange({
      type: 'upsert',
      documents: changed.map(toAIJournalDocument),
    });
  }
  if (removed.length) {
    await indexAdapter.applyChange({ type: 'remove', entryIds: removed });
  }
  lastIndexed = next;
};

export const loadJournalData = loadJournal;

export const persistJournal = async (journal: PersistedJournal) => {
  await saveJournal(journal);
  try {
    await updateOptionalIndex(journal.entries);
  } catch {
    // A future AI index must never interrupt journal persistence.
  }
};

export const loadJournalDraft = loadDraft;
export const persistJournalDraft = saveDraft;
export const discardJournalDraft = clearDraft;
