import { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ViewStyle,
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
  const mood = entry?.mood ? moodMeta[entry.mood] : null;
  const moodTint = mood
    ? palette.isDark
      ? mood.dark
      : mood.light
    : palette.primarySoft;
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] =
    useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewerSessionKey, setViewerSessionKey] = useState(0);

  if (!entry) return null;

  const writtenBody = entry.body.trim();
  const hasDetails = Boolean(
    writtenBody ||
      entry.audioUri ||
      entry.imageUris.length ||
      entry.tags.length,
  );
  const visiblePhotos = entry.imageUris.slice(0, 5);
  const hiddenPhotoCount = Math.max(
    0,
    entry.imageUris.length - visiblePhotos.length,
  );
  const selectedImageIndex = selectedImage
    ? entry.imageUris.indexOf(selectedImage)
    : -1;
  const openPhotoViewer = (uri: string) => {
    setViewerSessionKey((current) => current + 1);
    setSelectedImage(uri);
  };
  const renderGalleryPhoto = (
    uri: string,
    visibleIndex: number,
    layoutStyle: ViewStyle,
  ) => {
    const showHiddenCount =
      hiddenPhotoCount > 0 && visibleIndex === visiblePhotos.length - 1;

    return (
      <Pressable
        accessibilityLabel={`Open attached photo ${visibleIndex + 1}`}
        accessibilityRole="imagebutton"
        key={`${uri}-${visibleIndex}`}
        onPress={() => openPhotoViewer(uri)}
        style={({ pressed }) => [
          styles.photoButton,
          layoutStyle,
          {
            backgroundColor: palette.input,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <Image source={{ uri }} resizeMode="cover" style={styles.photo} />
        {showHiddenCount ? (
          <View style={styles.morePhotosOverlay}>
            <Text style={styles.morePhotosText}>+{hiddenPhotoCount}</Text>
            <Text style={styles.morePhotosLabel}>more</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

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
                backgroundColor: palette.background,
              },
            ]}
          >
            <IconButton
              icon="arrow-back"
              label="Back to journal"
              onPress={onClose}
              background="transparent"
            />
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
            <View
              style={[
                styles.entrySheet,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  shadowColor: palette.shadow,
                },
                shadows.card,
              ]}
            >
              <View
                style={[
                  styles.hero,
                  tablet && styles.tabletHero,
                ]}
              >
                <LinearGradient
                  colors={[moodTint, palette.surface]}
                  end={{ x: 1, y: 1 }}
                  pointerEvents="none"
                  start={{ x: 0, y: 0 }}
                  style={[
                    styles.heroGlow,
                    { opacity: palette.isDark ? 0.2 : 0.34 },
                  ]}
                />
                <View style={styles.heroMeta}>
                  <View style={styles.dateBlock}>
                    <Text style={[styles.date, { color: palette.primary }]}>
                      {formatLongDate(entry.entryDate).toUpperCase()}
                    </Text>
                    <View style={styles.savedRow}>
                      <Icon
                        name="time-outline"
                        color={palette.inkFaint}
                        size={13}
                      />
                      <Text style={[styles.time, { color: palette.inkFaint }]}>
                        Saved {formatTime(entry.createdAt)}
                      </Text>
                    </View>
                  </View>
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
                <Text selectable style={[styles.title, { color: palette.ink }]}>
                  {getEntryTitle(entry)}
                </Text>
              </View>

              {hasDetails ? (
                <View
                  style={[
                    styles.readingSurface,
                    { borderTopColor: palette.border },
                  ]}
                >
                {entry.audioUri ? (
                  <View style={styles.audioSection}>
                    <View style={styles.sectionHeading}>
                      <View style={styles.sectionHeadingTitle}>
                        <Icon
                          name="mic-outline"
                          color={palette.primary}
                          size={15}
                        />
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: palette.inkMuted },
                          ]}
                        >
                          VOICE ENTRY
                        </Text>
                      </View>
                    </View>
                    <AudioPlayer
                      uri={entry.audioUri}
                      recordedDuration={entry.audioDuration}
                    />
                    {writtenBody ? (
                      <Text
                        selectable
                        style={[styles.body, { color: palette.ink }]}
                      >
                        {writtenBody}
                      </Text>
                    ) : null}
                  </View>
                ) : writtenBody ? (
                  <View style={styles.writtenSection}>
                    <Text
                      selectable
                      style={[styles.body, { color: palette.ink }]}
                    >
                      {writtenBody}
                    </Text>
                  </View>
                ) : null}

                {entry.imageUris.length ? (
                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeading}>
                      <View style={styles.sectionHeadingTitle}>
                        <Icon
                          name="images-outline"
                          color={palette.primary}
                          size={15}
                        />
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: palette.inkMuted },
                          ]}
                        >
                          {entry.imageUris.length === 1
                            ? 'PHOTO'
                            : `${entry.imageUris.length} PHOTOS`}
                        </Text>
                      </View>
                      <Text
                        style={[styles.sectionHint, { color: palette.inkFaint }]}
                      >
                        Tap to view
                      </Text>
                    </View>
                    <View
                      accessibilityLabel={`${entry.imageUris.length} attached ${
                        entry.imageUris.length === 1 ? 'photo' : 'photos'
                      }`}
                      style={styles.photos}
                    >
                      {visiblePhotos.length === 1
                        ? visiblePhotos.map((uri, index) =>
                            renderGalleryPhoto(
                              uri,
                              index,
                              styles.singlePhotoButton,
                            ),
                          )
                        : null}

                      {visiblePhotos.length === 2 ? (
                        <View style={styles.photoRow}>
                          {visiblePhotos.map((uri, index) =>
                            renderGalleryPhoto(
                              uri,
                              index,
                              styles.galleryPhotoButton,
                            ),
                          )}
                        </View>
                      ) : null}

                      {visiblePhotos.length === 3 ||
                      visiblePhotos.length === 5 ? (
                        <>
                          <View style={styles.mosaicRow}>
                            {visiblePhotos
                              .slice(0, 1)
                              .map((uri, index) =>
                                renderGalleryPhoto(
                                  uri,
                                  index,
                                  styles.mosaicLeadPhoto,
                                ),
                              )}
                            <View style={styles.mosaicStack}>
                              {visiblePhotos
                                .slice(1, 3)
                                .map((uri, index) =>
                                  renderGalleryPhoto(
                                    uri,
                                    index + 1,
                                    styles.mosaicStackPhoto,
                                  ),
                                )}
                            </View>
                          </View>
                          {visiblePhotos.length === 5 ? (
                            <View style={styles.photoRow}>
                              {visiblePhotos
                                .slice(3, 5)
                                .map((uri, index) =>
                                  renderGalleryPhoto(
                                    uri,
                                    index + 3,
                                    styles.galleryPhotoButton,
                                  ),
                                )}
                            </View>
                          ) : null}
                        </>
                      ) : null}

                      {visiblePhotos.length === 4
                        ? [
                            visiblePhotos.slice(0, 2),
                            visiblePhotos.slice(2, 4),
                          ].map((row, rowIndex) => (
                            <View
                              key={`photo-row-${rowIndex}`}
                              style={styles.photoRow}
                            >
                              {row.map((uri, columnIndex) =>
                                renderGalleryPhoto(
                                  uri,
                                  rowIndex * 2 + columnIndex,
                                  styles.galleryPhotoButton,
                                ),
                              )}
                            </View>
                          ))
                        : null}
                    </View>
                  </View>
                ) : null}

                {entry.tags.length ? (
                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeading}>
                      <View style={styles.sectionHeadingTitle}>
                        <Icon
                          name="pricetags-outline"
                          color={palette.primary}
                          size={15}
                        />
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: palette.inkMuted },
                          ]}
                        >
                          TAGS
                        </Text>
                      </View>
                    </View>
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
                  </View>
                ) : null}
              </View>
              ) : null}
            </View>

            <View
              style={[
                styles.actionPanel,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.actionCopy}>
                <Text style={[styles.actionTitle, { color: palette.ink }]}>
                  Manage entry
                </Text>
                <Text
                  style={[styles.actionDescription, { color: palette.inkMuted }]}
                >
                  Update this entry or remove it from your journal.
                </Text>
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
                      backgroundColor: palette.dangerSoft,
                      borderColor: palette.danger,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Icon name="trash-outline" color={palette.danger} size={19} />
                  <Text
                        style={[
                          styles.deleteText,
                          { color: palette.danger },
                        ]}
                      >
                        Delete
                      </Text>
                </Pressable>
              </View>
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
          {selectedImageIndex >= 0 && entry.imageUris.length > 1 ? (
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>
                {selectedImageIndex + 1} of {entry.imageUris.length}
              </Text>
            </View>
          ) : null}
          {selectedImage ? (
            <FlatList
              accessibilityLabel="Journal photo gallery"
              data={entry.imageUris}
              decelerationRate="fast"
              getItemLayout={(_, index) => ({
                index,
                length: width,
                offset: width * index,
              })}
              horizontal
              initialScrollIndex={Math.max(selectedImageIndex, 0)}
              key={`photo-viewer-${viewerSessionKey}`}
              keyExtractor={(uri, index) => `${uri}-${index}`}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / width,
                );
                setSelectedImage(entry.imageUris[nextIndex] ?? selectedImage);
              }}
              pagingEnabled
              renderItem={({ item, index }) => (
                <View
                  accessibilityLabel={`Journal photo ${index + 1} of ${
                    entry.imageUris.length
                  }`}
                  style={[styles.viewerPage, { width }]}
                >
                  <Image
                    source={{ uri: item }}
                    resizeMode="contain"
                    style={styles.viewerImage}
                  />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              style={styles.viewerList}
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
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingTop: 14,
    paddingBottom: 44,
  },
  tabletScroll: {
    paddingTop: 24,
  },
  entrySheet: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  tabletHero: {
    padding: 24,
  },
  heroGlow: {
    ...StyleSheet.absoluteFill,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
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
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    marginTop: 24,
    maxWidth: '92%',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -0.65,
  },
  mood: {
    minHeight: 34,
    borderRadius: radii.pill,
    paddingHorizontal: 11,
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
    fontSize: 15,
    lineHeight: 25,
  },
  readingSurface: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },
  audioSection: {
    gap: 14,
  },
  writtenSection: {
    paddingVertical: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionHeading: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeadingTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionHint: {
    fontSize: 11,
  },
  detailSection: {
    marginTop: 26,
    gap: 11,
  },
  photos: {
    gap: 8,
  },
  photoRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  singlePhotoButton: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  mosaicRow: {
    width: '100%',
    aspectRatio: 1.38,
    flexDirection: 'row',
    gap: 8,
  },
  mosaicLeadPhoto: {
    height: '100%',
    flex: 1.35,
  },
  mosaicStack: {
    height: '100%',
    flex: 1,
    gap: 8,
  },
  mosaicStackPhoto: {
    width: '100%',
    flex: 1,
  },
  galleryPhotoButton: {
    flex: 1,
    aspectRatio: 1.12,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  morePhotosOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7,13,10,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  morePhotosLabel: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tags: {
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
  actionPanel: {
    marginTop: 18,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 17,
    gap: 16,
  },
  actionCopy: {
    gap: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editButton: {
    flex: 1,
  },
  deleteButton: {
    minWidth: 104,
    minHeight: 50,
    borderRadius: radii.pill,
    borderWidth: 1,
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
  viewerList: {
    width: '100%',
    flex: 1,
  },
  viewerPage: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
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
  viewerCounter: {
    position: 'absolute',
    top: 53,
    alignSelf: 'center',
    zIndex: 2,
    minHeight: 34,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
