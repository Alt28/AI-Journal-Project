export type Mood = 'bright' | 'good' | 'okay' | 'low' | 'rough';

export type ThemePreference = 'system' | 'light' | 'dark';

export type AppTab = 'today' | 'journal' | 'calendar' | 'settings';

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  mood: Mood | null;
  tags: string[];
  favorite: boolean;
  audioUri?: string;
  audioDuration?: number;
  imageUris: string[];
}

export interface AppSettings {
  theme: ThemePreference;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  reminderId?: string;
  appLockEnabled: boolean;
}

export interface PersistedJournal {
  entries: JournalEntry[];
  settings: AppSettings;
}

export interface JournalDraft {
  entryId?: string;
  mode: 'text' | 'voice';
  title: string;
  body: string;
  date: string;
  mood: Mood | null;
  tags: string;
  favorite: boolean;
  audioUri?: string;
  audioDuration?: number;
  imageUris: string[];
  updatedAt: string;
}

export interface EditorRequest {
  entry?: JournalEntry;
  date?: string;
  mode?: 'text' | 'voice';
  draft?: JournalDraft;
}
