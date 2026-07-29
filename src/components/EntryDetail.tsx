import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext';
import { JournalEntry } from '../types';
import { moodMeta, radii, shadows } from '../theme';
import {
  formatLongDate,
  formatTime,
  getEntryPreview,
  getEntryTitle,
} from '../utils';
import { AudioPlayer } from './AudioPlayer';
import { Button, Icon, IconButton } from './ui';
import { ConfirmDialog } from './ConfirmDialog';

export const EntryDetail = ({
  entry,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  entry: JournalEntry | null;
  onClose: () => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
  onToggleFavorite: (entry: JournalEntry) => void;
}) => {
  const palette = useTheme();
  const { width } = useWindowDimensions();
  const tablet = width >= 720;
  const galleryColumns = width >= 560 ? 4 : 3;
  const galleryGap = 7;
  const readingSurfaceWidth = Math.max(0, Math.min(width, 720) - 84);
  const galleryTileSize = Math.floor(
    (readingSurfaceWidth - galleryGap * (galleryColumns - 1)) /
      galleryColumns,
  );
  const mood = entry?.mood ? moodMeta[entry.mood] : null;
  const moodTint = mood
    ? palette.isDark
      ? mood.dark
      : mood.light
    : palette.primarySoft;
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] =
    useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!entry) return null;

  return (
    <>
      <Modal
        animationType="slide"
        onRequestClose={onClose}
        presentationStyle="fullScreen"
        visible={Boolean(entry)}
      >
        <SafeAreaView
          edges={['top', 'bottom']}
          style={[styles.screen, { backgroundColor: palette.background }]}
        >
          <View
            style={[
              styles.header,
              {
                backgroundColor: palette.surface,
                borderBottomColor: palette.border,
              },
            ]}
          >
            <IconButton
              icon="arrow-back"
              label="Back to journal"
              onPress={onClose}
              background="transparent"
            />
            <Text style={[styles.headerTitle, { color: palette.ink }]}>Entry</Text>
            <Pressable
              accessibilityLabel={
                entry.favorite ? 'Remove from favorites' : 'Add to favorites'
              }
              accessibilityRole="button"
              onPress={() => onToggleFavorite(entry)}
              style={({ pressed }) => [
                styles.favoriteButton,
                {
                  backgroundColor: entry.favorite
                    ? palette.dangerSoft
                    : palette.input,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Icon
                name={entry.favorite ? 'heart' : 'heart-outline'}
                color={entry.favorite ? palette.danger : palette.inkMuted}
                size={20}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              tablet && styles.tabletScroll,
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.hero, tablet && styles.tabletHero]}>
              <LinearGradient
                colors={[moodTint, palette.background]}
                end={{ x: 0.9, y: 1 }}
                pointerEvents="none"
                start={{ x: 0, y: 0 }}
                style={[
                  styles.heroGlow,
                  { opacity: palette.isDark ? 0.5 : 0.65 },
                ]}
              />
              <View style={styles.dateBlock}>
                <Text style={[styles.date, { color: palette.primary }]}>
                  {formatLongDate(entry.entryDate).toUpperCase()}
                </Text>
                <Text style={[styles.time, { color: palette.inkFaint }]}>
                  Saved at {formatTime(entry.createdAt)}
                </Text>
              </View>

              <View style={styles.titleRow}>
                <Text selectable style={[styles.title, { color: palette.ink }]}>
                  {getEntryTitle(entry)}
                </Text>
                {mood ? (
                  <View
                    style={[
                      styles.mood,
                      {
                        backgroundColor: palette.isDark
                          ? mood.dark
                          : mood.light,
                      },
                    ]}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={[styles.moodText, { color: palette.ink }]}>
                      {mood.label}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.readingSurface,
                {
                  backgroundColor: palette.surface,
                  shadowColor: palette.shadow,
                },
                shadows.card,
              ]}
            >
              {entry.audioUri ? (
                <View style={styles.audioSection}>
                  <Text
                    style={[styles.sectionLabel, { color: palette.inkMuted }]}
                  >
                    VOICE REFLECTION
                  </Text>
                  <AudioPlayer
                    uri={entry.audioUri}
                    recordedDuration={entry.audioDuration}
                  />
                  {entry.body ? (
                    <Text
                      selectable
                      style={[styles.body, { color: palette.ink }]}
                    >
                      {entry.body}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text selectable style={[styles.body, { color: palette.ink }]}>
                  {getEntryPreview(entry)}
                </Text>
              )}

              {entry.imageUris.length ? (
                <View style={styles.photoSection}>
                  <View style={styles.photoHeader}>
                    <Text
                      style={[styles.sectionLabel, { color: palette.inkMuted }]}
                    >
                      PHOTOS
                    </Text>
                    <Text
                      style={[styles.photoCount, { color: palette.inkFaint }]}
                    >
                      {entry.imageUris.length}
                    </Text>
                  </View>
                  <View
                    accessibilityLabel={`${entry.imageUris.length} attached ${
                      entry.imageUris.length === 1 ? 'photo' : 'photos'
                    }`}
                    style={[styles.photos, { gap: galleryGap }]}
                  >
                    {entry.imageUris.map((uri, index) => (
                      <Pressable
                        accessibilityLabel={`Open attached photo ${index + 1}`}
                        accessibilityRole="imagebutton"
                        key={uri}
                        onPress={() => setSelectedImage(uri)}
                        style={({ pressed }) => [
                          styles.photoButton,
                          entry.imageUris.length === 1
                            ? styles.singlePhotoButton
                            : {
                                width: galleryTileSize,
                                height: galleryTileSize,
                              },
                          {
                            backgroundColor: palette.input,
                            opacity: pressed ? 0.82 : 1,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri }}
                          resizeMode="cover"
                          style={styles.photo}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {entry.tags.length ? (
                <View style={styles.tags}>
                  {entry.tags.map((tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.tag,
                        { backgroundColor: palette.primarySoft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          { color: palette.primaryDark },
                        ]}
                      >
                        #{tag}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.actions}>
              <Button
                label="Edit entry"
                icon="create-outline"
                onPress={() => onEdit(entry)}
                style={styles.editButton}
              />
              <Pressable
                accessibilityLabel="Delete entry"
                accessibilityRole="button"
                onPress={() => setDeleteConfirmationVisible(true)}
                style={({ pressed }) => [
                  styles.deleteButton,
                  {
                    backgroundColor: pressed
                      ? palette.dangerSoft
                      : 'transparent',
                  },
                ]}
              >
                <Icon name="trash-outline" color={palette.danger} size={19} />
                <Text style={[styles.deleteText, { color: palette.danger }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <ConfirmDialog
        confirmLabel="Delete"
        message="This permanently removes the journal entry and its photos or voice recording, if any."
        onCancel={() => setDeleteConfirmationVisible(false)}
        onConfirm={() => {
          setDeleteConfirmationVisible(false);
          onDelete(entry);
        }}
        title="Delete this entry?"
        visible={deleteConfirmationVisible}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
        statusBarTranslucent
        transparent
        visible={Boolean(selectedImage)}
      >
        <SafeAreaView style={styles.viewer}>
          <Pressable
            accessibilityLabel="Close photo"
            accessibilityRole="button"
            onPress={() => setSelectedImage(null)}
            style={({ pressed }) => [
              styles.viewerClose,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Icon name="close" color="#FFFFFF" size={24} />
          </Pressable>
          {selectedImage ? (
            <Image
              accessibilityLabel="Journal photo, full screen"
              source={{ uri: selectedImage }}
              resizeMode="contain"
              style={{ width, height: '100%' }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    height: 62,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 44,
  },
  tabletScroll: {
    paddingTop: 44,
  },
  hero: {
    minHeight: 220,
    borderRadius: radii.xl,
    paddingHorizontal: 20,
    paddingVertical: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tabletHero: {
    minHeight: 240,
    padding: 28,
  },
  heroGlow: {
    ...StyleSheet.absoluteFill,
  },
  dateBlock: {
    gap: 5,
  },
  date: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  time: {
    fontSize: 11,
  },
  titleRow: {
    marginTop: 32,
    gap: 16,
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  mood: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodEmoji: {
    fontSize: 17,
  },
  moodText: {
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    fontSize: 17,
    lineHeight: 29,
  },
  readingSurface: {
    marginTop: 18,
    minHeight: 150,
    borderRadius: radii.lg,
    padding: 20,
  },
  audioSection: {
    gap: 15,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  photoSection: {
    marginTop: 20,
    gap: 9,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoButton: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  singlePhotoButton: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  tags: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    flex: 1,
  },
  deleteButton: {
    minWidth: 96,
    minHeight: 50,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(5,8,6,0.98)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 48,
    right: 18,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
