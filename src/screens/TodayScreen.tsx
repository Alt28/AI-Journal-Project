import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import {
  formatYearsAgo,
  getOnThisDayEntries,
  getWeeklyInsights,
} from '../insights';
import { JournalEntry } from '../types';
import { moodMeta, radii } from '../theme';
import { useReducedMotion } from '../useReducedMotion';
import {
  calculateBestStreak,
  calculateStreak,
  formatLongDate,
  fromDateKey,
  getGreeting,
  toDateKey,
  todayKey,
} from '../utils';

const getHeroPeriod = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? 'night' : 'day';
};

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
  const reducedMotion = useReducedMotion();
  const heroEntrance = useRef(new Animated.Value(1)).current;
  const heroBreath = useRef(new Animated.Value(0)).current;
  const [heroPeriod, setHeroPeriod] = useState<'day' | 'night'>(
    getHeroPeriod,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weeklyOverviewOpen, setWeeklyOverviewOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const compact = width < 430;
  const today = todayKey();
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const todayEntries = sorted.filter((entry) => entry.entryDate === today);
  const recent = sorted.slice(0, 3);
  const selectedEntries = selectedDate
    ? sorted.filter((entry) => entry.entryDate === selectedDate)
    : [];
  const streak = calculateStreak(entries);
  const bestStreak = calculateBestStreak(entries);
  const totalJournaledDays = new Set(entries.map((entry) => entry.entryDate))
    .size;
  const recentStreakDays = useMemo(() => {
    const journaledDays = new Set(entries.map((entry) => entry.entryDate));
    return Array.from({ length: 7 }, (_, index) => {
      const date = fromDateKey(today);
      date.setDate(date.getDate() - (6 - index));
      const key = toDateKey(date);
      return {
        date: date.getDate(),
        isJournaled: journaledDays.has(key),
        isToday: key === today,
        key,
        label: date
          .toLocaleDateString(undefined, { weekday: 'short' })
          .slice(0, 2)
          .toUpperCase(),
      };
    });
  }, [entries, today]);
  const weeklyInsights = useMemo(
    () => getWeeklyInsights(entries, fromDateKey(today)),
    [entries, today],
  );
  const onThisDayEntries = useMemo(
    () => getOnThisDayEntries(entries, fromDateKey(today)),
    [entries, today],
  );
  const journaledWeekDays = weeklyInsights.days.filter(
    (day) => day.entryCount > 0,
  );
  const firstInsightDay = weeklyInsights.days[0];
  const lastInsightDay = weeklyInsights.days[weeklyInsights.days.length - 1];
  const weeklyDateRange =
    firstInsightDay && lastInsightDay
      ? `${fromDateKey(firstInsightDay.key).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })} – ${fromDateKey(lastInsightDay.key).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}`
      : '';

  useEffect(() => {
    const refreshPeriod = () => setHeroPeriod(getHeroPeriod());
    refreshPeriod();
    const timer = setInterval(refreshPeriod, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    heroEntrance.stopAnimation();
    heroBreath.stopAnimation();
    if (reducedMotion) {
      heroEntrance.setValue(1);
      heroBreath.setValue(0);
      return;
    }

    heroEntrance.setValue(0);
    heroBreath.setValue(0);
    const entranceAnimation = Animated.timing(heroEntrance, {
      duration: 440,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(heroBreath, {
          duration: 3400,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(heroBreath, {
          duration: 3400,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    entranceAnimation.start();
    breathAnimation.start();

    return () => {
      entranceAnimation.stop();
      breathAnimation.stop();
    };
  }, [heroBreath, heroEntrance, reducedMotion]);

  const closeSheet = () => {
    if (selectedDate) {
      setSelectedDate(null);
      return;
    }
    setWeeklyOverviewOpen(false);
  };

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
          <Pressable
            accessibilityHint="Opens your streak details"
            accessibilityLabel={`${streak} day streak`}
            accessibilityRole="button"
            onPress={() => setStreakOpen(true)}
            style={({ pressed }) => [
              styles.streakPill,
              {
                backgroundColor: palette.accentSoft,
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Icon name="flame" color={palette.accent} size={17} />
            <Text style={[styles.streakText, { color: palette.ink }]}>
              {streak} day{streak === 1 ? '' : 's'}
            </Text>
            <Icon name="chevron-forward" color={palette.accent} size={13} />
          </Pressable>
        </View>

        <Animated.View
          style={{
            opacity: heroEntrance,
            transform: [
              {
                translateY: heroEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={
              heroPeriod === 'night'
                ? palette.isDark
                  ? ['#243C4B', '#192D38']
                  : ['#385C6A', '#294854']
                : palette.isDark
                  ? ['#2D574B', '#23463D']
                  : ['#477C6C', '#2F6052']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.heroAccent,
                {
                  opacity: heroBreath.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.58, 1],
                  }),
                  transform: [
                    {
                      scale: heroBreath.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1.05],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.heroIcon,
                {
                  transform: [
                    {
                      scale: heroBreath.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.06],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Icon
                name={heroPeriod === 'night' ? 'moon-outline' : 'sunny-outline'}
                color={heroPeriod === 'night' ? '#D9E8F4' : '#F6D6A8'}
                size={22}
              />
            </Animated.View>
            <Text style={styles.heroTitle}>How did today feel?</Text>
            <Text style={styles.heroBody}>
              Capture the little things while they’re still fresh.
            </Text>
            <View
              style={[styles.heroActions, compact && styles.heroActionsCompact]}
            >
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
                  {
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Icon name="mic" color="#FFFFFF" size={19} />
                <Text style={styles.voiceText}>Record</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

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

        {entries.length ? (
          <Card style={styles.weeklyCard}>
            <View
              pointerEvents="none"
              style={[
                styles.weeklyGlow,
                { backgroundColor: palette.primarySoft },
              ]}
            />
            <View style={styles.insightHeader}>
              <View
                style={[
                  styles.insightIcon,
                  { backgroundColor: palette.primarySoft },
                ]}
              >
                <Icon name="analytics-outline" color={palette.primary} size={21} />
              </View>
              <View style={styles.insightHeading}>
                <Text style={[styles.insightEyebrow, { color: palette.primary }]}>
                  WEEKLY REFLECTION
                </Text>
                <Text style={[styles.insightTitle, { color: palette.ink }]}>
                  Your week
                </Text>
              </View>
              <Pressable
                accessibilityHint="Opens a detailed seven-day overview"
                accessibilityLabel="View weekly reflection"
                accessibilityRole="button"
                onPress={() => setWeeklyOverviewOpen(true)}
                style={({ pressed }) => [
                  styles.weeklyAction,
                  {
                    backgroundColor: palette.input,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.weeklyActionMeta, { color: palette.inkFaint }]}
                >
                  {weeklyInsights.journaledDays}/7 days
                </Text>
                <View style={styles.weeklyActionLabel}>
                  <Text
                    style={[styles.weeklyActionText, { color: palette.primary }]}
                  >
                    View week
                  </Text>
                  <Icon
                    name="chevron-forward"
                    color={palette.primary}
                    size={13}
                  />
                </View>
              </Pressable>
            </View>

            <View style={styles.trendHeader}>
              <View>
                <Text style={[styles.trendTitle, { color: palette.ink }]}>
                  Mood calendar
                </Text>
                <Text style={[styles.trendHint, { color: palette.inkFaint }]}>
                  Sunday to Saturday
                </Text>
              </View>
              {weeklyInsights.dominantMood ? (
                <View
                  style={[
                    styles.dominantMood,
                    {
                      backgroundColor: palette.isDark
                        ? moodMeta[weeklyInsights.dominantMood].dark
                        : moodMeta[weeklyInsights.dominantMood].light,
                    },
                  ]}
                >
                  <Text style={styles.dominantMoodEmoji}>
                    {moodMeta[weeklyInsights.dominantMood].emoji}
                  </Text>
                  <Text
                    style={[styles.dominantMoodText, { color: palette.ink }]}
                  >
                    {moodMeta[weeklyInsights.dominantMood].label}
                  </Text>
                </View>
              ) : weeklyInsights.moodState === 'mixed' ? (
                <View
                  style={[
                    styles.dominantMood,
                    { backgroundColor: palette.input },
                  ]}
                >
                  <Icon
                    name="color-palette-outline"
                    color={palette.primary}
                    size={14}
                  />
                  <Text
                    style={[styles.dominantMoodText, { color: palette.ink }]}
                  >
                    Mixed
                  </Text>
                </View>
              ) : (
                <Text style={[styles.noMoodText, { color: palette.inkFaint }]}>
                  No moods yet
                </Text>
              )}
            </View>

            <View style={styles.weekGrid}>
              {weeklyInsights.days.map((day) => {
                const mood = day.mood ? moodMeta[day.mood] : null;
                const moodColor = mood
                  ? palette.isDark
                    ? mood.dark
                    : mood.light
                  : palette.input;

                return (
                  <Pressable
                    accessibilityHint="Opens the journal entries for this day"
                    accessibilityLabel={`${day.fullLabel}: ${
                      mood ? `${mood.label} mood` : 'no mood recorded'
                    }, ${day.entryCount} ${
                      day.entryCount === 1 ? 'reflection' : 'reflections'
                    }${day.isFuture ? ', future date unavailable' : ''}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: day.isFuture }}
                    disabled={day.isFuture}
                    key={day.key}
                    onPress={() => setSelectedDate(day.key)}
                    style={({ pressed }) => [
                      styles.weekTile,
                      {
                        opacity: day.isFuture ? 0.3 : pressed ? 0.55 : 1,
                        backgroundColor: mood
                          ? moodColor
                          : day.isToday
                            ? palette.primarySoft
                            : palette.surface,
                        borderColor: day.isToday
                          ? palette.primary
                          : mood
                            ? moodColor
                            : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekTileWeekday,
                        {
                          color: day.isToday
                            ? palette.primary
                            : palette.inkFaint,
                        },
                      ]}
                    >
                      {day.label}
                    </Text>
                    <Text
                      style={[
                        styles.weekTileDate,
                        { color: palette.ink },
                      ]}
                    >
                      {fromDateKey(day.key).getDate()}
                    </Text>
                    <View style={styles.weekTileMood}>
                      {mood ? (
                        <Text style={styles.weekTileEmoji}>{mood.emoji}</Text>
                      ) : day.entryCount ? (
                        <Icon
                          name="book-outline"
                          color={palette.primary}
                          size={16}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.weekTileEmpty,
                            { color: palette.inkFaint },
                          ]}
                        >
                          —
                        </Text>
                      )}
                    </View>
                    <View style={styles.weekTileMeta}>
                      {day.entryCount ? (
                        <>
                          <Icon
                            name="document-text-outline"
                            color={palette.inkMuted}
                            size={9}
                          />
                          <Text
                            style={[
                              styles.weekTileCount,
                              { color: palette.inkMuted },
                            ]}
                          >
                            {day.entryCount > 9 ? '9+' : day.entryCount}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.weekProgress}>
              <View style={styles.weekProgressHeader}>
                <Text
                  style={[styles.weekProgressText, { color: palette.inkMuted }]}
                >
                  {weeklyInsights.journaledDays} of 7 days journaled
                </Text>
                <Text
                  style={[styles.weekProgressText, { color: palette.inkFaint }]}
                >
                  {weeklyInsights.entryCount}{' '}
                  {weeklyInsights.entryCount === 1
                    ? 'reflection'
                    : 'reflections'}
                </Text>
              </View>
              <View style={styles.weekProgressSegments}>
                {weeklyInsights.days.map((day) => {
                  const mood = day.mood ? moodMeta[day.mood] : null;
                  return (
                    <View
                      key={day.key}
                      style={[
                        styles.weekProgressSegment,
                        {
                          backgroundColor: day.entryCount
                            ? mood
                              ? palette.isDark
                                ? mood.dark
                                : mood.light
                              : palette.primary
                            : palette.input,
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <Text
                style={[styles.weekProgressHint, { color: palette.inkFaint }]}
              >
                Tap a day to open its reflections
              </Text>
            </View>
          </Card>
        ) : null}

        {onThisDayEntries.length ? (
          <>
            <SectionHeader
              title="On this day"
              action={
                <Text style={[styles.memoryCount, { color: palette.inkFaint }]}>
                  {onThisDayEntries.length}{' '}
                  {onThisDayEntries.length === 1 ? 'memory' : 'memories'}
                </Text>
              }
            />
            <View style={styles.memoryList}>
              {onThisDayEntries.slice(0, 3).map((entry) => (
                <View key={entry.id} style={styles.memory}>
                  <View style={styles.memoryLabel}>
                    <Icon name="time-outline" color={palette.primary} size={15} />
                    <Text
                      style={[styles.memoryLabelText, { color: palette.primary }]}
                    >
                      {formatYearsAgo(entry.entryDate, fromDateKey(today)).toUpperCase()}
                    </Text>
                  </View>
                  <EntryCard
                    compact
                    entry={entry}
                    onPress={() => onOpenEntry(entry)}
                    onToggleFavorite={() => onToggleFavorite(entry)}
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

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
        onRequestClose={() => setStreakOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={streakOpen}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityLabel="Close streak details"
            accessibilityRole="button"
            onPress={() => setStreakOpen(false)}
            style={[styles.sheetBackdrop, { backgroundColor: palette.overlay }]}
          />
          <View
            style={[
              styles.streakSheet,
              {
                backgroundColor: palette.elevated,
                paddingBottom: Math.max(insets.bottom, 28),
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeading}>
                <Text style={[styles.sheetEyebrow, { color: palette.accent }]}>
                  JOURNALING STREAK
                </Text>
                <Text style={[styles.sheetTitle, { color: palette.ink }]}>
                  Keep your rhythm
                </Text>
                <Text style={[styles.sheetCount, { color: palette.inkMuted }]}>
                  One journaled day at a time
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close streak details"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setStreakOpen(false)}
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

            <ScrollView
              contentContainerStyle={styles.streakContent}
              showsVerticalScrollIndicator={false}
              style={styles.sheetList}
            >
              <View
                style={[
                  styles.streakSummary,
                  {
                    backgroundColor: palette.accentSoft,
                    borderColor: palette.accent,
                  },
                ]}
              >
                <View
                  style={[
                    styles.streakSummaryIcon,
                    { backgroundColor: palette.accent },
                  ]}
                >
                  <Icon name="flame" color="#FFFFFF" size={29} />
                </View>
                <View style={styles.streakSummaryCopy}>
                  <Text style={[styles.streakSummaryValue, { color: palette.ink }]}>
                    {streak} day{streak === 1 ? '' : 's'}
                  </Text>
                  <Text
                    style={[
                      styles.streakSummaryLabel,
                      { color: palette.inkMuted },
                    ]}
                  >
                    {streak
                      ? 'Your current streak'
                      : 'Journal today to begin a new streak'}
                  </Text>
                </View>
              </View>

              <View style={styles.streakStats}>
                <View
                  style={[
                    styles.streakStat,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Icon name="trophy-outline" color={palette.primary} size={20} />
                  <View>
                    <Text style={[styles.streakStatValue, { color: palette.ink }]}>
                      {bestStreak}
                    </Text>
                    <Text
                      style={[styles.streakStatLabel, { color: palette.inkFaint }]}
                    >
                      BEST STREAK
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.streakStat,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Icon name="book-outline" color={palette.primary} size={20} />
                  <View>
                    <Text style={[styles.streakStatValue, { color: palette.ink }]}>
                      {totalJournaledDays}
                    </Text>
                    <Text
                      style={[styles.streakStatLabel, { color: palette.inkFaint }]}
                    >
                      DAYS JOURNALED
                    </Text>
                  </View>
                </View>
              </View>

              <LinearGradient
                colors={
                  palette.isDark
                    ? ['#21372F', '#192721']
                    : ['#EAF6F1', '#F8FBFA']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.streakJourney,
                  { borderColor: palette.border },
                ]}
              >
                <View
                  pointerEvents="none"
                  style={[
                    styles.streakJourneyGlow,
                    { backgroundColor: palette.primarySoft },
                  ]}
                />
                <View style={styles.streakJourneyHeader}>
                  <View style={styles.streakJourneyHeading}>
                    <View>
                      <Text
                        style={[
                          styles.streakJourneyTitle,
                          { color: palette.ink },
                        ]}
                      >
                        Your 7-day trail
                      </Text>
                      <Text
                        style={[
                          styles.streakJourneySubtitle,
                          { color: palette.inkMuted },
                        ]}
                      >
                        Each flame is a day you showed up
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.streakJourneyCount,
                      { backgroundColor: palette.input },
                    ]}
                  >
                    <Text
                      style={[
                        styles.streakJourneyCountValue,
                        { color: palette.primary },
                      ]}
                    >
                      {
                        recentStreakDays.filter((day) => day.isJournaled)
                          .length
                      }
                      /7
                    </Text>
                    <Text
                      style={[
                        styles.streakJourneyCountLabel,
                        { color: palette.inkFaint },
                      ]}
                    >
                      JOURNALED
                    </Text>
                  </View>
                </View>

                <View style={styles.streakTrail}>
                  <View style={styles.streakTrailLine}>
                    {recentStreakDays.slice(0, -1).map((day, index) => (
                      <View
                        key={`${day.key}-path`}
                        style={[
                          styles.streakTrailSegment,
                          {
                            backgroundColor:
                              day.isJournaled &&
                              recentStreakDays[index + 1]?.isJournaled
                                ? palette.primary
                                : palette.input,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.streakTrailDays}>
                    {recentStreakDays.map((day) => (
                      <View key={day.key} style={styles.streakTrailDay}>
                        <Text
                          style={[
                            styles.streakTrailLabel,
                            {
                              color: day.isToday
                                ? palette.primary
                                : palette.inkFaint,
                            },
                          ]}
                        >
                          {day.label}
                        </Text>
                        <View
                          style={[
                            styles.streakTrailNodeRing,
                            {
                              borderColor: day.isToday
                                ? palette.primary
                                : 'transparent',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.streakTrailNode,
                              {
                                backgroundColor: day.isJournaled
                                  ? palette.primary
                                  : palette.surface,
                                borderColor: day.isJournaled
                                  ? palette.primary
                                  : palette.border,
                              },
                            ]}
                          >
                            <Icon
                              name={day.isJournaled ? 'flame' : 'remove'}
                              color={
                                day.isJournaled
                                  ? '#FFFFFF'
                                  : palette.inkFaint
                              }
                              size={day.isJournaled ? 17 : 13}
                            />
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.streakTrailDate,
                            {
                              color: day.isToday
                                ? palette.primary
                                : palette.ink,
                            },
                          ]}
                        >
                          {day.date}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View
                  style={[
                    styles.streakJourneyFooter,
                    { borderTopColor: palette.border },
                  ]}
                >
                  <Icon
                    name={streak ? 'flame-outline' : 'leaf-outline'}
                    color={palette.accent}
                    size={16}
                  />
                  <Text
                    style={[
                      styles.streakJourneyFooterText,
                      { color: palette.inkMuted },
                    ]}
                  >
                    {streak
                      ? `${streak}-day rhythm in progress`
                      : 'A new rhythm can begin today'}
                  </Text>
                  <View style={styles.streakTodayLegend}>
                    <View
                      style={[
                        styles.streakTodayRing,
                        { borderColor: palette.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.streakTodayText,
                        { color: palette.inkFaint },
                      ]}
                    >
                      Today
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View
                style={[
                  styles.streakRule,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.streakRuleIcon,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <Icon
                    name="information-circle-outline"
                    color={palette.primary}
                    size={21}
                  />
                </View>
                <View style={styles.streakRuleCopy}>
                  <Text style={[styles.streakRuleTitle, { color: palette.ink }]}>
                    How your streak works
                  </Text>
                  <Text
                    style={[styles.streakRuleBody, { color: palette.inkMuted }]}
                  >
                    Save at least one entry today to keep it going. Multiple
                    entries still count as one day. Missing a day resets the
                    current streak, but your best streak stays.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        accessibilityViewIsModal
        animationType="slide"
        onRequestClose={closeSheet}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={weeklyOverviewOpen || Boolean(selectedDate)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityLabel={
              selectedDate
                ? weeklyOverviewOpen
                  ? 'Back to weekly overview'
                  : 'Close date entries'
                : 'Close weekly overview'
            }
            accessibilityRole="button"
            onPress={closeSheet}
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
            {!selectedDate && weeklyOverviewOpen ? (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeading}>
                    <Text
                      style={[styles.sheetEyebrow, { color: palette.primary }]}
                    >
                      WEEKLY REFLECTION
                    </Text>
                    <Text style={[styles.sheetTitle, { color: palette.ink }]}>
                      Your week
                    </Text>
                    <Text style={[styles.sheetCount, { color: palette.inkMuted }]}>
                      {weeklyDateRange}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Close weekly overview"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setWeeklyOverviewOpen(false)}
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

                <ScrollView
                  contentContainerStyle={styles.weekOverviewContent}
                  showsVerticalScrollIndicator={false}
                  style={styles.sheetList}
                >
                  <View style={styles.weekStats}>
                    <View
                      style={[
                        styles.weekStat,
                        { backgroundColor: palette.surface },
                      ]}
                    >
                      <Text style={[styles.weekStatValue, { color: palette.ink }]}>
                        {weeklyInsights.journaledDays}
                      </Text>
                      <Text
                        style={[styles.weekStatLabel, { color: palette.inkFaint }]}
                      >
                        DAYS
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.weekStat,
                        { backgroundColor: palette.surface },
                      ]}
                    >
                      <Text style={[styles.weekStatValue, { color: palette.ink }]}>
                        {weeklyInsights.entryCount}
                      </Text>
                      <Text
                        style={[styles.weekStatLabel, { color: palette.inkFaint }]}
                      >
                        ENTRIES
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.weekStat,
                        { backgroundColor: palette.surface },
                      ]}
                    >
                      {weeklyInsights.dominantMood ? (
                        <Text style={styles.weekStatEmoji}>
                          {moodMeta[weeklyInsights.dominantMood].emoji}
                        </Text>
                      ) : weeklyInsights.moodState === 'mixed' ? (
                        <Icon
                          name="color-palette-outline"
                          color={palette.primary}
                          size={19}
                        />
                      ) : (
                        <Icon
                          name={
                            weeklyInsights.entryCount
                              ? 'book-outline'
                              : 'remove'
                          }
                          color={
                            weeklyInsights.entryCount
                              ? palette.primary
                              : palette.inkFaint
                          }
                          size={19}
                        />
                      )}
                      <Text
                        numberOfLines={1}
                        style={[styles.weekStatLabel, { color: palette.inkFaint }]}
                      >
                        {weeklyInsights.dominantMood
                          ? moodMeta[
                              weeklyInsights.dominantMood
                            ].label.toUpperCase()
                          : weeklyInsights.moodState === 'mixed'
                            ? 'MIXED'
                            : 'NO MOOD'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.weekSectionHeading}>
                    <Text
                      style={[styles.weekSectionTitle, { color: palette.ink }]}
                    >
                      At a glance
                    </Text>
                    <Text
                      style={[styles.weekSectionHint, { color: palette.inkFaint }]}
                    >
                      Tap any day
                    </Text>
                  </View>

                  <View style={styles.weekRail}>
                    {weeklyInsights.days.map((day) => {
                      const mood = day.mood ? moodMeta[day.mood] : null;
                      return (
                        <Pressable
                          accessibilityLabel={`${day.fullLabel}, ${
                            mood ? `${mood.label} mood` : 'no mood'
                          }, ${day.entryCount} ${
                            day.entryCount === 1
                              ? 'reflection'
                              : 'reflections'
                          }${day.isFuture ? ', future date unavailable' : ''}`}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: day.isFuture }}
                          disabled={day.isFuture}
                          key={day.key}
                          onPress={() => setSelectedDate(day.key)}
                          style={({ pressed }) => [
                            styles.weekRailDay,
                            {
                              backgroundColor: mood
                                ? palette.isDark
                                  ? mood.dark
                                  : mood.light
                                : palette.surface,
                              borderColor: day.isToday
                                ? palette.primary
                                : 'transparent',
                              opacity: day.isFuture
                                ? 0.34
                                : pressed
                                  ? 0.6
                                  : 1,
                              transform: [{ scale: pressed ? 0.95 : 1 }],
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.weekRailLabel,
                              {
                                color: day.isToday
                                  ? palette.primaryDark
                                  : palette.inkFaint,
                              },
                            ]}
                          >
                            {day.label}
                          </Text>
                          {mood ? (
                            <Text style={styles.weekRailEmoji}>{mood.emoji}</Text>
                          ) : day.entryCount ? (
                            <View style={styles.weekRailJournal}>
                              <Icon
                                name="book-outline"
                                color={palette.primary}
                                size={14}
                              />
                            </View>
                          ) : (
                            <Text
                              style={[
                                styles.weekRailEmptyText,
                                { color: palette.inkFaint },
                              ]}
                            >
                              —
                            </Text>
                          )}
                          <Text
                            style={[styles.weekRailDate, { color: palette.ink }]}
                          >
                            {fromDateKey(day.key).getDate()}
                          </Text>
                          {day.entryCount ? (
                            <View
                              style={[
                                styles.weekRailCount,
                                { backgroundColor: palette.elevated },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.weekRailCountText,
                                  { color: palette.inkMuted },
                                ]}
                              >
                                {day.entryCount}
                              </Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.weekSectionHeading}>
                    <Text
                      style={[styles.weekSectionTitle, { color: palette.ink }]}
                    >
                      Journaled this week
                    </Text>
                    <Text
                      style={[styles.weekSectionHint, { color: palette.inkFaint }]}
                    >
                      {journaledWeekDays.length}{' '}
                      {journaledWeekDays.length === 1 ? 'day' : 'days'}
                    </Text>
                  </View>

                  {journaledWeekDays.length ? (
                    <View style={styles.weekJournaledDays}>
                      {journaledWeekDays.map((day) => {
                        const mood = day.mood ? moodMeta[day.mood] : null;
                        return (
                          <Pressable
                            accessibilityLabel={`Open ${day.fullLabel}, ${
                              day.entryCount
                            } ${
                              day.entryCount === 1
                                ? 'reflection'
                                : 'reflections'
                            }`}
                            accessibilityRole="button"
                            key={day.key}
                            onPress={() => setSelectedDate(day.key)}
                            style={({ pressed }) => [
                              styles.weekJournaledDay,
                              {
                                backgroundColor: palette.surface,
                                borderColor: day.isToday
                                  ? palette.primary
                                  : palette.border,
                                opacity: pressed ? 0.62 : 1,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.weekJournaledMood,
                                {
                                  backgroundColor: mood
                                    ? palette.isDark
                                      ? mood.dark
                                      : mood.light
                                    : palette.primarySoft,
                                },
                              ]}
                            >
                              {mood ? (
                                <Text style={styles.weekJournaledEmoji}>
                                  {mood.emoji}
                                </Text>
                              ) : (
                                <Icon
                                  name="book-outline"
                                  color={palette.primary}
                                  size={17}
                                />
                              )}
                            </View>
                            <View style={styles.weekJournaledCopy}>
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.weekJournaledDate,
                                  { color: palette.ink },
                                ]}
                              >
                                {day.fullLabel}
                              </Text>
                              <Text
                                style={[
                                  styles.weekJournaledMeta,
                                  { color: palette.inkMuted },
                                ]}
                              >
                                {mood ? mood.label : 'No mood'} ·{' '}
                                {day.entryCount}{' '}
                                {day.entryCount === 1
                                  ? 'reflection'
                                  : 'reflections'}
                              </Text>
                            </View>
                            <Icon
                              name="chevron-forward"
                              color={palette.inkFaint}
                              size={18}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Pressable
                      accessibilityLabel="Create a reflection for today"
                      accessibilityRole="button"
                      onPress={() => setSelectedDate(today)}
                      style={({ pressed }) => [
                        styles.weekEmpty,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                          opacity: pressed ? 0.62 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.weekEmptyIcon,
                          { backgroundColor: palette.primarySoft },
                        ]}
                      >
                        <Icon
                          name="create-outline"
                          color={palette.primary}
                          size={20}
                        />
                      </View>
                      <View style={styles.weekEmptyCopy}>
                        <Text
                          style={[styles.weekEmptyTitle, { color: palette.ink }]}
                        >
                          Your week is ready
                        </Text>
                        <Text
                          style={[
                            styles.weekEmptyBody,
                            { color: palette.inkMuted },
                          ]}
                        >
                          Add your first reflection.
                        </Text>
                      </View>
                      <Icon
                        name="chevron-forward"
                        color={palette.inkFaint}
                        size={18}
                      />
                    </Pressable>
                  )}
                </ScrollView>
              </>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeading}>
                    <Text
                      style={[styles.sheetEyebrow, { color: palette.primary }]}
                    >
                      JOURNAL FOR
                    </Text>
                    <Text style={[styles.sheetTitle, { color: palette.ink }]}>
                      {selectedDate ? formatLongDate(selectedDate) : ''}
                    </Text>
                    {selectedEntries.length ? (
                      <Text
                        style={[styles.sheetCount, { color: palette.inkMuted }]}
                      >
                        {selectedEntries.length}{' '}
                        {selectedEntries.length === 1
                          ? 'reflection'
                          : 'reflections'}
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
                          setWeeklyOverviewOpen(false);
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
                      <Icon
                        name="calendar-outline"
                        color={palette.primary}
                        size={24}
                      />
                    </View>
                    <Text
                      style={[styles.sheetEmptyTitle, { color: palette.ink }]}
                    >
                      No reflections yet
                    </Text>
                    <Text
                      style={[
                        styles.sheetEmptyBody,
                        { color: palette.inkMuted },
                      ]}
                    >
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
                        setWeeklyOverviewOpen(false);
                        onNew('text', date);
                      }}
                      style={styles.sheetCreate}
                    />
                  </View>
                )}
              </>
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
  weeklyCard: {
    padding: 18,
    overflow: 'hidden',
  },
  weeklyGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -104,
    right: -68,
    opacity: 0.42,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightHeading: {
    flex: 1,
  },
  insightEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  insightTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  weeklyAction: {
    minWidth: 78,
    minHeight: 43,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  weeklyActionMeta: {
    fontSize: 8,
    fontWeight: '700',
  },
  weeklyActionLabel: {
    marginTop: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyActionText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trendHeader: {
    minHeight: 36,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  trendHint: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
  },
  dominantMood: {
    minHeight: 30,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dominantMoodEmoji: {
    fontSize: 14,
  },
  dominantMoodText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noMoodText: {
    fontSize: 10,
    fontWeight: '600',
  },
  weekGrid: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 4,
  },
  weekTile: {
    flex: 1,
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekTileWeekday: {
    fontSize: 8,
    fontWeight: '800',
  },
  weekTileDate: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  weekTileMood: {
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekTileEmoji: {
    fontSize: 18,
  },
  weekTileEmpty: {
    fontSize: 15,
    fontWeight: '600',
  },
  weekTileMeta: {
    minHeight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  weekTileCount: {
    fontSize: 7,
    fontWeight: '800',
  },
  weekProgress: {
    marginTop: 14,
  },
  weekProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekProgressText: {
    fontSize: 9,
    fontWeight: '700',
  },
  weekProgressSegments: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 4,
  },
  weekProgressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  weekProgressHint: {
    marginTop: 8,
    fontSize: 8,
    fontWeight: '600',
  },
  memoryCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  memoryList: {
    gap: 13,
  },
  memory: {
    gap: 7,
  },
  memoryLabel: {
    paddingLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  memoryLabelText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.85,
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
  streakSheet: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    maxHeight: '82%',
    minHeight: 410,
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
  weekOverviewContent: {
    gap: 13,
    paddingBottom: 4,
  },
  streakContent: {
    gap: 14,
    paddingBottom: 4,
  },
  streakSummary: {
    minHeight: 98,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  streakSummaryIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakSummaryCopy: {
    flex: 1,
  },
  streakSummaryValue: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  streakSummaryLabel: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  streakStats: {
    flexDirection: 'row',
    gap: 9,
  },
  streakStat: {
    flex: 1,
    minHeight: 68,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakStatValue: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '800',
  },
  streakStatLabel: {
    marginTop: 2,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.55,
  },
  streakJourney: {
    position: 'relative',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  streakJourneyGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -86,
    right: -48,
    opacity: 0.42,
  },
  streakJourneyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  streakJourneyHeading: {
    minWidth: 0,
    flex: 1,
  },
  streakJourneyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  streakJourneySubtitle: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '600',
  },
  streakJourneyCount: {
    width: 59,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakJourneyCountValue: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  streakJourneyCountLabel: {
    marginTop: 2,
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 0.45,
  },
  streakTrail: {
    position: 'relative',
    marginTop: 18,
  },
  streakTrailLine: {
    position: 'absolute',
    top: 36,
    left: '7.14%',
    right: '7.14%',
    height: 3,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
    zIndex: 0,
  },
  streakTrailSegment: {
    flex: 1,
    height: 3,
  },
  streakTrailDays: {
    flexDirection: 'row',
    zIndex: 1,
  },
  streakTrailDay: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  streakTrailLabel: {
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '800',
    letterSpacing: 0.45,
  },
  streakTrailNodeRing: {
    width: 42,
    height: 42,
    marginTop: 7,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTrailNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  streakTrailDate: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '700',
  },
  streakJourneyFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  streakJourneyFooterText: {
    fontSize: 9,
    fontWeight: '600',
  },
  streakTodayLegend: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  streakTodayRing: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  streakTodayText: {
    fontSize: 8,
    fontWeight: '600',
  },
  streakRule: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  streakRuleIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakRuleCopy: {
    flex: 1,
  },
  streakRuleTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  streakRuleBody: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
  },
  weekStats: {
    flexDirection: 'row',
    gap: 8,
  },
  weekStat: {
    flex: 1,
    height: 62,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStatValue: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '800',
  },
  weekStatEmoji: {
    fontSize: 19,
    lineHeight: 22,
  },
  weekStatLabel: {
    maxWidth: '90%',
    marginTop: 3,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  weekSectionHeading: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  weekSectionHint: {
    fontSize: 9,
    fontWeight: '600',
  },
  weekRail: {
    flexDirection: 'row',
    gap: 5,
  },
  weekRailDay: {
    flex: 1,
    minWidth: 0,
    height: 79,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  weekRailLabel: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  weekRailEmoji: {
    fontSize: 16,
    lineHeight: 19,
  },
  weekRailJournal: {
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRailEmptyText: {
    height: 19,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  weekRailDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekRailCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  weekRailCountText: {
    fontSize: 7,
    fontWeight: '800',
  },
  weekJournaledDays: {
    gap: 8,
  },
  weekJournaledDay: {
    minHeight: 61,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  weekJournaledMood: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekJournaledEmoji: {
    fontSize: 19,
  },
  weekJournaledCopy: {
    flex: 1,
  },
  weekJournaledDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  weekJournaledMeta: {
    marginTop: 3,
    fontSize: 10,
  },
  weekEmpty: {
    minHeight: 68,
    borderRadius: 17,
    borderWidth: 1,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  weekEmptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekEmptyCopy: {
    flex: 1,
  },
  weekEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  weekEmptyBody: {
    marginTop: 3,
    fontSize: 10,
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
