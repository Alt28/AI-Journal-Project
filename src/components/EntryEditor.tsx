import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext';
import { deleteAudioFile } from '../audioFiles';
import {
  deleteImageFile,
  deleteImageFiles,
  keepJournalImage,
  MAX_ENTRY_IMAGES,
} from '../imageFiles';
import { EditorRequest, JournalDraft, JournalEntry, Mood } from '../types';
import { moodMeta, radii, shadows } from '../theme';
import { useReducedMotion } from '../useReducedMotion';
import {
  createId,
  formatDuration,
  formatLongDate,
  fromDateKey,
  toDateKey,
  todayKey,
} from '../utils';
import { AudioPlayer } from './AudioPlayer';
import { ConfirmDialog } from './ConfirmDialog';
import { Button, Icon, IconButton } from './ui';

type EditorMode = 'text' | 'voice';

export const EntryEditor = ({
  request,
  onClose,
  onSave,
  onDelete,
  onSaveDraft,
  onClearDraft,
}: {
  request: EditorRequest | null;
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
  onSaveDraft: (draft: JournalDraft) => Promise<void>;
  onClearDraft: () => Promise<void>;
}) => {
  const palette = useTheme();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const isDesktop = width >= 760;
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });
  const recorderState = useAudioRecorderState(recorder, 150);
  const initialAudioRef = useRef<string | undefined>(undefined);
  const initialImagesRef = useRef<string[]>([]);
  const initialSnapshotRef = useRef('');
  const formScrollRef = useRef<ScrollView>(null);
  const tagsInputRef = useRef<TextInput>(null);
  const recordingPulse = useRef(new Animated.Value(0)).current;

  const [mode, setMode] = useState<EditorMode>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState(todayKey());
  const [mood, setMood] = useState<Mood | null>(null);
  const [tags, setTags] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [audioUri, setAudioUri] = useState<string | undefined>();
  const [audioDuration, setAudioDuration] = useState<number | undefined>();
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [discardConfirmationVisible, setDiscardConfirmationVisible] =
    useState(false);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] =
    useState(false);

  const visible = Boolean(request);
  const existing = request?.entry;

  useEffect(() => {
    recordingPulse.stopAnimation();
    if (!recorderState.isRecording || reducedMotion) {
      recordingPulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(recordingPulse, {
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(recordingPulse, {
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [recorderState.isRecording, recordingPulse, reducedMotion]);

  useEffect(() => {
    if (!visible) return;

    const keyboardSubscription = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        if (tagsInputRef.current?.isFocused()) {
          formScrollRef.current?.scrollToEnd({ animated: true });
        }
      },
    );

    return () => keyboardSubscription.remove();
  }, [visible]);

  useEffect(() => {
    setDeleteConfirmationVisible(false);
    setDiscardConfirmationVisible(false);
    setDraftReady(false);
    setDraftStatus('');
    setMoreOptionsOpen(false);
    if (!request) return;
    const entry = request.entry;
    const draft = request.draft;
    const originalMode = request.mode ?? (entry?.audioUri ? 'voice' : 'text');
    const originalDate = entry?.entryDate ?? request.date ?? todayKey();
    const original = {
      mode: originalMode,
      title: entry?.title ?? '',
      body: entry?.body ?? '',
      date: originalDate,
      mood: entry?.mood ?? null,
      tags: entry?.tags.join(', ') ?? '',
      favorite: entry?.favorite ?? false,
      audioUri: entry?.audioUri,
      audioDuration: entry?.audioDuration,
      imageUris: entry?.imageUris ?? [],
    };
    initialSnapshotRef.current = JSON.stringify(original);
    setMode(draft?.mode ?? original.mode);
    setTitle(draft?.title ?? original.title);
    setBody(draft?.body ?? original.body);
    setDate(draft?.date ?? original.date);
    setMood(draft?.mood ?? original.mood);
    setTags(draft?.tags ?? original.tags);
    setFavorite(draft?.favorite ?? original.favorite);
    setAudioUri(draft?.audioUri ?? original.audioUri);
    setAudioDuration(draft?.audioDuration ?? original.audioDuration);
    setImageUris(draft?.imageUris ?? original.imageUris);
    initialAudioRef.current = entry?.audioUri;
    initialImagesRef.current = entry?.imageUris ?? [];
    setImageBusy(false);
    setImageError('');
    setBusy(false);
    setError('');
    const readyTimer = setTimeout(() => setDraftReady(true), 0);
    return () => clearTimeout(readyTimer);
  }, [request]);

  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        mode,
        title,
        body,
        date,
        mood,
        tags,
        favorite,
        audioUri,
        audioDuration,
        imageUris,
      }),
    [
      audioDuration,
      audioUri,
      body,
      date,
      favorite,
      imageUris,
      mode,
      mood,
      tags,
      title,
    ],
  );
  const hasUnsavedChanges =
    draftReady && draftSnapshot !== initialSnapshotRef.current;

  useEffect(() => {
    if (!request || !draftReady || !hasUnsavedChanges) return;
    setDraftStatus('Saving draft…');
    const timer = setTimeout(() => {
      void onSaveDraft({
        entryId: request.entry?.id,
        mode,
        title,
        body,
        date,
        mood,
        tags,
        favorite,
        audioUri,
        audioDuration,
        imageUris,
        updatedAt: new Date().toISOString(),
      }).then(() => setDraftStatus('Draft saved on this device'));
    }, 500);
    return () => clearTimeout(timer);
  }, [
    audioDuration,
    audioUri,
    body,
    date,
    draftReady,
    favorite,
    hasUnsavedChanges,
    imageUris,
    mode,
    mood,
    onSaveDraft,
    request,
    tags,
    title,
  ]);

  const parsedTags = useMemo(
    () =>
      Array.from(
        new Set(
          tags
            .split(',')
            .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
            .filter(Boolean),
        ),
      ).slice(0, 8),
    [tags],
  );
  const moreOptionsSummary = [
    parsedTags.length
      ? `${parsedTags.length} ${parsedTags.length === 1 ? 'tag' : 'tags'}`
      : '',
    favorite ? 'Favorite' : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const canSave =
    !busy &&
    !imageBusy &&
    !recorderState.isRecording &&
    date <= todayKey() &&
    (mode === 'voice'
      ? Boolean(audioUri)
      : Boolean(title.trim() || body.trim() || imageUris.length));

  const shiftDate = (offset: number) => {
    const next = fromDateKey(date);
    next.setDate(next.getDate() + offset);
    const nextKey = toDateKey(next);
    if (nextKey > todayKey()) return;
    setDate(nextKey);
  };

  const startRecording = async () => {
    setError('');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone access is needed to record a voice entry.');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError('Recording could not start. Please try again.');
    }
  };

  const stopRecording = async () => {
    setBusy(true);
    try {
      const duration = recorderState.durationMillis;
      await recorder.stop();
      if (recorder.uri) {
        if (audioUri && audioUri !== initialAudioRef.current) {
          await deleteAudioFile(audioUri);
        }
        setAudioUri(recorder.uri);
        setAudioDuration(duration);
      } else {
        setError('The recording could not be saved.');
      }
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setError('The recording could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const removeRecording = async () => {
    if (audioUri && audioUri !== initialAudioRef.current) {
      await deleteAudioFile(audioUri);
    }
    setAudioUri(undefined);
    setAudioDuration(undefined);
  };

  const addImages = async () => {
    const remaining = MAX_ENTRY_IMAGES - imageUris.length;
    if (remaining <= 0 || imageBusy) return;
    setImageError('');
    const saved: string[] = [];
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: remaining,
        quality: 1,
      });
      if (result.canceled) return;
      setImageBusy(true);
      const selected = result.assets.slice(0, remaining);
      for (const asset of selected) {
        saved.push(
          await keepJournalImage({
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
          }),
        );
      }
      setImageUris((current) =>
        [...current, ...saved].slice(0, MAX_ENTRY_IMAGES),
      );
    } catch {
      await deleteImageFiles(saved);
      setImageError('Those photos could not be added. Please try again.');
    } finally {
      setImageBusy(false);
    }
  };

  const removeImage = async (uri: string) => {
    if (!initialImagesRef.current.includes(uri)) {
      await deleteImageFile(uri);
    }
    setImageUris((current) => current.filter((item) => item !== uri));
    setImageError('');
  };

  const changeMode = async (nextMode: EditorMode) => {
    if (nextMode === mode) return;
    if (recorderState.isRecording) {
      await recorder.stop();
      if (recorder.uri) await deleteAudioFile(recorder.uri);
      await setAudioModeAsync({ allowsRecording: false });
    }
    if (nextMode === 'text' && audioUri && audioUri !== initialAudioRef.current) {
      await deleteAudioFile(audioUri);
      setAudioUri(undefined);
      setAudioDuration(undefined);
    }
    setMode(nextMode);
    setError('');
  };

  const stopActiveRecording = async () => {
    if (recorderState.isRecording) {
      await recorder.stop();
      if (recorder.uri) await deleteAudioFile(recorder.uri);
      await setAudioModeAsync({ allowsRecording: false });
    }
  };

  const closeEditor = async () => {
    await stopActiveRecording();
    if (hasUnsavedChanges) {
      setDiscardConfirmationVisible(true);
      return;
    }
    onClose();
  };

  const discardAndClose = async () => {
    setDiscardConfirmationVisible(false);
    await stopActiveRecording();
    if (audioUri && audioUri !== initialAudioRef.current) {
      await deleteAudioFile(audioUri);
    }
    const originalImages = new Set(initialImagesRef.current);
    await deleteImageFiles(
      imageUris.filter((uri) => !originalImages.has(uri)),
    );
    await onClearDraft();
    onClose();
  };

  const saveEntry = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: existing?.id ?? createId(),
      title: title.trim(),
      body: body.trim(),
      entryDate: date,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      mood,
      tags: parsedTags,
      favorite,
      audioUri: mode === 'voice' ? audioUri : undefined,
      audioDuration: mode === 'voice' ? audioDuration : undefined,
      imageUris,
    };
    onSave(entry);
  };

  const confirmDelete = () => {
    if (!existing) return;
    setDeleteConfirmationVisible(true);
  };

  const deleteExisting = () => {
    if (!existing) return;
    setDeleteConfirmationVisible(false);
    if (audioUri && audioUri !== existing.audioUri) {
      void deleteAudioFile(audioUri);
    }
    const existingImages = new Set(existing.imageUris);
    void deleteImageFiles(
      imageUris.filter((uri) => !existingImages.has(uri)),
    );
    onDelete(existing);
  };

  return (
    <>
      <Modal
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={() => void closeEditor()}
        presentationStyle={isDesktop ? 'overFullScreen' : 'fullScreen'}
        transparent={isDesktop}
        visible={visible}
      >
        <View
          style={[
            styles.overlay,
            isDesktop && { backgroundColor: palette.overlay },
          ]}
        >
          <SafeAreaView
            edges={isDesktop ? [] : ['top', 'bottom']}
            style={[
              styles.sheet,
              isDesktop && styles.desktopSheet,
              {
                backgroundColor: palette.background,
                shadowColor: palette.shadow,
              },
              isDesktop && shadows.floating,
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.flex}
            >
            <View
              style={[
                styles.editorHeader,
                {
                  backgroundColor: palette.surface,
                  borderBottomColor: palette.border,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => void closeEditor()}
              >
                <Text style={[styles.cancel, { color: palette.inkMuted }]}>
                  Cancel
                </Text>
              </Pressable>
              <Text style={[styles.editorTitle, { color: palette.ink }]}>
                {existing ? 'Edit entry' : 'New entry'}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={!canSave}
                hitSlop={8}
                onPress={saveEntry}
                style={{ opacity: canSave ? 1 : 0.35 }}
              >
                <Text style={[styles.save, { color: palette.primary }]}>Save</Text>
              </Pressable>
            </View>
            {draftStatus && hasUnsavedChanges ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.draftStatus, { color: palette.inkFaint }]}
              >
                {draftStatus}
              </Text>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.form}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              ref={formScrollRef}
              showsVerticalScrollIndicator={false}
            >
              {!existing ? (
                <View style={[styles.modeToggle, { backgroundColor: palette.input }]}>
                  {(['text', 'voice'] as EditorMode[]).map((option) => {
                    const selected = mode === option;
                    return (
                      <Pressable
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        key={option}
                        onPress={() => void changeMode(option)}
                        style={[
                          styles.modeOption,
                          selected && {
                            backgroundColor: palette.surface,
                            shadowColor: palette.shadow,
                          },
                          selected && shadows.card,
                        ]}
                      >
                        <Icon
                          name={option === 'text' ? 'create-outline' : 'mic-outline'}
                          color={selected ? palette.primary : palette.inkFaint}
                          size={18}
                        />
                        <Text
                          style={[
                            styles.modeText,
                            {
                              color: selected ? palette.ink : palette.inkFaint,
                            },
                          ]}
                        >
                          {option === 'text' ? 'Write' : 'Voice'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.dateRow}>
                <IconButton
                  icon="chevron-back"
                  label="Previous day"
                  size={35}
                  onPress={() => shiftDate(-1)}
                />
                <View style={styles.dateCenter}>
                  <Text style={[styles.dateText, { color: palette.ink }]}>
                    {formatLongDate(date)}
                  </Text>
                  <Text style={[styles.dateHint, { color: palette.inkFaint }]}>
                    {date === todayKey() ? 'TODAY' : date}
                  </Text>
                </View>
                <IconButton
                  disabled={date >= todayKey()}
                  icon="chevron-forward"
                  label="Next day"
                  size={35}
                  onPress={() => shiftDate(1)}
                />
              </View>

              <View>
                <Text style={[styles.label, { color: palette.inkMuted }]}>
                  How did it feel?
                </Text>
                <View style={styles.moods}>
                  {(Object.keys(moodMeta) as Mood[]).map((moodKey) => {
                    const item = moodMeta[moodKey];
                    const selected = mood === moodKey;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        key={moodKey}
                        onPress={() => setMood(selected ? null : moodKey)}
                        style={({ pressed }) => [
                          styles.moodChoice,
                          {
                            backgroundColor: palette.isDark ? item.dark : item.light,
                            borderColor: selected ? palette.primary : 'transparent',
                            opacity: pressed ? 0.65 : 1,
                            transform: [{ scale: selected ? 1.05 : 1 }],
                          },
                        ]}
                      >
                        <Text style={styles.moodEmoji}>{item.emoji}</Text>
                        <Text
                          style={[
                            styles.moodLabel,
                            { color: palette.isDark ? palette.ink : '#3E4541' },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={[styles.label, { color: palette.inkMuted }]}>Title</Text>
                <TextInput
                  accessibilityLabel="Entry title"
                  value={title}
                  onChangeText={setTitle}
                  placeholder={
                    mode === 'voice' ? 'Name this moment (optional)' : 'Give today a title'
                  }
                  placeholderTextColor={palette.inkFaint}
                  selectionColor={palette.primary}
                  maxLength={100}
                  style={[
                    styles.titleInput,
                    {
                      color: palette.ink,
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                />
              </View>

              {mode === 'text' ? (
                <View>
                  <Text style={[styles.label, { color: palette.inkMuted }]}>
                    What happened?
                  </Text>
                  <TextInput
                    accessibilityLabel="Journal entry"
                    value={body}
                    onChangeText={setBody}
                    placeholder="Start anywhere. What stood out today?"
                    placeholderTextColor={palette.inkFaint}
                    selectionColor={palette.primary}
                    multiline
                    textAlignVertical="top"
                    style={[
                      styles.bodyInput,
                      {
                        color: palette.ink,
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                    ]}
                  />
                  <Text style={[styles.wordCount, { color: palette.inkFaint }]}>
                    {body.trim() ? body.trim().split(/\s+/).length : 0} words
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={[styles.label, { color: palette.inkMuted }]}>
                    Voice entry
                  </Text>
                  <View
                    style={[
                      styles.recorder,
                      {
                        backgroundColor: palette.surface,
                        borderColor: recorderState.isRecording
                          ? palette.danger
                          : palette.border,
                      },
                    ]}
                  >
                    {recorderState.isRecording ? (
                      <>
                        <Animated.View
                          style={[
                            styles.recordingDot,
                            {
                              backgroundColor: palette.danger,
                              opacity: recordingPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0.42],
                              }),
                              transform: [
                                {
                                  scale: recordingPulse.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.45],
                                  }),
                                },
                              ],
                            },
                          ]}
                        />
                        <Text style={[styles.recordingTime, { color: palette.ink }]}>
                          {formatDuration(recorderState.durationMillis)}
                        </Text>
                        <Text
                          style={[styles.recordingHint, { color: palette.inkMuted }]}
                        >
                          Recording your entry…
                        </Text>
                        <Button
                          compact
                          label="Stop & keep"
                          icon="stop"
                          variant="danger"
                          loading={busy}
                          onPress={() => void stopRecording()}
                        />
                      </>
                    ) : audioUri ? (
                      <>
                        <AudioPlayer
                          uri={audioUri}
                          recordedDuration={audioDuration}
                        />
                        <View style={styles.audioActions}>
                          <Button
                            compact
                            label="Record again"
                            icon="refresh-outline"
                            variant="secondary"
                            onPress={() => void startRecording()}
                          />
                          <Button
                            compact
                            label="Remove"
                            icon="trash-outline"
                            variant="ghost"
                            onPress={() => void removeRecording()}
                          />
                        </View>
                      </>
                    ) : (
                      <>
                        <View
                          style={[
                            styles.micCircle,
                            { backgroundColor: palette.primarySoft },
                          ]}
                        >
                          <Icon name="mic" color={palette.primary} size={29} />
                        </View>
                        <Text style={[styles.recordTitle, { color: palette.ink }]}>
                          Speak freely
                        </Text>
                        <Text
                          style={[styles.recordBody, { color: palette.inkMuted }]}
                        >
                          Your recording is stored on this device and never uploaded.
                        </Text>
                        <Button
                          label="Start recording"
                          icon="mic"
                          onPress={() => void startRecording()}
                        />
                      </>
                    )}
                  </View>
                  {error ? (
                    <View
                      style={[styles.error, { backgroundColor: palette.dangerSoft }]}
                    >
                      <Icon
                        name="alert-circle-outline"
                        color={palette.danger}
                        size={17}
                      />
                      <Text style={[styles.errorText, { color: palette.danger }]}>
                        {error}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              <View>
                <View style={styles.photoHeader}>
                  <Text
                    style={[
                      styles.label,
                      styles.photoLabel,
                      { color: palette.inkMuted },
                    ]}
                  >
                    Photos
                  </Text>
                  <Text style={[styles.photoCount, { color: palette.inkFaint }]}>
                    {imageUris.length}/{MAX_ENTRY_IMAGES}
                  </Text>
                </View>
                <View style={styles.photoGrid}>
                  {imageUris.map((uri, index) => (
                    <View
                      key={uri}
                      style={[
                        styles.photoTile,
                        { backgroundColor: palette.input },
                      ]}
                    >
                      <Image
                        accessibilityLabel={`Attached photo ${index + 1}`}
                        source={{ uri }}
                        resizeMode="cover"
                        style={styles.photo}
                      />
                      <Pressable
                        accessibilityLabel={`Remove attached photo ${index + 1}`}
                        accessibilityRole="button"
                        hitSlop={5}
                        onPress={() => void removeImage(uri)}
                        style={({ pressed }) => [
                          styles.removePhoto,
                          { opacity: pressed ? 0.65 : 1 },
                        ]}
                      >
                        <Icon name="close" color="#FFFFFF" size={17} />
                      </Pressable>
                    </View>
                  ))}
                  {imageUris.length < MAX_ENTRY_IMAGES ? (
                    <Pressable
                      accessibilityLabel="Add photos from device"
                      accessibilityRole="button"
                      disabled={imageBusy}
                      onPress={() => void addImages()}
                      style={({ pressed }) => [
                        imageUris.length
                          ? styles.addPhotoTile
                          : styles.addPhotoEmpty,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                          opacity: imageBusy ? 0.55 : pressed ? 0.72 : 1,
                        },
                      ]}
                    >
                      {imageBusy ? (
                        <ActivityIndicator color={palette.primary} size="small" />
                      ) : (
                        <Icon
                          name="images-outline"
                          color={palette.primary}
                          size={22}
                        />
                      )}
                      <Text
                        style={[styles.addPhotoText, { color: palette.primary }]}
                      >
                        {imageBusy
                          ? 'Adding photos…'
                          : imageUris.length
                            ? 'Add'
                            : 'Add photos'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[styles.photoHint, { color: palette.inkFaint }]}>
                  Stored privately on this device
                </Text>
                {imageError ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.imageError, { color: palette.danger }]}
                  >
                    {imageError}
                  </Text>
                ) : null}
              </View>

              <Pressable
                accessibilityHint="Shows optional tags and favorite settings"
                accessibilityRole="button"
                accessibilityState={{ expanded: moreOptionsOpen }}
                onPress={() => setMoreOptionsOpen((open) => !open)}
                style={({ pressed }) => [
                  styles.moreOptionsToggle,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Icon
                  name="options-outline"
                  color={palette.primary}
                  size={20}
                />
                <View style={styles.moreOptionsCopy}>
                  <Text style={[styles.moreOptionsTitle, { color: palette.ink }]}>
                    More options
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.moreOptionsSummary,
                      { color: palette.inkMuted },
                    ]}
                  >
                    {moreOptionsSummary || 'Tags and favorite'}
                  </Text>
                </View>
                <Icon
                  name={moreOptionsOpen ? 'chevron-up' : 'chevron-down'}
                  color={palette.inkMuted}
                  size={19}
                />
              </Pressable>

              {moreOptionsOpen ? (
                <View
                  style={[
                    styles.moreOptionsPanel,
                    {
                      backgroundColor: palette.input,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <View>
                    <Text style={[styles.label, { color: palette.inkMuted }]}>
                      Tags
                    </Text>
                    <TextInput
                      accessibilityLabel="Entry tags"
                      ref={tagsInputRef}
                      value={tags}
                      onChangeText={setTags}
                      onFocus={() => {
                        requestAnimationFrame(() => {
                          formScrollRef.current?.scrollToEnd({ animated: true });
                        });
                      }}
                      autoCapitalize="none"
                      placeholder="personal, work, gratitude"
                      placeholderTextColor={palette.inkFaint}
                      selectionColor={palette.primary}
                      style={[
                        styles.tagsInput,
                        {
                          color: palette.ink,
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                      ]}
                    />
                    <Text style={[styles.tagHint, { color: palette.inkMuted }]}>
                      Separate tags with commas
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: favorite }}
                    onPress={() => setFavorite((value) => !value)}
                    style={[
                      styles.favoriteRow,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Icon
                      name={favorite ? 'heart' : 'heart-outline'}
                      color={favorite ? palette.danger : palette.inkMuted}
                      size={21}
                    />
                    <View style={styles.favoriteCopy}>
                      <Text style={[styles.favoriteTitle, { color: palette.ink }]}>
                        Keep in favorites
                      </Text>
                      <Text
                        style={[
                          styles.favoriteBody,
                          { color: palette.inkMuted },
                        ]}
                      >
                        Make this entry easier to find
                      </Text>
                    </View>
                    <Icon
                      name={favorite ? 'checkmark-circle' : 'ellipse-outline'}
                      color={favorite ? palette.primary : palette.inkMuted}
                      size={21}
                    />
                  </Pressable>
                </View>
              ) : null}

              {existing ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmDelete}
                  style={({ pressed }) => [
                    styles.delete,
                    {
                      backgroundColor: palette.dangerSoft,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Icon name="trash-outline" color={palette.danger} size={18} />
                  <Text style={[styles.deleteText, { color: palette.danger }]}>
                    Delete this entry
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>
      <ConfirmDialog
        confirmLabel="Delete"
        message="This journal entry and its photos or recording, if any, will be permanently removed."
        onCancel={() => setDeleteConfirmationVisible(false)}
        onConfirm={deleteExisting}
        title="Delete this entry?"
        visible={deleteConfirmationVisible}
      />
      <ConfirmDialog
        confirmLabel="Discard"
        message="Your unsaved changes will be removed from this device."
        onCancel={() => setDiscardConfirmationVisible(false)}
        onConfirm={() => void discardAndClose()}
        title="Discard changes?"
        visible={discardConfirmationVisible}
      />
    </>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    width: '100%',
    height: '100%',
  },
  desktopSheet: {
    width: 660,
    height: '90%',
    maxHeight: 900,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  editorHeader: {
    height: 62,
    borderBottomWidth: 1,
    paddingHorizontal: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: {
    fontSize: 14,
    fontWeight: '600',
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  draftStatus: {
    height: 24,
    paddingTop: 6,
    paddingHorizontal: 20,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  save: {
    fontSize: 14,
    fontWeight: '800',
  },
  form: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 50,
    gap: 23,
  },
  modeToggle: {
    height: 48,
    borderRadius: 15,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  modeOption: {
    flex: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateHint: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  label: {
    marginBottom: 9,
    fontSize: 12,
    fontWeight: '700',
  },
  moods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  moodChoice: {
    flex: 1,
    maxWidth: 95,
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleInput: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  bodyInput: {
    minHeight: 210,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 16,
    fontSize: 15,
    lineHeight: 23,
  },
  wordCount: {
    marginTop: 7,
    marginRight: 3,
    fontSize: 11,
    textAlign: 'right',
  },
  recorder: {
    minHeight: 230,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  recordingTime: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1,
  },
  recordingHint: {
    fontSize: 12,
    marginBottom: 10,
  },
  audioActions: {
    width: '100%',
    marginTop: 7,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  recordBody: {
    maxWidth: 330,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 5,
  },
  error: {
    marginTop: 9,
    borderRadius: 12,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoLabel: {
    marginBottom: 0,
  },
  photoCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  photoGrid: {
    marginTop: 9,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  photoTile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: 'rgba(20,24,22,0.76)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoTile: {
    width: '31.5%',
    aspectRatio: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addPhotoEmpty: {
    width: '100%',
    minHeight: 72,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  photoHint: {
    marginTop: 7,
    marginLeft: 3,
    fontSize: 11,
  },
  imageError: {
    marginTop: 6,
    marginLeft: 3,
    fontSize: 11,
    lineHeight: 16,
  },
  moreOptionsToggle: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  moreOptionsCopy: {
    minWidth: 0,
    flex: 1,
  },
  moreOptionsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  moreOptionsSummary: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
  },
  moreOptionsPanel: {
    marginTop: -12,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14,
    gap: 14,
  },
  tagsInput: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  tagHint: {
    marginTop: 6,
    marginLeft: 3,
    fontSize: 11,
  },
  favoriteRow: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  favoriteCopy: {
    flex: 1,
  },
  favoriteTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  favoriteBody: {
    marginTop: 2,
    fontSize: 11,
  },
  delete: {
    minHeight: 48,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
