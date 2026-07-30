import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import { JournalEntry } from '../types';
import { moodMeta, radii, shadows } from '../theme';
import { useReducedMotion } from '../useReducedMotion';
import {
  formatEntryDate,
  formatDuration,
  formatTime,
  getEntryPreview,
  getEntryTitle,
} from '../utils';
import { AudioPlayer } from './AudioPlayer';
import { JournalVideo } from './JournalVideo';
import { Icon } from './ui';

export const EntryCard = ({
  entry,
  onPress,
  onToggleFavorite,
  compact = false,
}: {
  entry: JournalEntry;
  onPress: () => void;
  onToggleFavorite: () => void;
  compact?: boolean;
}) => {
  const palette = useTheme();
  const reducedMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  const mood = entry.mood ? moodMeta[entry.mood] : null;

  useEffect(() => {
    entrance.stopAnimation();
    if (reducedMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    Animated.timing(entrance, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance, reducedMotion]);

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          {
            translateY: entrance.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
          {
            scale: entrance.interpolate({
              inputRange: [0, 1],
              outputRange: [0.99, 1],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          compact && styles.compactCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            shadowColor: palette.shadow,
            opacity: pressed ? 0.86 : 1,
            transform: [{ scale: pressed ? 0.995 : 1 }],
          },
          !compact && shadows.card,
        ]}
      >
        <View style={styles.topRow}>
        <View style={styles.dateRow}>
          <Text style={[styles.date, { color: palette.primary }]}>
            {formatEntryDate(entry.entryDate)}
          </Text>
          <View style={[styles.dot, { backgroundColor: palette.inkFaint }]} />
          <Text style={[styles.time, { color: palette.inkFaint }]}>
            {formatTime(entry.createdAt)}
          </Text>
        </View>
        <View style={styles.topActions}>
          {mood ? (
            <View
              style={[
                styles.mood,
                { backgroundColor: palette.isDark ? mood.dark : mood.light },
              ]}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityLabel={
              entry.favorite ? 'Remove from favorites' : 'Add to favorites'
            }
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
          >
            <Icon
              name={entry.favorite ? 'heart' : 'heart-outline'}
              color={entry.favorite ? palette.danger : palette.inkFaint}
              size={20}
            />
          </Pressable>
        </View>
        </View>

        <Text
          numberOfLines={compact ? 1 : 2}
          style={[
            styles.title,
            compact && styles.compactTitle,
            { color: palette.ink },
          ]}
        >
          {getEntryTitle(entry)}
        </Text>

        {entry.imageUris.length ? (
          <View
            style={[
              styles.photoPreview,
              compact && styles.compactPhotoPreview,
              { backgroundColor: palette.input },
            ]}
          >
            <Image
              accessibilityLabel="Journal entry photo"
              source={{ uri: entry.imageUris[0] }}
              resizeMode="cover"
              style={styles.photo}
            />
            {entry.imageUris.length > 1 ? (
              <View style={styles.photoCount}>
                <Icon name="images" color="#FFFFFF" size={13} />
                <Text style={styles.photoCountText}>
                  {entry.imageUris.length}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {entry.videoUri ? (
          <View
            style={[
              styles.videoPreview,
              compact && styles.compactVideoPreview,
              { backgroundColor: palette.input },
            ]}
          >
            {entry.videoThumbnailUri ? (
              <>
                <Image
                  accessibilityLabel="Journal entry video thumbnail"
                  source={{ uri: entry.videoThumbnailUri }}
                  resizeMode="cover"
                  style={styles.photo}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.videoPlay,
                    { backgroundColor: palette.primary },
                  ]}
                >
                  <Icon name="play" color={palette.onPrimary} size={18} />
                </View>
              </>
            ) : (
              <View pointerEvents="none">
                <JournalVideo
                  compact
                  controls={false}
                  duration={entry.videoDuration}
                  uri={entry.videoUri}
                />
              </View>
            )}
            {entry.videoDuration ? (
              <View style={styles.videoDuration}>
                <Icon name="video-outline" color="#FFFFFF" size={13} />
                <Text style={styles.videoDurationText}>
                  {formatDuration(entry.videoDuration)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {entry.audioUri ? (
          <AudioPlayer
            uri={entry.audioUri}
            recordedDuration={entry.audioDuration}
            compact
          />
        ) : (
          <Text
            numberOfLines={compact ? 2 : 3}
            style={[styles.preview, { color: palette.inkMuted }]}
          >
            {getEntryPreview(entry)}
          </Text>
        )}

        {entry.tags.length > 0 ? (
          <View style={styles.tags}>
            {entry.tags.slice(0, compact ? 2 : 3).map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: palette.input }]}
              >
                <Text style={[styles.tagText, { color: palette.inkMuted }]}>
                  #{tag}
                </Text>
              </View>
            ))}
            {entry.tags.length > (compact ? 2 : 3) ? (
              <Text style={[styles.moreTags, { color: palette.inkFaint }]}>
                +{entry.tags.length - (compact ? 2 : 3)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 18,
    gap: 11,
  },
  compactCard: {
    padding: 16,
    gap: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mood: {
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 15,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  compactTitle: {
    fontSize: 17,
    lineHeight: 21,
  },
  photoPreview: {
    width: '100%',
    height: 150,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  compactPhotoPreview: {
    height: 82,
    borderRadius: radii.sm,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoCount: {
    position: 'absolute',
    right: 9,
    bottom: 9,
    minWidth: 38,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(18,24,21,0.76)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  videoPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  compactVideoPreview: {
    aspectRatio: 16 / 8.5,
    borderRadius: radii.sm,
  },
  videoPlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDuration: {
    position: 'absolute',
    right: 9,
    bottom: 9,
    minWidth: 54,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(18,24,21,0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  videoDurationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  preview: {
    fontSize: 14,
    lineHeight: 21,
  },
  tags: {
    paddingTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  tag: {
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreTags: {
    fontSize: 12,
    fontWeight: '600',
  },
});
