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
import { JournalEntry } from '../types';
import { radii } from '../theme';
import {
  calendarDays,
  formatLongDate,
  fromDateKey,
  monthLabel,
  toDateKey,
  todayKey,
} from '../utils';

const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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

  const entryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      counts.set(entry.entryDate, (counts.get(entry.entryDate) ?? 0) + 1);
    });
    return counts;
  }, [entries]);

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
              label="Back to today"
              icon="calendar-outline"
              compact
              variant="secondary"
              onPress={jumpToday}
            />
          ) : null}
        </View>

        <Card style={styles.calendar} elevated>
          <View style={styles.monthHeader}>
            <IconButton
              icon="chevron-back"
              label="Previous month"
              size={36}
              onPress={() => changeMonth(-1)}
            />
            <Text style={[styles.month, { color: palette.ink }]}>
              {monthLabel(month)}
            </Text>
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
              const count = entryCounts.get(key) ?? 0;
              const selected = selectedDate === key;
              const isToday = today === key;
              const isFuture = key > today;

              return (
                <Pressable
                  accessibilityLabel={`${formatLongDate(key)}${
                    count ? `, ${count} ${count === 1 ? 'entry' : 'entries'}` : ''
                  }${isFuture ? ', future date unavailable' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isFuture }}
                  disabled={isFuture}
                  key={key}
                  onPress={() => setSelectedDate(key)}
                  style={[styles.dayCell, isFuture && styles.futureDay]}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      selected && { backgroundColor: palette.primary },
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
                          color: selected
                            ? '#FFFFFF'
                            : isToday
                              ? palette.primary
                              : palette.ink,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {Array.from({ length: Math.min(count, 3) }, (_, dot) => (
                      <View
                        key={dot}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: selected
                              ? palette.accent
                              : palette.primary,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
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
  },
  monthHeader: {
    height: 48,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  month: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
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
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  futureDay: {
    opacity: 0.3,
  },
  dayCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dots: {
    position: 'absolute',
    bottom: 3,
    height: 4,
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
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
