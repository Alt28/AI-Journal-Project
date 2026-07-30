import { JournalEntry } from './types';

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1);
};

export const todayKey = () => toDateKey(new Date());

export const formatLongDate = (dateKey: string) =>
  fromDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

export const formatEntryDate = (dateKey: string) => {
  const date = fromDateKey(dateKey);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dateKey === toDateKey(today)) return 'Today';
  if (dateKey === toDateKey(yesterday)) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const formatDuration = (milliseconds = 0) => {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const getEntryPreview = (entry: JournalEntry) => {
  if (entry.body.trim()) return entry.body.trim().replace(/\s+/g, ' ');
  if (entry.audioUri) return 'Voice reflection';
  if (entry.imageUris.length) {
    return `${entry.imageUris.length} ${
      entry.imageUris.length === 1 ? 'photo' : 'photos'
    }`;
  }
  return 'Untitled reflection';
};

export const getEntryTitle = (entry: JournalEntry) => {
  if (entry.title.trim()) return entry.title.trim();
  if (entry.audioUri) return 'Voice reflection';
  if (entry.imageUris.length) return 'Photo reflection';
  return formatLongDate(entry.entryDate);
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const calculateStreak = (
  entries: JournalEntry[],
  referenceDate = new Date(),
) => {
  const days = new Set(entries.map((entry) => entry.entryDate));
  const cursor = new Date(referenceDate);
  cursor.setHours(12, 0, 0, 0);

  // A current streak only exists after journaling today. Past entries still
  // remain in the journal, but adding one retroactively cannot start a streak.
  if (!days.has(toDateKey(cursor))) return 0;

  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const calculateBestStreak = (entries: JournalEntry[]) => {
  const days = new Set(entries.map((entry) => entry.entryDate));
  let best = 0;

  days.forEach((day) => {
    const previous = fromDateKey(day);
    previous.setDate(previous.getDate() - 1);
    if (days.has(toDateKey(previous))) return;

    let run = 0;
    const cursor = fromDateKey(day);
    while (days.has(toDateKey(cursor))) {
      run += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    best = Math.max(best, run);
  });

  return best;
};

export const formatReminderTime = (hour: number, minute: number) =>
  new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const calendarDays = (month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const slots: Array<number | null> = Array.from(
    { length: firstWeekday },
    () => null,
  );

  for (let day = 1; day <= count; day += 1) slots.push(day);
  while (slots.length % 7 !== 0) slots.push(null);
  return slots;
};

export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
