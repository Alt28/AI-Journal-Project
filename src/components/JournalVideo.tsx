import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../ThemeContext';
import { radii } from '../theme';
import { formatDuration } from '../utils';
import { Icon } from './ui';

export const JournalVideo = ({
  uri,
  duration,
  compact = false,
  controls = true,
}: {
  uri: string;
  duration?: number;
  compact?: boolean;
  controls?: boolean;
}) => {
  const palette = useTheme();
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });
  const [inlineControlsVisible, setInlineControlsVisible] = useState(true);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideControlsTimer = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  };

  useEffect(() => {
    clearHideControlsTimer();

    if (!controls) {
      setInlineControlsVisible(false);
      return undefined;
    }

    // Keep controls visible while paused, then remove the large play/pause
    // overlay as soon as playback begins.
    setInlineControlsVisible(!isPlaying);

    return clearHideControlsTimer;
  }, [controls, isPlaying]);

  const revealPlaybackControls = () => {
    clearHideControlsTimer();
    setInlineControlsVisible(true);

    hideControlsTimer.current = setTimeout(() => {
      if (player.playing) {
        setInlineControlsVisible(false);
      }
    }, 2200);
  };

  return (
    <View
      accessibilityLabel={`Attached video${
        duration ? `, ${formatDuration(duration)}` : ''
      }`}
      style={[
        styles.frame,
        compact && styles.compactFrame,
        { backgroundColor: palette.input, borderColor: palette.border },
      ]}
    >
      <VideoView
        contentFit="cover"
        nativeControls={controls && inlineControlsVisible}
        player={player}
        style={styles.video}
      />
      {controls && isPlaying && !inlineControlsVisible ? (
        <Pressable
          accessibilityHint="Shows the playback controls"
          accessibilityLabel="Show video controls"
          accessibilityRole="button"
          onPress={revealPlaybackControls}
          style={styles.revealControls}
        />
      ) : null}
      {!controls ? (
        <View pointerEvents="none" style={styles.playOverlay}>
          <View
            style={[
              styles.playButton,
              { backgroundColor: palette.primary },
            ]}
          >
            <Icon name="play" color={palette.onPrimary} size={20} />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  compactFrame: {
    aspectRatio: 16 / 8.5,
    borderRadius: radii.md,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  revealControls: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
