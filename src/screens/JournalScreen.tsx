import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import { EntryCard } from '../components/EntryCard';
import { Button, Chip, EmptyState, Icon } from '../components/ui';
import { JournalEntry } from '../types';
import { radii } from '../theme';

type Filter = 'all' | 'favorites' | 'voice' | 'photos';

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

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...entries]
      .sort(
        (a, b) =>
          b.entryDate.localeCompare(a.entryDate) ||
          b.createdAt.localeCompare(a.createdAt),
      )
      .filter((entry) => {
        if (filter === 'favorites' && !entry.favorite) return false;
        if (filter === 'voice' && !entry.audioUri) return false;
        if (filter === 'photos' && !entry.imageUris.length) return false;
        if (!normalized) return true;
        return [entry.title, entry.body, entry.entryDate, ...entry.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      });
  }, [entries, filter, query]);

  const emptyTitle =
    entries.length === 0
      ? 'Your journal is ready'
      : query
        ? 'No matching entries'
        : filter === 'favorites'
          ? 'No favorites yet'
          : filter === 'voice'
            ? 'No voice entries yet'
            : 'No photo entries yet';

  const emptyBody =
    entries.length === 0
      ? 'Write about your day or save a private voice reflection.'
      : 'Try changing the search or filter to find what you need.';

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: palette.ink }]}>Journal</Text>
            <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
              {entries.length
                ? `${entries.length} private ${
                    entries.length === 1 ? 'reflection' : 'reflections'
                  }`
                : 'A quiet record of your days'}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Create journal entry"
            onPress={onNew}
            style={({ pressed }) => [
              styles.headerAdd,
              {
                backgroundColor: palette.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name="add" color="#FFFFFF" size={24} />
          </Pressable>
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
              hitSlop={8}
              onPress={() => setQuery('')}
            >
              <Icon name="close-circle" color={palette.inkFaint} size={19} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <Chip label="All entries" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip
            label="Favorites"
            icon="heart-outline"
            selected={filter === 'favorites'}
            onPress={() => setFilter('favorites')}
          />
          <Chip
            label="Voice notes"
            icon="mic-outline"
            selected={filter === 'voice'}
            onPress={() => setFilter('voice')}
          />
          <Chip
            label="Photos"
            icon="images-outline"
            selected={filter === 'photos'}
            onPress={() => setFilter('photos')}
          />
        </ScrollView>

        {filtered.length ? (
          <>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: palette.inkMuted }]}>
                {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              </Text>
              <Icon name="swap-vertical-outline" color={palette.inkFaint} size={17} />
            </View>
            <View style={styles.entryList}>
              {filtered.map((entry) => (
                <EntryCard
                  entry={entry}
                  key={entry.id}
                  onPress={() => onOpenEntry(entry)}
                  onToggleFavorite={() => onToggleFavorite(entry)}
                />
              ))}
            </View>
          </>
        ) : (
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
  headerAdd: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
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
  filters: {
    paddingVertical: 15,
    gap: 8,
  },
  resultRow: {
    marginTop: 3,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  entryList: {
    gap: 13,
  },
  emptyWrap: {
    marginTop: 7,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
});
