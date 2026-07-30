import { JournalEntry, Mood } from './types';
import { toDateKey } from './utils';

const moodScores: Record<Mood, number> = {
  rough: 1,
  low: 2,
  okay: 3,
  good: 4,
  bright: 5,
};

const moodLabels: Record<Mood, string> = {
  bright: 'Bright',
  good: 'Good',
  okay: 'Okay',
  low: 'Low',
  rough: 'Rough',
};

const moodKeys = Object.keys(moodLabels) as Mood[];

export interface DailyEntrySummary {
  entryCount: number;
  mood: Mood | null;
}

export interface MoodDistribution {
  counts: Record<Mood, number>;
  total: number;
  dominantMood: Mood | null;
  isMixed: boolean;
}

export interface WeeklyMoodDay {
  key: string;
  label: string;
  fullLabel: string;
  entryCount: number;
  mood: Mood | null;
  moodScore: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface WeeklyInsights {
  days: WeeklyMoodDay[];
  journaledDays: number;
  entryCount: number;
  dominantMood: Mood | null;
  moodCheckIns: number;
  moodState: 'none' | 'mixed' | 'dominant';
  summary: string;
}

const normalizedReferenceDate = (referenceDate: Date) => {
  const normalized = new Date(referenceDate);
  normalized.setHours(12, 0, 0, 0);
  return normalized;
};

export const getDailyEntrySummaries = (entries: JournalEntry[]) => {
  const summaries = new Map<string, DailyEntrySummary>();
  const newestFirst = [...entries].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  newestFirst.forEach((entry) => {
    const existing = summaries.get(entry.entryDate);
    summaries.set(entry.entryDate, {
      entryCount: (existing?.entryCount ?? 0) + 1,
      // A day uses its most recently created entry that includes a mood.
      mood: existing?.mood ?? entry.mood,
    });
  });

  return summaries;
};

export const getMoodDistribution = (
  dailyMoods: Array<Mood | null>,
): MoodDistribution => {
  const counts: Record<Mood, number> = {
    bright: 0,
    good: 0,
    okay: 0,
    low: 0,
    rough: 0,
  };

  dailyMoods.forEach((mood) => {
    if (mood) counts[mood] += 1;
  });

  const total = moodKeys.reduce((sum, mood) => sum + counts[mood], 0);
  const highestCount = Math.max(0, ...moodKeys.map((mood) => counts[mood]));
  const leaders = highestCount
    ? moodKeys.filter((mood) => counts[mood] === highestCount)
    : [];
  const isMixed = leaders.length > 1;

  return {
    counts,
    total,
    dominantMood: leaders.length === 1 ? leaders[0] ?? null : null,
    isMixed,
  };
};

export const getWeeklyInsights = (
  entries: JournalEntry[],
  referenceDate = new Date(),
): WeeklyInsights => {
  const today = normalizedReferenceDate(referenceDate);
  const todayDateKey = toDateKey(today);
  const dailySummaries = getDailyEntrySummaries(entries);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = toDateKey(date);
    const daySummary =
      key <= todayDateKey ? dailySummaries.get(key) : undefined;
    const latestMood = daySummary?.mood ?? null;

    return {
      key,
      label: date
        .toLocaleDateString(undefined, { weekday: 'short' })
        .slice(0, 2)
        .toUpperCase(),
      fullLabel: date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      entryCount: daySummary?.entryCount ?? 0,
      mood: latestMood,
      moodScore: latestMood ? moodScores[latestMood] : 0,
      isToday: key === todayDateKey,
      isFuture: key > todayDateKey,
    };
  });

  const weekKeys = new Set(days.map((day) => day.key));
  const weekEntries = entries
    .filter(
      (entry) =>
        weekKeys.has(entry.entryDate) && entry.entryDate <= todayDateKey,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const journaledDays = new Set(weekEntries.map((entry) => entry.entryDate)).size;
  const moodDistribution = getMoodDistribution(
    weekEntries.map((entry) => entry.mood),
  );
  const moodState = moodDistribution.total
    ? moodDistribution.isMixed
      ? 'mixed'
      : 'dominant'
    : 'none';

  let summary = 'No entries this week yet.';
  if (weekEntries.length) {
    const entryLabel = weekEntries.length === 1 ? 'entry' : 'entries';
    const dayLabel = journaledDays === 1 ? 'day' : 'days';
    summary = `You journaled on ${journaledDays} ${dayLabel} this week and added ${weekEntries.length} ${entryLabel}.`;
    if (moodDistribution.dominantMood) {
      summary += ` ${
        moodLabels[moodDistribution.dominantMood]
      } appeared most often in your mood check-ins.`;
    } else if (moodDistribution.isMixed) {
      summary += ' Your top moods were evenly matched.';
    } else {
      summary += ' Add a mood to start seeing a weekly pattern.';
    }
  }

  return {
    days,
    journaledDays,
    entryCount: weekEntries.length,
    dominantMood: moodDistribution.dominantMood,
    moodCheckIns: moodDistribution.total,
    moodState,
    summary,
  };
};

export const getOnThisDayEntries = (
  entries: JournalEntry[],
  referenceDate = new Date(),
) => {
  const reference = normalizedReferenceDate(referenceDate);
  const referenceKey = toDateKey(reference);
  const monthAndDay = referenceKey.slice(5);

  return entries
    .filter(
      (entry) =>
        entry.entryDate < referenceKey &&
        entry.entryDate.slice(5) === monthAndDay,
    )
    .sort(
      (a, b) =>
        b.entryDate.localeCompare(a.entryDate) ||
        b.createdAt.localeCompare(a.createdAt),
    );
};

export const formatYearsAgo = (
  entryDate: string,
  referenceDate = new Date(),
) => {
  const years =
    normalizedReferenceDate(referenceDate).getFullYear() -
    Number(entryDate.slice(0, 4));
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};
