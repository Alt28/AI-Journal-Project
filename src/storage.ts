import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

import {
  AppSettings,
  JournalDraft,
  JournalEntry,
  Mood,
  PersistedJournal,
} from './types';

const STORAGE_KEY = '@daybook/journal-v1';
const DATABASE_NAME = 'daybook.db';
const MIGRATION_KEY = 'async-storage-v1';

export const defaultSettings: AppSettings = {
  theme: 'system',
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  appLockEnabled: false,
};

interface EntryRow {
  id: string;
  title: string;
  body: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
  mood: Mood | null;
  tags_json: string;
  favorite: number;
  audio_uri: string | null;
  audio_duration: number | null;
  image_uris_json: string | null;
  video_uri: string | null;
  video_duration: number | null;
  video_size_bytes: number | null;
  video_thumbnail_uri: string | null;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

const validEntries = (value: unknown): JournalEntry[] =>
  Array.isArray(value)
    ? value
        .filter(
          (entry): entry is JournalEntry =>
            Boolean(
              entry &&
                typeof entry === 'object' &&
                'id' in entry &&
                'entryDate' in entry,
            ),
        )
        .map((entry) => ({
          ...entry,
          imageUris: Array.isArray(entry.imageUris) ? entry.imageUris : [],
          videoUri:
            typeof entry.videoUri === 'string' ? entry.videoUri : undefined,
          videoDuration:
            typeof entry.videoDuration === 'number'
              ? entry.videoDuration
              : undefined,
          videoSizeBytes:
            typeof entry.videoSizeBytes === 'number'
              ? entry.videoSizeBytes
              : undefined,
          videoThumbnailUri:
            typeof entry.videoThumbnailUri === 'string'
              ? entry.videoThumbnailUri
              : undefined,
        }))
    : [];

const rowToEntry = (row: EntryRow): JournalEntry => {
  let tags: string[] = [];
  let imageUris: string[] = [];
  try {
    const parsed = JSON.parse(row.tags_json);
    if (Array.isArray(parsed)) tags = parsed.filter((tag) => typeof tag === 'string');
  } catch {
    tags = [];
  }
  try {
    const parsed = JSON.parse(row.image_uris_json ?? '[]');
    if (Array.isArray(parsed)) {
      imageUris = parsed.filter((uri) => typeof uri === 'string');
    }
  } catch {
    imageUris = [];
  }
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    entryDate: row.entry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mood: row.mood,
    tags,
    favorite: Boolean(row.favorite),
    audioUri: row.audio_uri ?? undefined,
    audioDuration: row.audio_duration ?? undefined,
    imageUris,
    videoUri: row.video_uri ?? undefined,
    videoDuration: row.video_duration ?? undefined,
    videoSizeBytes: row.video_size_bytes ?? undefined,
    videoThumbnailUri: row.video_thumbnail_uri ?? undefined,
  };
};

