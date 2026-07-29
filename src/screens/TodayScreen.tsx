import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext';
import { EntryCard } from '../components/EntryCard';
import { Button, Card, Icon, SectionHeader } from '../components/ui';
import { JournalEntry } from '../types';
import { moodMeta, radii } from '../theme';
import {
  calculateStreak,
  formatLongDate,
  getGreeting,
  toDateKey,
  todayKey,
} from '../utils';

export const TodayScreen = ({
  entries,
  onNew,
  onOpenEntry,
  onToggleFavorite,
  onOpenJournal,
}: {
  entries: JournalEntry[];
  onNew: (mode: 'text' | 'voice', date?: string) => void;
  onOpenEntry: (entry: JournalEntry) => void;
  onToggleFavorite: (entry: JournalEntry) => void;
  onOpenJournal: () => void;
}) => {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const compact = width < 430;
  const today = todayKey();
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const todayEntries = sorted.filter((entry) => entry.entryDate === today);
  const recent = sorted.slice(0, 3);
  const selectedEntries = selectedDate
    ? sorted.filter((entry) => entry.entryDate === selectedDate)
    : [];
  const streak = calculateStreak(entries);
  const weekStart = new Date();
  weekStart.setHours(12, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = toDateKey(date);
    return {
      key,
      weekday: date
        .toLocaleDateString(undefined, { weekday: 'short' })
        .slice(0, 3)
        .toUpperCase(),
      day: date.getDate(),
      hasEntry: entries.some((entry) => entry.entryDate === key),
      isToday: key === today,
      isFuture: key > today,
    };
  });

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: palette.primary }]}>
              {formatLongDate(today).toUpperCase()}
            </Text>
            <Text style={[styles.greeting, { color: palette.ink }]}>
              {getGreeting()}
            </Text>
          </View>
          <View style={[styles.streakPill, { backgroundColor: palette.accentSoft }]}>
            <Icon name="flame" color={palette.accent} size={17} />
            <Text style={[styles.streakText, { color: palette.ink }]}>
              {streak} day{streak === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={
            palette.isDark
              ? ['#2D574B', '#23463D']
              : ['#477C6C', '#2F6052']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroAccent} />
          <View style={styles.heroIcon}>
            <Icon name="sparkles" color="#F6D6A8" size={21} />
          </View>
          <Text style={styles.heroTitle}>How did today feel?</Text>
          <Text style={styles.heroBody}>
            Capture the little things while they’re still fresh.
          </Text>
          <View style={[styles.heroActions, compact && styles.heroActionsCompact]}>
            <Button
              label="Write a note"
              icon="create-outline"
              onPress={() => onNew('text')}
              variant="secondary"
              foregroundColor="#244A40"
              style={styles.heroButton}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => onNew('voice')}
              style={({ pressed }) => [
                styles.voiceButton,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Icon name="mic" color="#FFFFFF" size={19} />
              <Text style={styles.voiceText}>Record</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={[styles.week, { backgroundColor: palette.surface }]}>
          {week.map((day) => (
            <Pressable
              accessibilityLabel={`Open ${formatLongDate(day.key)}${
                day.hasEntry ? ', has journal entries' : ''
              }${day.isFuture ? ', future date unavailable' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: day.isFuture }}
              disabled={day.isFuture}
              hitSlop={3}
              key={day.key}
              onPress={() => setSelectedDate(day.key)}
              style={({ pressed }) => [
                styles.dayColumn,
                { opacity: day.isFuture ? 0.34 : pressed ? 0.55 : 1 },
              ]}
            >
              <Text style={[styles.weekday, { color: palette.inkFaint }]}>
                {day.weekday}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  day.isToday && { backgroundColor: palette.primary },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: day.isToday ? '#FFFFFF' : palette.ink },
                  ]}
                >
                  {day.day}
                </Text>
              </View>
              <View
                style={[
                  styles.entryDot,
                  {
                    backgroundColor: day.hasEntry
                      ? day.isToday
                        ? palette.accent
                        : palette.primary
                      : 'transparent',
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>

        <View
          style={[
            styles.aiBanner,
            {
              backgroundColor: palette.isDark ? '#302C23' : '#F8E9D7',
              borderColor: palette.isDark ? '#494033' : '#ECD2B4',
            },
          ]}
        >
          <View style={[styles.aiMark, { backgroundColor: palette.accent }]}>
            <Icon name="sparkles" color="#FFFFFF" size={21} />
          </View>
          <View style={styles.aiCopy}>
            <View style={styles.aiLabelRow}>
              <Text style={[styles.aiLabel, { color: palette.accent }]}>
                DAYBOOK AI
              </Text>
              <View
                style={[
                  styles.aiStatus,
                  {
                    backgroundColor: palette.isDark
                      ? 'rgba(226,168,109,0.14)'
                      : 'rgba(217,156,94,0.15)',
                  },
                ]}
              >
                <Text style={[styles.aiStatusText, { color: palette.accent }]}>
                  COMING SOON
                </Text>
              </View>
            </View>
            <Text style={[styles.aiTitle, { color: palette.ink }]}>
              Reflect with your journal
            </Text>
            <Text style={[styles.aiBody, { color: palette.inkMuted }]}>
              Ask about past entries and rediscover meaningful moments.
            </Text>
          </View>
        </View>

        {todayEntries.length === 0 ? (
          <Card style={styles.prompt}>
            <View style={styles.promptCopy}>
              <Text style={[styles.promptTitle, { color: palette.ink }]}>
                Your page is open
              </Text>
              <Text style={[styles.promptBody, { color: palette.inkMuted }]}>
                There’s no right way to journal. Start with one detail from your day.
              </Text>
            </View>
            <View style={styles.moodRow}>
              {Object.entries(moodMeta).map(([key, mood]) => (
                <Pressable
                  accessibilityLabel={`Start a ${mood.label.toLowerCase()} entry`}
                  key={key}
                  onPress={() => onNew('text')}
                  style={({ pressed }) => [
                    styles.moodButton,
                    {
                      backgroundColor: palette.isDark ? mood.dark : mood.light,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Text style={styles.promptEmoji}>{mood.emoji}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        <SectionHeader
          title={recent.length ? 'Recent reflections' : 'Your reflections'}
          action={
            recent.length ? (
              <Pressable
                accessibilityLabel="See all journal entries"
                accessibilityRole="button"
                onPress={onOpenJournal}
                hitSlop={8}
              >
                <Text style={[styles.seeAll, { color: palette.primary }]}>
                  See all
                </Text>
              </Pressable>
            ) : null
          }
        />

        {recent.length ? (
          <View style={styles.entryList}>
            {recent.map((entry) => (
              <EntryCard
                entry={entry}
                key={entry.id}
                onPress={() => onOpenEntry(entry)}
                onToggleFavorite={() => onToggleFavorite(entry)}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.firstEntry}>
            <Icon name="leaf-outline" color={palette.primary} size={26} />
            <Text style={[styles.firstTitle, { color: palette.ink }]}>
              A journal that belongs only to you
            </Text>
            <Text style={[styles.firstBody, { color: palette.inkMuted }]}>
              Your notes and recordings are saved locally on this device. No account,
              no ads, no server.
            </Text>
            <Button
              compact
              label="Create first entry"
              icon="add"
              onPress={() => onNew('text')}
              style={styles.firstButton}
            />
          </Card>
        )}
        </View>
      </ScrollView>

      <Modal
        accessibilityViewIsModal
        animationType="slide"
        onRequestClose={() => setSelectedDate(null)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={Boolean(selectedDate)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityLabel="Close date entries"
            accessibilityRole="button"
            onPress={() => setSelectedDate(null)}
            style={[styles.sheetBackdrop, { backgroundColor: palette.overlay }]}
          />
          <View
            style={[
              styles.dateSheet,
              {
                backgroundColor: palette.elevated,
                paddingBottom: Math.max(insets.bottom, 28),
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeading}>
                <Text style={[styles.sheetEyebrow, { color: palette.primary }]}>
                  JOURNAL FOR
                </Text>
                <Text style={[styles.sheetTitle, { color: palette.ink }]}>
                  {selectedDate ? formatLongDate(selectedDate) : ''}
                </Text>
                {selectedEntries.length ? (
                  <Text style={[styles.sheetCount, { color: palette.inkMuted }]}>
                    {selectedEntries.length}{' '}
                    {selectedEntries.length === 1 ? 'reflection' : 'reflections'}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setSelectedDate(null)}
                style={({ pressed }) => [
                  styles.sheetClose,
                  {
                    backgroundColor: palette.input,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <Icon name="close" color={palette.inkMuted} size={21} />
              </Pressable>
            </View>

            {selectedEntries.length ? (
              <ScrollView
                contentContainerStyle={styles.sheetEntries}
                showsVerticalScrollIndicator={false}
                style={styles.sheetList}
              >
                {selectedEntries.map((entry) => (
                  <EntryCard
                    compact
                    entry={entry}
                    key={entry.id}
                    onPress={() => {
                      setSelectedDate(null);
                      onOpenEntry(entry);
                    }}
                    onToggleFavorite={() => onToggleFavorite(entry)}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.sheetEmpty}>
                <View
                  style={[
                    styles.sheetEmptyIcon,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <Icon name="calendar-outline" color={palette.primary} size={24} />
                </View>
                <Text style={[styles.sheetEmptyTitle, { color: palette.ink }]}>
                  No reflections yet
                </Text>
                <Text style={[styles.sheetEmptyBody, { color: palette.inkMuted }]}>
                  Nothing has been saved for this day.
                </Text>
                <Button
                  compact
                  icon="create-outline"
                  label="Create entry"
                  onPress={() => {
                    if (!selectedDate) return;
                    const date = selectedDate;
                    setSelectedDate(null);
                    onNew('text', date);
                  }}
                  style={styles.sheetCreate}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  greeting: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -1,
  },
  streakPill: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  hero: {
    minHeight: 255,
    borderRadius: radii.xl,
    padding: 24,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroAccent: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -75,
    top: -95,
    borderWidth: 38,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginBottom: 22,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 19,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  heroActionsCompact: {
    alignItems: 'stretch',
  },
  heroButton: {
    minHeight: 46,
    backgroundColor: '#FFFFFF',
  },
  voiceButton: {
    height: 46,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  voiceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  week: {
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  weekday: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  entryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  aiBanner: {
    minHeight: 118,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  aiMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCopy: {
    flex: 1,
  },
  aiLabelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.15,
  },
  aiStatus: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiStatusText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.75,
  },
  aiTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  aiBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  prompt: {
    padding: 19,
    gap: 18,
  },
  promptCopy: {
    gap: 4,
  },
  promptTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  promptBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptEmoji: {
    fontSize: 21,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  entryList: {
    gap: 13,
  },
  firstEntry: {
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  firstTitle: {
    marginTop: 13,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  firstBody: {
    maxWidth: 360,
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  firstButton: {
    marginTop: 18,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dateSheet: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    maxHeight: '78%',
    minHeight: 300,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    elevation: 18,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 18,
  },
  sheetHeading: {
    flex: 1,
  },
  sheetEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.15,
    marginBottom: 5,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  sheetCount: {
    fontSize: 12,
    marginTop: 4,
  },
  sheetClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetList: {
    flexGrow: 0,
  },
  sheetEntries: {
    gap: 11,
    paddingBottom: 4,
  },
  sheetEmpty: {
    flex: 1,
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheetEmptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEmptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
  },
  sheetEmptyBody: {
    marginTop: 5,
    fontSize: 13,
    textAlign: 'center',
  },
  sheetCreate: {
    marginTop: 18,
  },
});
