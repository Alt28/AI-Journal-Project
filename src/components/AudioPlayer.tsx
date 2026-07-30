import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../ThemeContext';
import { formatDuration } from '../utils';
import { Icon } from './ui';

export const AudioPlayer = ({
  uri,
  recordedDuration,
  compact = false,
}: {
  uri: string;
  recordedDuration?: number;
  compact?: boolean;
}) => {
  const palette = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const durationMs =
    status.duration > 0 ? status.duration * 1000 : recordedDuration ?? 0;
  const progress =
    status.duration > 0
      ? Math.max(0, Math.min(1, status.currentTime / status.duration))
      : 0;

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [player, status.didJustFinish]);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.compact,
        { backgroundColor: palette.primarySoft },
      ]}
    >
      <Pressable
        accessibilityLabel={status.playing ? 'Pause voice entry' : 'Play voice entry'}
        accessibilityRole="button"
        hitSlop={7}
        onPress={toggle}
        style={({ pressed }) => [
          styles.play,
          {
            backgroundColor: palette.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Icon
          name={status.playing ? 'pause' : 'play'}
          color={palette.onPrimary}
          size={compact ? 15 : 17}
        />
      </Pressable>
      <View style={styles.trackColumn}>
        <View style={[styles.track, { backgroundColor: `${palette.primary}32` }]}>
          <View
            style={[
              styles.progress,
              {
                width: `${progress * 100}%`,
                backgroundColor: palette.primary,
              },
            ]}
          />
        </View>
        {!compact ? (
          <Text style={[styles.duration, { color: palette.inkMuted }]}>
            {status.playing
              ? formatDuration(status.currentTime * 1000)
              : formatDuration(durationMs)}
          </Text>
        ) : null}
      </View>
      {compact ? (
        <Text style={[styles.compactDuration, { color: palette.primaryDark }]}>
          {formatDuration(durationMs)}
        </Text>
      ) : (
        <Icon name="mic-outline" color={palette.primary} size={17} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  compact: {
    height: 44,
    borderRadius: 13,
  },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackColumn: {
    flex: 1,
    gap: 5,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 2,
  },
  duration: {
    fontSize: 11,
    fontWeight: '600',
  },
  compactDuration: {
    minWidth: 31,
    fontSize: 11,
    fontWeight: '700',
  },
});
