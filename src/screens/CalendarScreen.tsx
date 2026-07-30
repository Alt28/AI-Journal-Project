import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import { EntryCard } from '../components/EntryCard';
import { Button, Card, EmptyState, Icon, IconButton, SectionHeader } from '../components/ui';
import {
  getDailyEntrySummaries,
  getMoodDistribution,
} from '../insights';
import { JournalEntry, Mood } from '../types';
import { moodMeta, radii } from '../theme';
import {
  calendarDays,
  formatLongDate,
  fromDateKey,
  monthLabel,
  toDateKey,
  todayKey,
} from '../utils';

const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const moods = Object.keys(moodMeta) as Mood[];

export const CalendarScreen = ({
  entries,
  focusedDate,
  onNew,
  onOpenEntry,
  onToggleFavorite,
}: {
  entries: JournalEntry[];
  focusedDate?: string;
  onNew: (date: string) => void;
  onOpenEntry: (entry: JournalEntry) => void;
  onToggleFavorite: (entry: JournalEntry) => void;
}) => {
  const palette = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const slots = calendarDays(month);
  const today = todayKey();
  const viewingCurrentMonth =
    month.getFullYear() === now.getFullYear() &&
    month.getMonth() === now.getMonth();
  const awayFromToday = !viewingCurrentMonth || selectedDate !== today;

  useEffect(() => {
    if (!focusedDate) return;
    const focused = fromDateKey(focusedDate);
    setMonth(new Date(focused.getFullYear(), focused.getMonth(), 1));
    setSelectedDate(focusedDate);
  }, [focusedDate]);

  const daySummaries = useMemo(() => {
    return getDailyEntrySummaries(entries);
  }, [entries]);

  const monthMoodSummary = useMemo(() => {
    const monthPrefix = toDateKey(month).slice(0, 7);
    return getMoodDistribution(
      entries
        .filter((entry) => entry.entryDate.startsWith(monthPrefix))
        .map((entry) => entry.mood),
    );
  }, [entries, month]);

  const selectedEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.entryDate === selectedDate)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries, selectedDate],
  );

  const changeMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    const nextIsFuture =
      next.getFullYear() > now.getFullYear() ||
      (next.getFullYear() === now.getFullYear() &&
        next.getMonth() > now.getMonth());
    if (nextIsFuture) return;
    setMonth(next);
    const nextIsCurrentMonth =
      next.getFullYear() === now.getFullYear() &&
      next.getMonth() === now.getMonth();
    setSelectedDate(nextIsCurrentMonth ? today : toDateKey(next));
  };

  const jumpToday = () => {
    const date = new Date();
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(todayKey());
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: palette.ink }]}>Calendar</Text>
            <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
              See your days at a glance
            </Text>
          </View>
          {awayFromToday ? (
            <Button
              label="Current date"
              icon="calendar-outline"
              compact
              variant="secondary"
              onPress={jumpToday}
            />
          ) : null}
        </View>

        <Card style={styles.calendar} elevated>
          <View
            pointerEvents="none"
            style={[
              styles.calendarGlow,
              { backgroundColor: palette.primarySoft },
            ]}
          />
          <View style={styles.monthHeader}>
            <IconButton
              icon="chevron-back"
              label="Previous month"
              size={36}
              onPress={() => changeMonth(-1)}
            />
            <View style={styles.monthHeading}>
              <Text style={[styles.month, { color: palette.ink }]}>
                {monthLabel(month)}
              </Text>
              <Text style={[styles.monthCaption, { color: palette.inkFaint }]}>
                MOODS & MEMORIES
              </Text>
            </View>
            <IconButton
              disabled={viewingCurrentMonth}
              icon="chevron-forward"
              label="Next month"
              size={36}
              onPress={() => changeMonth(1)}
            />
          </View>

          <View style={styles.weekdays}>
            {weekdays.map((weekday, index) => (
              <Text
                key={`${weekday}-${index}`}
                style={[styles.weekday, { color: palette.inkFaint }]}
              >
                {weekday}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {slots.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;

              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const key = toDateKey(date);
              const summary = daySummaries.get(key);
              const count = summary?.entryCount ?? 0;
              const mood = summary?.mood ? moodMeta[summary.mood] : null;
              const selected = selectedDate === key;
              const isToday = today === key;
              const isFuture = key > today;

              return (
                <Pressable
                  accessibilityLabel={`${formatLongDate(key)}${
                    count ? `, ${count} ${count === 1 ? 'entry' : 'entries'}` : ''
                  }${mood ? `, ${mood.label} mood` : ''}${
                    isFuture ? ', future date unavailable' : ''
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isFuture, selected }}
                  disabled={isFuture}
                  key={key}
                  onPress={() => setSelectedDate(key)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    isFuture && styles.futureDay,
                    { transform: [{ scale: pressed ? 0.94 : 1 }] },
                  ]}
                >
                  <View
                    style={[
                      styles.dayTile,
                      {
                        backgroundColor: mood
                          ? palette.isDark
                            ? mood.dark
                            : mood.light
                          : selected
                            ? palette.primarySoft
                            : 'transparent',
                      },
                      selected && {
                        borderColor: palette.primary,
                        borderWidth: 2,
                      },
                      isToday &&
                        !selected && {
                          borderColor: palette.primary,
                          borderWidth: 1.5,
                        },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: isToday ? palette.primaryDark : palette.ink,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                    {mood ? (
                      <Text style={styles.dayMoodEmoji}>{mood.emoji}</Text>
                    ) : count ? (
                      <View style={styles.journalMarker}>
                        <Icon
                          name="book-outline"
                          color={palette.primary}
                          size={13}
                        />
                      </View>
                    ) : (
                      <View style={styles.daySpacer} />
                    )}
                    {count > 1 ? (
                      <View
                        style={[
                          styles.entryCount,
                          {
                            backgroundColor: palette.isDark
                              ? palette.elevated
                              : '#FFFFFF',
                          },
                        ]}
                      >
                        <Text
                          style={[styles.entryCountText, { color: palette.ink }]}
                        >
                          {count > 9 ? '9+' : count}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.moodStory,
              { backgroundColor: palette.input },
            ]}
          >
            <View style={styles.moodStoryHeader}>
              <View
                style={[
                  styles.moodStoryFace,
                  {
                    backgroundColor: monthMoodSummary.dominantMood
                      ? palette.isDark
                        ? moodMeta[monthMoodSummary.dominantMood].dark
                        : moodMeta[monthMoodSummary.dominantMood].light
                      : palette.primarySoft,
                  },
                ]}
              >
                {monthMoodSummary.dominantMood ? (
                  <Text style={styles.moodStoryEmoji}>
                    {moodMeta[monthMoodSummary.dominantMood].emoji}
                  </Text>
                ) : monthMoodSummary.isMixed ? (
                  <Icon
                    name="color-palette-outline"
                    color={palette.primary}
                    size={18}
                  />
                ) : (
                  <Icon name="sparkles" color={palette.primary} size={17} />
                )}
              </View>
              <View style={styles.moodStoryCopy}>
                <Text
                  style={[styles.moodStoryEyebrow, { color: palette.primary }]}
                >
                  THIS MONTH
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.moodStoryTitle, { color: palette.ink }]}
                >
                  {monthMoodSummary.dominantMood
                    ? `${
                        moodMeta[monthMoodSummary.dominantMood].label
                      } is showing up most`
                    : monthMoodSummary.isMixed
                      ? 'Your top moods are evenly matched'
                    : 'Your mood story starts here'}
                </Text>
              </View>
              <View
                style={[
                  styles.moodStoryCount,
                  { backgroundColor: palette.surface },
                ]}
              >
                <Text
                  style={[styles.moodStoryCountText, { color: palette.inkMuted }]}
                >
                  {monthMoodSummary.total}
                </Text>
                <Text
                  style={[styles.moodStoryCountLabel, { color: palette.inkFaint }]}
                >
                  {monthMoodSummary.total === 1
                    ? 'MOOD ENTRY'
                    : 'MOOD ENTRIES'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.moodDistribution,
                { backgroundColor: palette.surface },
              ]}
            >
              {monthMoodSummary.total ? (
                moods.map((moodKey) =>
                  monthMoodSummary.counts[moodKey] ? (
                    <View
                      key={moodKey}
                      style={{
                        flex: monthMoodSummary.counts[moodKey],
                        backgroundColor: palette.isDark
                          ? moodMeta[moodKey].dark
                          : moodMeta[moodKey].light,
                      }}
                    />
                  ) : null,
                )
              ) : (
                <View
                  style={[
                    styles.emptyDistribution,
                    { backgroundColor: palette.primarySoft },
                  ]}
                />
              )}
            </View>

            <Text style={[styles.moodStoryNote, { color: palette.inkFaint }]}>
              Every journal entry with a mood counts
            </Text>

            <View style={styles.moodKey}>
              {moods.map((moodKey) => {
                const item = moodMeta[moodKey];
                return (
                  <View key={moodKey} style={styles.moodKeyItem}>
                    <View
                      style={[
                        styles.moodKeyDot,
                        {
                          backgroundColor: palette.isDark
                            ? item.dark
                            : item.light,
                        },
                      ]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.moodKeyLabel, { color: palette.inkMuted }]}
                    >
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>

        <SectionHeader
          title={formatLongDate(selectedDate)}
          action={
            <Pressable
              accessibilityLabel={`New entry for ${formatLongDate(selectedDate)}`}
              accessibilityRole="button"
              onPress={() => onNew(selectedDate)}
              style={({ pressed }) => [
                styles.addDate,
                {
                  backgroundColor: palette.primarySoft,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Icon name="add" color={palette.primaryDark} size={18} />
              <Text style={[styles.addDateText, { color: palette.primaryDark }]}>
                Add entry
              </Text>
            </Pressable>
          }
        />

        {selectedEntries.length ? (
          <View style={styles.entries}>
            {selectedEntries.map((entry) => (
              <EntryCard
                compact
                entry={entry}
                key={entry.id}
                onPress={() => onOpenEntry(entry)}
                onToggleFavorite={() => onToggleFavorite(entry)}
              />
            ))}
          </View>
        ) : (
          <Card>
            <EmptyState
              icon="calendar-outline"
              title="Nothing here yet"
              body="Add a memory, thought, or voice note for this day."
              action={
                <Button
                  compact
                  label="Add reflection"
                  icon="add"
                  onPress={() => onNew(selectedDate)}
                />
              }
            />
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 116,
  },
  content: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  calendar: {
    padding: 14,
    overflow: 'hidden',
  },
  calendarGlow: {
    position: 'absolute',
    top: -52,
    right: -42,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.48,
  },
  monthHeader: {
    height: 54,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthHeading: {
    alignItems: 'center',
  },
  month: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  monthCaption: {
    marginTop: 3,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  weekdays: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 6,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.35,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  futureDay: {
    opacity: 0.3,
  },
  dayTile: {
    width: '88%',
    height: 54,
    borderRadius: 14,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayMoodEmoji: {
    fontSize: 17,
    lineHeight: 21,
  },
  journalMarker: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySpacer: {
    height: 12,
  },
  entryCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  entryCountText: {
    fontSize: 7,
    fontWeight: '800',
  },
  moodStory: {
    marginTop: 14,
    borderRadius: 20,
    padding: 13,
    gap: 11,
  },
  moodStoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moodStoryFace: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodStoryEmoji: {
    fontSize: 19,
  },
  moodStoryCopy: {
    flex: 1,
  },
  moodStoryEyebrow: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.95,
  },
  moodStoryTitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  moodStoryCount: {
    minWidth: 52,
    minHeight: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  moodStoryCountText: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '800',
  },
  moodStoryCountLabel: {
    marginTop: 1,
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  moodDistribution: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    gap: 2,
  },
  emptyDistribution: {
    flex: 1,
    opacity: 0.65,
  },
  moodStoryNote: {
    marginTop: -3,
    fontSize: 7,
    fontWeight: '600',
    textAlign: 'center',
  },
  moodKey: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodKeyItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  moodKeyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  moodKeyLabel: {
    fontSize: 8,
    fontWeight: '600',
  },
  addDate: {
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addDateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  entries: {
    gap: 11,
  },
});
