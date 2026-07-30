import { StatusBar } from 'expo-status-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  BackHandler,
  Easing,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/ThemeContext';
import { deleteAudioFile } from './src/audioFiles';
import { deleteImageFiles } from './src/imageFiles';
import {
  createJournalVideoThumbnail,
  deleteVideoFile,
  deleteVideoThumbnailFile,
  getJournalVideoSize,
} from './src/videoFiles';
import {
  exportEncryptedBackup,
  importEncryptedBackup,
} from './src/backup';
import { EntryDetail } from './src/components/EntryDetail';
import { EntryEditor } from './src/components/EntryEditor';
import {
  BottomNavigation,
  SideNavigation,
} from './src/components/Navigation';
import { Icon } from './src/components/ui';
import {
  discardJournalDraft,
  loadJournalData,
  loadJournalDraft,
  persistJournal,
  persistJournalDraft,
} from './src/journalRepository';
import { syncDailyReminder } from './src/reminders';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { JournalScreen } from './src/screens/JournalScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { defaultSettings } from './src/storage';
import { resolvePalette } from './src/theme';
import {
  AppSettings,
  AppTab,
  EditorRequest,
  JournalEntry,
} from './src/types';
import { formatReminderTime } from './src/utils';
import { useReducedMotion } from './src/useReducedMotion';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function JournalApp() {
  const systemScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [pendingEditor, setPendingEditor] = useState<EditorRequest | null>(
    null,
  );
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [appLocked, setAppLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [loadFailure, setLoadFailure] = useState('');
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenMotion = useRef(new Animated.Value(1)).current;
  const toastMotion = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);
  const initialUnlockAttempted = useRef(false);
  const splashHidden = useRef(false);
  const recoveredDraftToastPending = useRef(false);
  const videoThumbnailBackfillStarted = useRef(false);
  const settingsRef = useRef(settings);
  const palette = useMemo(
    () => resolvePalette(settings.theme, systemScheme === 'dark'),
    [settings.theme, systemScheme],
  );
  const detailEntry =
    entries.find((entry) => entry.id === detailEntryId) ?? null;

  useEffect(() => {
    if (detailEntryId !== null || !pendingEditor) return;

    const transition = InteractionManager.runAfterInteractions(() => {
      setEditor(pendingEditor);
      setPendingEditor(null);
    });

    return () => transition.cancel();
  }, [detailEntryId, pendingEditor]);

  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !loaded ||
      appLocked ||
      Boolean(loadFailure)
    ) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (editor || detailEntryId) return false;
        if (activeTab !== 'today') {
          setActiveTab('today');
          return true;
        }
        setExitConfirmOpen(true);
        return true;
      },
    );

    return () => subscription.remove();
  }, [activeTab, appLocked, detailEntryId, editor, loadFailure, loaded]);

  const loadAppData = useCallback(async () => {
    setLoadFailure('');
    videoThumbnailBackfillStarted.current = false;
    try {
      const [journal, draft] = await Promise.all([
        loadJournalData(),
        loadJournalDraft(),
      ]);
      setEntries(journal.entries);
      setSettings(journal.settings);
      settingsRef.current = journal.settings;
      if (draft) {
        setEditor({
          draft,
          entry: draft.entryId
            ? journal.entries.find((entry) => entry.id === draft.entryId)
            : undefined,
        });
        recoveredDraftToastPending.current = true;
      }
      setAppLocked(journal.settings.appLockEnabled);
    } catch {
      setLoadFailure(
        'Daybook could not open your journal storage. Your entries were not changed.',
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadAppData();
  }, [loadAppData]);

  useEffect(() => {
    if (
      !loaded ||
      loadFailure ||
      videoThumbnailBackfillStarted.current
    ) {
      return;
    }
    videoThumbnailBackfillStarted.current = true;
    let cancelled = false;
    const missing = entries.filter(
      (entry) =>
        entry.videoUri &&
        (!entry.videoThumbnailUri || !entry.videoSizeBytes),
    );

    void (async () => {
      for (const entry of missing) {
        const thumbnailUri = entry.videoThumbnailUri
          ? undefined
          : await createJournalVideoThumbnail(entry.videoUri!);
        const videoSizeBytes =
          entry.videoSizeBytes ?? getJournalVideoSize(entry.videoUri);
        if (!thumbnailUri && !videoSizeBytes) continue;
        if (cancelled) {
          if (thumbnailUri) {
            await deleteVideoThumbnailFile(thumbnailUri);
          }
          return;
        }
        setEntries((current) =>
          current.map((item) =>
            item.id === entry.id &&
            item.videoUri === entry.videoUri
              ? {
                  ...item,
                  videoSizeBytes:
                    item.videoSizeBytes ?? videoSizeBytes,
                  videoThumbnailUri:
                    item.videoThumbnailUri ?? thumbnailUri,
                }
              : item,
          ),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadFailure, loaded]);

  const hideNativeSplash = useCallback(() => {
    if (!loaded || splashHidden.current) return;
    splashHidden.current = true;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  const retryLoading = () => {
    setLoaded(false);
    void loadAppData();
  };

  useEffect(() => {
    if (!loaded || loadFailure) return;
    const timer = setTimeout(() => {
      void persistJournal({ entries, settings });
    }, 120);
    return () => clearTimeout(timer);
  }, [entries, loadFailure, loaded, settings]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    screenMotion.stopAnimation();
    if (reducedMotion) {
      screenMotion.setValue(1);
      return;
    }
    screenMotion.setValue(0);
    Animated.timing(screenMotion, {
      duration: 210,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [activeTab, reducedMotion, screenMotion]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void import('expo-notifications').then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    });
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastMotion.stopAnimation();
    if (reducedMotion) {
      toastMotion.setValue(1);
    } else {
      toastMotion.setValue(0);
      Animated.spring(toastMotion, {
        damping: 18,
        mass: 0.7,
        stiffness: 210,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
    toastTimer.current = setTimeout(() => {
      if (reducedMotion) {
        setToast('');
        return;
      }
      Animated.timing(toastMotion, {
        duration: 170,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setToast('');
      });
    }, 2600);
  }, [reducedMotion, toastMotion]);

  useEffect(() => {
    if (!loaded || !recoveredDraftToastPending.current) return;
    recoveredDraftToastPending.current = false;
    showToast('Recovered your unsaved draft');
  }, [loaded, showToast]);

  const unlockApp = useCallback(async () => {
    if (authenticating) return false;
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your private Daybook',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) setAppLocked(false);
      return result.success;
    } catch {
      return false;
    } finally {
      setAuthenticating(false);
    }
  }, [authenticating]);

  useEffect(() => {
    if (loaded && appLocked && !initialUnlockAttempted.current) {
      initialUnlockAttempted.current = true;
      void unlockApp();
    }
  }, [appLocked, loaded, unlockApp]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasAway = appState.current !== 'active';
      appState.current = nextState;
      if (nextState !== 'active' && settingsRef.current.appLockEnabled) {
        setAppLocked(true);
      } else if (
        nextState === 'active' &&
        wasAway &&
        settingsRef.current.appLockEnabled
      ) {
        setAppLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  const openNewEntry = (
    mode: 'text' | 'voice' = 'text',
    date?: string,
  ) => {
    setEditor({ mode, date });
  };

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab);
  };

  const saveEntry = (entry: JournalEntry) => {
    const previous = entries.find((item) => item.id === entry.id);
    if (previous?.audioUri && previous.audioUri !== entry.audioUri) {
      void deleteAudioFile(previous.audioUri);
    }
    if (previous?.videoUri && previous.videoUri !== entry.videoUri) {
      void deleteVideoFile(previous.videoUri);
    }
    if (
      previous?.videoThumbnailUri &&
      previous.videoThumbnailUri !== entry.videoThumbnailUri
    ) {
      void deleteVideoThumbnailFile(previous.videoThumbnailUri);
    }
    if (previous) {
      const retainedImages = new Set(entry.imageUris);
      void deleteImageFiles(
        previous.imageUris.filter((uri) => !retainedImages.has(uri)),
      );
    }
    setEntries((current) => {
      const exists = current.some((item) => item.id === entry.id);
      return exists
        ? current.map((item) => (item.id === entry.id ? entry : item))
        : [entry, ...current];
    });
    void discardJournalDraft();
    setEditor(null);
    showToast(previous ? 'Entry updated' : 'Entry saved on this device');
  };

  const deleteEntry = (entry: JournalEntry) => {
    void deleteAudioFile(entry.audioUri);
    void deleteImageFiles(entry.imageUris);
    void deleteVideoFile(entry.videoUri);
    void deleteVideoThumbnailFile(entry.videoThumbnailUri);
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setEditor(null);
    void discardJournalDraft();
    setDetailEntryId(null);
    showToast('Entry deleted');
  };

  const toggleFavorite = (entry: JournalEntry) => {
    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              favorite: !item.favorite,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  };

  const updateSettings = (next: AppSettings) => {
    const reminderChanged =
      next.reminderEnabled !== settings.reminderEnabled ||
      next.reminderHour !== settings.reminderHour ||
      next.reminderMinute !== settings.reminderMinute;
    const pending = { ...next, reminderId: settings.reminderId };
    setSettings(pending);

    if (!reminderChanged) return;
    void syncDailyReminder(pending, settings).then((result) => {
      setSettings((current) => ({
        ...current,
        reminderEnabled: result.error ? false : current.reminderEnabled,
        reminderId: result.reminderId,
      }));
      showToast(
        result.error ??
          (pending.reminderEnabled
            ? `Reminder set for ${formatReminderTime(
                pending.reminderHour,
                pending.reminderMinute,
              )}`
            : 'Daily reminder turned off'),
      );
    });
  };

  const toggleAppLock = async (enabled: boolean) => {
    if (!enabled) {
      updateSettings({ ...settings, appLockEnabled: false });
      showToast('App lock turned off');
      return;
    }
    try {
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      if (securityLevel === LocalAuthentication.SecurityLevel.NONE) {
        showToast('Set up a PIN, pattern, fingerprint, or face unlock first');
        return;
      }
      const verified = await unlockApp();
      if (!verified) {
        showToast('App lock was not enabled');
        return;
      }
      updateSettings({ ...settings, appLockEnabled: true });
      showToast('App lock enabled');
    } catch {
      showToast('App lock is not available on this device');
    }
  };

  const exportBackup = async (password: string) => {
    const result = await exportEncryptedBackup(entries, password);
    showToast(
      result.omittedVideoCount
        ? `Backup saved without ${result.omittedVideoCount} large ${
            result.omittedVideoCount === 1 ? 'video' : 'videos'
          }`
        : 'Encrypted backup ready to save',
    );
  };

  const importBackup = async (password: string) => {
    const restored = await importEncryptedBackup(password, settings);
    if (!restored) return false;
    await Promise.all([
      ...entries.map((entry) => deleteAudioFile(entry.audioUri)),
      ...entries.map((entry) => deleteImageFiles(entry.imageUris)),
      ...entries.map((entry) => deleteVideoFile(entry.videoUri)),
      ...entries.map((entry) =>
        deleteVideoThumbnailFile(entry.videoThumbnailUri),
      ),
    ]);
    setEntries(restored.entries);
    setDetailEntryId(null);
    setEditor(null);
    await discardJournalDraft();
    showToast(`${restored.entries.length} entries restored`);
    return true;
  };

  const eraseEntries = () => {
    const recordings = entries.map((entry) => entry.audioUri).filter(Boolean);
    const images = entries.flatMap((entry) => entry.imageUris);
    const videos = entries.map((entry) => entry.videoUri).filter(Boolean);
    const videoThumbnails = entries
      .map((entry) => entry.videoThumbnailUri)
      .filter(Boolean);
    void Promise.all([
      ...recordings.map((uri) => deleteAudioFile(uri)),
      deleteImageFiles(images),
      ...videos.map((uri) => deleteVideoFile(uri)),
      ...videoThumbnails.map((uri) => deleteVideoThumbnailFile(uri)),
    ]);
    setEntries([]);
    setDetailEntryId(null);
    showToast('All journal entries erased');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'journal':
        return (
          <JournalScreen
            entries={entries}
            onNew={() => openNewEntry('text')}
            onOpenEntry={(entry) => setDetailEntryId(entry.id)}
            onToggleFavorite={toggleFavorite}
          />
        );
      case 'calendar':
        return (
          <CalendarScreen
            entries={entries}
            onNew={(date) => openNewEntry('text', date)}
            onOpenEntry={(entry) => setDetailEntryId(entry.id)}
            onToggleFavorite={toggleFavorite}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            entries={entries}
            settings={settings}
            onExportBackup={exportBackup}
            onImportBackup={importBackup}
            onEraseEntries={eraseEntries}
            onToggleAppLock={(value) => void toggleAppLock(value)}
            onUpdateSettings={updateSettings}
          />
        );
      case 'today':
      default:
        return (
          <TodayScreen
            entries={entries}
            onNew={(mode, date) => openNewEntry(mode, date)}
            onOpenEntry={(entry) => setDetailEntryId(entry.id)}
            onToggleFavorite={toggleFavorite}
            onOpenJournal={() => setActiveTab('journal')}
          />
        );
    }
  };

  if (!loaded) {
    return (
      <ThemeProvider palette={palette}>
        <View style={[styles.loading, { backgroundColor: palette.background }]}>
          <View style={[styles.loadingMark, { backgroundColor: palette.primary }]}>
            <Icon name="leaf" color="#FFFFFF" size={28} />
          </View>
          <Text style={[styles.loadingName, { color: palette.ink }]}>Daybook</Text>
          <ActivityIndicator
            color={palette.primary}
            size="small"
            style={styles.spinner}
          />
        </View>
      </ThemeProvider>
    );
  }

  if (appLocked) {
    return (
      <ThemeProvider palette={palette}>
        <View
          onLayout={hideNativeSplash}
          style={[styles.lockScreen, { backgroundColor: palette.background }]}
        >
          <StatusBar style={palette.isDark ? 'light' : 'dark'} />
          <View
            style={[styles.lockMark, { backgroundColor: palette.primarySoft }]}
          >
            <Icon name="lock-closed" color={palette.primary} size={34} />
          </View>
          <Text style={[styles.lockTitle, { color: palette.ink }]}>
            Daybook is locked
          </Text>
          <Text style={[styles.lockBody, { color: palette.inkMuted }]}>
            Authenticate with your device to view your private journal.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={authenticating}
            onPress={() => void unlockApp()}
            style={({ pressed }) => [
              styles.unlockButton,
              {
                backgroundColor: palette.primary,
                opacity: authenticating ? 0.55 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {authenticating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Icon name="finger-print" color="#FFFFFF" size={21} />
            )}
            <Text style={styles.unlockText}>
              {authenticating ? 'Checking…' : 'Unlock Daybook'}
            </Text>
          </Pressable>
        </View>
      </ThemeProvider>
    );
  }

  if (loadFailure) {
    return (
      <ThemeProvider palette={palette}>
        <View
          onLayout={hideNativeSplash}
          style={[styles.loadError, { backgroundColor: palette.background }]}
        >
          <StatusBar style={palette.isDark ? 'light' : 'dark'} />
          <View style={[styles.loadingMark, { backgroundColor: palette.primary }]}>
            <Icon name="leaf" color="#FFFFFF" size={28} />
          </View>
          <Text style={[styles.loadErrorTitle, { color: palette.ink }]}>
            Daybook needs another moment
          </Text>
          <Text style={[styles.loadErrorBody, { color: palette.inkMuted }]}>
            {loadFailure}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retryLoading}
            style={({ pressed }) => [
              styles.retryButton,
              {
                backgroundColor: palette.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name="refresh-outline" color="#FFFFFF" size={19} />
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider palette={palette}>
      <View
        onLayout={hideNativeSplash}
        style={[styles.app, { backgroundColor: palette.background }]}
      >
        <StatusBar style={palette.isDark ? 'light' : 'dark'} />
        {desktop ? (
          <SideNavigation
            active={activeTab}
            onAdd={() => openNewEntry('text')}
            onChange={changeTab}
          />
        ) : null}
        <SafeAreaView
          edges={desktop ? ['top', 'right', 'bottom'] : ['top']}
          style={styles.main}
        >
          <Animated.View
            style={[
              styles.screen,
              {
                opacity: screenMotion,
                transform: [
                  {
                    translateY: screenMotion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [7, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {renderScreen()}
          </Animated.View>
        </SafeAreaView>
        {!desktop ? (
          <BottomNavigation
            active={activeTab}
            onAdd={() => openNewEntry('text')}
            onChange={changeTab}
          />
        ) : null}

        {toast ? (
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            pointerEvents="none"
            style={[
              styles.toast,
              desktop && styles.desktopToast,
              {
                backgroundColor: palette.ink,
                shadowColor: palette.shadow,
                opacity: toastMotion,
                transform: [
                  {
                    translateY: toastMotion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                  {
                    scale: toastMotion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Icon name="checkmark-circle" color={palette.accent} size={20} />
            <Text style={[styles.toastText, { color: palette.background }]}>
              {toast}
            </Text>
          </Animated.View>
        ) : null}

        <EntryEditor
          request={editor}
          onClearDraft={discardJournalDraft}
          onClose={() => setEditor(null)}
          onDelete={deleteEntry}
          onSaveDraft={persistJournalDraft}
          onSave={saveEntry}
        />
        <EntryDetail
          entry={detailEntry}
          onClose={() => setDetailEntryId(null)}
          onDelete={deleteEntry}
          onEdit={(entry) => {
            setPendingEditor({ entry });
            setDetailEntryId(null);
          }}
          onToggleFavorite={toggleFavorite}
        />
        <Modal
          accessibilityViewIsModal
          animationType="fade"
          onRequestClose={() => setExitConfirmOpen(false)}
          statusBarTranslucent
          transparent
          visible={exitConfirmOpen}
        >
          <View style={styles.exitDialogRoot}>
            <Pressable
              accessibilityLabel="Cancel exit"
              accessibilityRole="button"
              onPress={() => setExitConfirmOpen(false)}
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: palette.overlay },
              ]}
            />
            <View
              style={[
                styles.exitDialog,
                {
                  backgroundColor: palette.elevated,
                  borderColor: palette.border,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <View
                style={[
                  styles.exitDialogIcon,
                  { backgroundColor: palette.primarySoft },
                ]}
              >
                <Icon name="leaf-outline" color={palette.primary} size={24} />
              </View>
              <Text style={[styles.exitDialogTitle, { color: palette.ink }]}>
                Exit Daybook?
              </Text>
              <Text
                style={[styles.exitDialogBody, { color: palette.inkMuted }]}
              >
                Are you sure you want to close the app?
              </Text>
              <View style={styles.exitDialogActions}>
                <Pressable
                  accessibilityLabel="Stay in Daybook"
                  accessibilityRole="button"
                  onPress={() => setExitConfirmOpen(false)}
                  style={({ pressed }) => [
                    styles.exitDialogButton,
                    {
                      backgroundColor: palette.input,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.exitDialogButtonText,
                      { color: palette.ink },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Exit Daybook"
                  accessibilityRole="button"
                  onPress={() => BackHandler.exitApp()}
                  style={({ pressed }) => [
                    styles.exitDialogButton,
                    {
                      backgroundColor: palette.primary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Icon name="exit-outline" color="#FFFFFF" size={18} />
                  <Text
                    style={[
                      styles.exitDialogButtonText,
                      styles.exitDialogExitText,
                    ]}
                  >
                    Exit
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ThemeProvider>
  );
}

export default function App() {
  const systemScheme = useColorScheme();
  const bootstrapPalette = resolvePalette(
    defaultSettings.theme,
    systemScheme === 'dark',
  );

  return (
    <SafeAreaProvider>
      <ThemeProvider palette={bootstrapPalette}>
        <JournalApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadError: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadErrorTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  loadErrorBody: {
    maxWidth: 340,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 50,
    marginTop: 22,
    borderRadius: 25,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingMark: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  spinner: {
    marginTop: 18,
  },
  toast: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    maxWidth: '88%',
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 9,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 15,
    zIndex: 100,
  },
  desktopToast: {
    bottom: 26,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lockScreen: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockMark: {
    width: 72,
    height: 72,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    marginTop: 20,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  lockBody: {
    maxWidth: 310,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  unlockButton: {
    minWidth: 210,
    minHeight: 52,
    marginTop: 24,
    borderRadius: 26,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  unlockText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  exitDialogRoot: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitDialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
  },
  exitDialogIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitDialogTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  exitDialogBody: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  exitDialogActions: {
    width: '100%',
    marginTop: 22,
    flexDirection: 'row',
    gap: 10,
  },
  exitDialogButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  exitDialogButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  exitDialogExitText: {
    color: '#FFFFFF',
  },
});
