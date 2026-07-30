import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import { EntryCard } from '../components/EntryCard';
import { Button, EmptyState, Icon } from '../components/ui';
import { JournalEntry } from '../types';
import { radii } from '../theme';
import { formatDuration } from '../utils';

type Filter = 'all' | 'voice' | 'photos' | 'videos';

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'voice', label: 'Voice' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
] as const;

type MonthSection = {
  data: JournalEntry[][];
  entryCount: number;
  isCurrent: boolean;
  key: string;
  title: string;
};

const monthKeyFor = (dateKey: string) => dateKey.slice(0, 7);

const monthTitleFor = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year ?? 2000, (month ?? 1) - 1, 1).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );
};

const chunkEntries = (entries: JournalEntry[], size: number) => {
  const rows: JournalEntry[][] = [];
  for (let index = 0; index < entries.length; index += size) {
    rows.push(entries.slice(index, index + size));
  }
  return rows;
};

export const JournalScreen = ({
  entries,
  onNew,
  onOpenEntry,
  onToggleFavorite,
}: {
  entries: JournalEntry[];
  onNew: () => void;
  onOpenEntry: (entry: JournalEntry) => void;
  onToggleFavorite: (entry: JournalEntry) => void;
}) => {
  const palette = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...entries]
      .sort(
        (a, b) =>
          b.entryDate.localeCompare(a.entryDate) ||
          b.createdAt.localeCompare(a.createdAt),
      )
      .filter((entry) => {
        if (favoritesOnly && !entry.favorite) return false;
        if (filter === 'voice' && !entry.audioUri) return false;
        if (filter === 'photos' && !entry.imageUris.length) return false;
        if (filter === 'videos' && !entry.videoUri) return false;
        if (!normalized) return true;
        return [entry.title, entry.body, entry.entryDate, ...entry.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      });
  }, [entries, favoritesOnly, filter, query]);

  const monthSections = useMemo<MonthSection[]>(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}`;
    const grouped = new Map<string, JournalEntry[]>();
    filtered.forEach((entry) => {
      const key = monthKeyFor(entry.entryDate);
      const group = grouped.get(key);
      if (group) {
        group.push(entry);
      } else {
        grouped.set(key, [entry]);
      }
    });

    return Array.from(grouped.entries()).map(([key, entriesForMonth]) => ({
      data:
        filter === 'photos' || filter === 'videos'
          ? chunkEntries(entriesForMonth, 3)
          : entriesForMonth.map((entry) => [entry]),
      entryCount: entriesForMonth.length,
      isCurrent: key === currentMonth,
      key,
      title: monthTitleFor(key),
    }));
  }, [filter, filtered]);

  const emptyTitle =
    entries.length === 0
      ? 'Your journal is ready'
      : query
        ? 'No matching entries'
        : favoritesOnly
          ? filter === 'all'
            ? 'No favorites yet'
            : `No favorite ${
                filter === 'photos'
                  ? 'photo'
                  : filter === 'videos'
                    ? 'video'
                    : 'voice'
              } entries yet`
          : filter === 'voice'
            ? 'No voice entries yet'
            : filter === 'photos'
              ? 'No photo entries yet'
              : 'No video entries yet';

  const emptyBody =
    entries.length === 0
      ? 'Write about your day or save a private voice entry.'
      : 'Try changing the search or filter to find what you need.';

  const resultLabel = (() => {
    if (filter === 'all' && !favoritesOnly) {
      return `${filtered.length} ${
        filtered.length === 1 ? 'result' : 'results'
      }`;
    }

    const media =
      filter === 'photos'
        ? 'photo'
        : filter === 'videos'
          ? 'video'
          : filter === 'voice'
            ? 'voice'
            : '';
    const descriptor = [favoritesOnly ? 'favorite' : '', media]
      .filter(Boolean)
      .join(' ');
    return `${filtered.length} ${descriptor}${
      descriptor ? ' ' : ''
    }${filtered.length === 1 ? 'entry' : 'entries'}`;
  })();

  return (
    <SectionList
      contentContainerStyle={styles.scroll}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(row) => row.map((entry) => entry.id).join(':')}
      sections={monthSections}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: palette.ink }]}>Journal</Text>
              <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
                {entries.length
                  ? `${entries.length} private ${
                      entries.length === 1 ? 'entry' : 'entries'
                    }`
                  : 'A quiet record of your days'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.search,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Icon name="search-outline" color={palette.inkFaint} size={20} />
            <TextInput
              accessibilityLabel="Search journal entries"
              value={query}
              onChangeText={setQuery}
              placeholder="Search words, titles, or tags"
              placeholderTextColor={palette.inkFaint}
              selectionColor={palette.primary}
              style={[styles.searchInput, { color: palette.ink }]}
            />
            {query ? (
              <Pressable
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setQuery('')}
                style={styles.clearSearch}
              >
                <Icon name="close-circle" color={palette.inkFaint} size={19} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.filters}>
            <View
              style={[
                styles.filterGroup,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              {filterOptions.map((option) => {
                const selected = filter === option.key;
                return (
                  <Pressable
                    accessibilityLabel={`Show ${option.label.toLowerCase()} entries`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.key}
                    onPress={() => setFilter(option.key)}
                    style={({ pressed }) => [
                      styles.filterButton,
                      {
                        backgroundColor: selected
                          ? palette.primarySoft
                          : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.filterText,
                        {
                          color: selected ? palette.primary : palette.inkMuted,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityHint="Can be combined with any entry type"
              accessibilityLabel={
                favoritesOnly
                  ? 'Show all favorite and non-favorite entries'
                  : 'Show favorites only'
              }
              accessibilityRole="button"
              accessibilityState={{ selected: favoritesOnly }}
              onPress={() => setFavoritesOnly((current) => !current)}
              style={({ pressed }) => [
                styles.favoriteFilter,
                {
                  backgroundColor: favoritesOnly
                    ? palette.primarySoft
                    : palette.surface,
                  borderColor: favoritesOnly
                    ? palette.primary
                    : palette.border,
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
            >
              <Icon
                name={favoritesOnly ? 'heart' : 'heart-outline'}
                color={favoritesOnly ? palette.primary : palette.inkMuted}
                size={19}
              />
            </Pressable>
          </View>

          {filtered.length &&
          (query.trim() || filter !== 'all' || favoritesOnly) ? (
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: palette.inkMuted }]}>
                {resultLabel}
              </Text>
              <View style={styles.sortLabel}>
                <Icon
                  name="arrow-down-outline"
                  color={palette.inkFaint}
                  size={13}
                />
                <Text style={[styles.sortText, { color: palette.inkFaint }]}>
                  Newest first
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View
          style={[
            styles.emptyWrap,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <EmptyState
            icon={entries.length ? 'search-outline' : 'book-outline'}
            title={emptyTitle}
            body={emptyBody}
            action={
              entries.length === 0 ? (
                <Button
                  compact
                  label="Write first entry"
                  icon="create-outline"
                  onPress={onNew}
                />
              ) : undefined
            }
          />
        </View>
      }
      renderItem={({ item }) => {
        if (filter === 'photos' || filter === 'videos') {
          const showingVideos = filter === 'videos';
          return (
            <View style={styles.galleryRow}>
              {item.map((entry) => {
                const previewUri = showingVideos
                  ? entry.videoThumbnailUri
                  : entry.imageUris[0];
                const mediaLabel = showingVideos ? 'video' : 'photo';

                return (
                  <Pressable
                    accessibilityHint={`Opens this ${mediaLabel} journal entry`}
                    accessibilityLabel={`Open ${
                      entry.title.trim() || `${mediaLabel} entry`
                    } from day ${Number(entry.entryDate.slice(8))}`}
                    accessibilityRole="button"
                    key={entry.id}
                    onPress={() => onOpenEntry(entry)}
                    style={({ pressed }) => [
                      styles.galleryTile,
                      {
                        backgroundColor: palette.input,
                        borderColor: palette.border,
                        opacity: pressed ? 0.78 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                  >
                    {previewUri ? (
                      <Image
                        resizeMode="cover"
                        source={{ uri: previewUri }}
                        style={styles.galleryImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.galleryPlaceholder,
                          { backgroundColor: palette.primarySoft },
                        ]}
                      >
                        <Icon
                          name="video-outline"
                          color={palette.primary}
                          size={30}
                        />
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(7,15,12,0.82)']}
                      pointerEvents="none"
                      style={styles.galleryShade}
                    />
                    <View style={styles.galleryDayBadge}>
                      <Text style={styles.galleryDayText}>
                        {Number(entry.entryDate.slice(8))}
                      </Text>
                    </View>
                    {showingVideos ? (
                      <>
                        <View
                          pointerEvents="none"
                          style={styles.galleryVideoPlay}
                        >
                          <Icon name="play" color="#FFFFFF" size={19} />
                        </View>
                        {entry.videoDuration ? (
                          <View style={styles.galleryCountBadge}>
                            <Text style={styles.galleryCountText}>
                              {formatDuration(entry.videoDuration)}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    ) : entry.imageUris.length > 1 ? (
                      <View style={styles.galleryCountBadge}>
                        <Icon name="images" color="#FFFFFF" size={11} />
                        <Text style={styles.galleryCountText}>
                          {entry.imageUris.length}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.galleryCopy}>
                      <Text numberOfLines={1} style={styles.galleryTitle}>
                        {entry.title.trim() ||
                          (showingVideos ? 'Video entry' : 'Photo entry')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {Array.from({ length: 3 - item.length }, (_, index) => (
                <View key={`spacer-${index}`} style={styles.gallerySpacer} />
              ))}
            </View>
          );
        }

        const entry = item[0];
        if (!entry) return null;
        return (
          <View style={styles.entryItem}>
            <EntryCard
              entry={entry}
              onPress={() => onOpenEntry(entry)}
              onToggleFavorite={() => onToggleFavorite(entry)}
            />
          </View>
        );
      }}
      renderSectionHeader={({ section }) => (
        <View
          style={[
            styles.monthHeader,
            { backgroundColor: palette.background },
          ]}
        >
          <View style={styles.monthHeaderRow}>
            <Text style={[styles.monthTitle, { color: palette.ink }]}>
              {section.title}
            </Text>
            {section.isCurrent ? (
              <View
                style={[
                  styles.currentMonthBadge,
                  { backgroundColor: palette.primarySoft },
                ]}
              >
                <Text
                  style={[
                    styles.currentMonthText,
                    { color: palette.primary },
                  ]}
                >
                  THIS MONTH
                </Text>
              </View>
            ) : null}
            <Text style={[styles.monthCount, { color: palette.inkFaint }]}>
              {section.entryCount}{' '}
              {section.entryCount === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          <View
            style={[styles.monthDivider, { backgroundColor: palette.border }]}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 116,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 23,
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
  search: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  clearSearch: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterGroup: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 17,
    borderWidth: 1,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    minWidth: 0,
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteFilter: {
    width: 48,
    height: 48,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRow: {
    marginTop: 3,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthHeader: {
    paddingTop: 7,
    paddingBottom: 10,
  },
  monthHeaderRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  currentMonthBadge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentMonthText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  monthCount: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
  },
  monthDivider: {
    height: 1,
    marginTop: 7,
  },
  entryItem: {
    marginBottom: 13,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  galleryTile: {
    position: 'relative',
    flex: 1,
    aspectRatio: 0.92,
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
  },
  gallerySpacer: {
    flex: 1,
  },
  galleryImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  galleryDayBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 29,
    height: 29,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(9,18,15,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryDayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  galleryCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 29,
    height: 25,
    borderRadius: 9,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(9,18,15,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  galleryCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  galleryVideoPlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 42,
    height: 42,
    marginTop: -21,
    marginLeft: -21,
    borderRadius: 21,
    backgroundColor: 'rgba(9,18,15,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCopy: {
    position: 'absolute',
    right: 9,
    bottom: 9,
    left: 9,
  },
  galleryTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.38)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptyWrap: {
    marginTop: 7,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
});