const insertEntry = async (
  database: SQLite.SQLiteDatabase,
  entry: JournalEntry,
) => {
  await database.runAsync(
    `INSERT OR REPLACE INTO entries
      (id, title, body, entry_date, created_at, updated_at, mood, tags_json,
       favorite, audio_uri, audio_duration, image_uris_json, video_uri,
       video_duration, video_size_bytes, video_thumbnail_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.title,
    entry.body,
    entry.entryDate,
    entry.createdAt,
    entry.updatedAt,
    entry.mood,
    JSON.stringify(entry.tags),
    entry.favorite ? 1 : 0,
    entry.audioUri ?? null,
    entry.audioDuration ?? null,
    JSON.stringify(entry.imageUris ?? []),
    entry.videoUri ?? null,
    entry.videoDuration ?? null,
    entry.videoSizeBytes ?? null,
    entry.videoThumbnailUri ?? null,
  );
};

const readLegacyJournal = async (): Promise<PersistedJournal | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedJournal>;
    return {
      entries: validEntries(parsed.entries),
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return null;
  }
};

const openDatabase = async () => {
  if (databasePromise) return databasePromise;
  databasePromise = (async () => {
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        entry_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        mood TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        favorite INTEGER NOT NULL DEFAULT 0,
        audio_uri TEXT,
        audio_duration REAL,
        image_uris_json TEXT NOT NULL DEFAULT '[]',
        video_uri TEXT,
        video_duration REAL,
        video_size_bytes REAL,
        video_thumbnail_uri TEXT
      );
      CREATE INDEX IF NOT EXISTS entries_by_date
        ON entries(entry_date DESC, created_at DESC);
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS journal_draft (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    const entryColumns = await database.getAllAsync<{ name: string }>(
      'PRAGMA table_info(entries)',
    );
    if (!entryColumns.some((column) => column.name === 'image_uris_json')) {
      await database.execAsync(
        "ALTER TABLE entries ADD COLUMN image_uris_json TEXT NOT NULL DEFAULT '[]'",
      );
    }
    if (!entryColumns.some((column) => column.name === 'video_uri')) {
      await database.execAsync(
        'ALTER TABLE entries ADD COLUMN video_uri TEXT',
      );
    }
    if (!entryColumns.some((column) => column.name === 'video_duration')) {
      await database.execAsync(
        'ALTER TABLE entries ADD COLUMN video_duration REAL',
      );
    }
    if (!entryColumns.some((column) => column.name === 'video_size_bytes')) {
      await database.execAsync(
        'ALTER TABLE entries ADD COLUMN video_size_bytes REAL',
      );
    }
    if (
      !entryColumns.some((column) => column.name === 'video_thumbnail_uri')
    ) {
      await database.execAsync(
        'ALTER TABLE entries ADD COLUMN video_thumbnail_uri TEXT',
      );
    }

    const migrated = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM metadata WHERE key = ?',
      MIGRATION_KEY,
    );
    if (!migrated) {
      const legacy = await readLegacyJournal();
      const count = await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM entries',
      );
      if (legacy && Number(count?.count ?? 0) === 0) {
        await database.withExclusiveTransactionAsync(async (transaction) => {
          for (const entry of legacy.entries) {
            await insertEntry(transaction, entry);
          }
          await transaction.runAsync(
            'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)',
            'settings',
            JSON.stringify(legacy.settings),
          );
        });
      }
      await database.runAsync(
        'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
        MIGRATION_KEY,
        new Date().toISOString(),
      );
    }
    return database;
  })();
  return databasePromise;
};

export const loadJournal = async (): Promise<PersistedJournal> => {
  const database = await openDatabase();
  const rows = await database.getAllAsync<EntryRow>(
    'SELECT * FROM entries ORDER BY entry_date DESC, created_at DESC',
  );
  const settingsRow = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?',
    'settings',
  );
  let settings = defaultSettings;
  if (settingsRow) {
    try {
      settings = { ...defaultSettings, ...JSON.parse(settingsRow.value) };
    } catch {
      settings = defaultSettings;
    }
  }
  return { entries: rows.map(rowToEntry), settings };
};

export const saveJournal = async (journal: PersistedJournal) => {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const database = await openDatabase();
      await database.withExclusiveTransactionAsync(async (transaction) => {
        const ids = journal.entries.map((entry) => entry.id);
        if (ids.length) {
          const placeholders = ids.map(() => '?').join(',');
          await transaction.runAsync(
            `DELETE FROM entries WHERE id NOT IN (${placeholders})`,
            ...ids,
          );
        } else {
          await transaction.runAsync('DELETE FROM entries');
        }
        for (const entry of journal.entries) {
          await insertEntry(transaction, entry);
        }
        await transaction.runAsync(
          'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)',
          'settings',
          JSON.stringify(journal.settings),
        );
      });
    });
  return writeQueue;
};

export const loadDraft = async (): Promise<JournalDraft | null> => {
  const database = await openDatabase();
  const row = await database.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM journal_draft WHERE id = 1',
  );
  if (!row) return null;
  try {
    const draft = JSON.parse(row.payload) as JournalDraft;
    return {
      ...draft,
      imageUris: Array.isArray(draft.imageUris) ? draft.imageUris : [],
      videoUri:
        typeof draft.videoUri === 'string' ? draft.videoUri : undefined,
      videoDuration:
        typeof draft.videoDuration === 'number'
          ? draft.videoDuration
          : undefined,
      videoSizeBytes:
        typeof draft.videoSizeBytes === 'number'
          ? draft.videoSizeBytes
          : undefined,
      videoThumbnailUri:
        typeof draft.videoThumbnailUri === 'string'
          ? draft.videoThumbnailUri
          : undefined,
    };
  } catch {
    await clearDraft();
    return null;
  }
};

export const saveDraft = async (draft: JournalDraft) => {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO journal_draft (id, payload, updated_at)
     VALUES (1, ?, ?)`,
    JSON.stringify(draft),
    draft.updatedAt,
  );
};

export const clearDraft = async () => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM journal_draft WHERE id = 1');
};
