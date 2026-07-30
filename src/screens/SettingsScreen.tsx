import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import { MAX_EMBEDDED_BACKUP_VIDEO_BYTES } from '../backup';
import { BackupAction, BackupDialog } from '../components/BackupDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Card, Icon, IconName } from '../components/ui';
import { AppSettings, JournalEntry, ThemePreference } from '../types';
import { radii } from '../theme';
import {
  formatDuration,
  formatReminderTime,
} from '../utils';

const reminderTimes = [
  { hour: 7, minute: 30 },
  { hour: 20, minute: 0 },
  { hour: 21, minute: 0 },
  { hour: 22, minute: 0 },
];

const themes: Array<{
  key: ThemePreference;
  label: string;
  icon: IconName;
}> = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export const SettingsScreen = ({
  settings,
  entries,
  onUpdateSettings,
  onEraseEntries,
  onToggleAppLock,
  onExportBackup,
  onImportBackup,
}: {
  settings: AppSettings;
  entries: JournalEntry[];
  onUpdateSettings: (settings: AppSettings) => void;
  onEraseEntries: () => void;
  onToggleAppLock: (enabled: boolean) => void;
  onExportBackup: (password: string) => Promise<void>;
  onImportBackup: (password: string) => Promise<boolean>;
}) => {
  const palette = useTheme();
  const [eraseConfirmationVisible, setEraseConfirmationVisible] =
    useState(false);
  const [backupAction, setBackupAction] = useState<BackupAction | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState('');
  const audioEntries = entries.filter((entry) => entry.audioUri);
  const audioDuration = audioEntries.reduce(
    (sum, entry) => sum + (entry.audioDuration ?? 0),
    0,
  );
  const daysJournaled = new Set(entries.map((entry) => entry.entryDate)).size;
  const videoEntries = entries.filter((entry) => entry.videoUri);
  const videoBytes = videoEntries.reduce(
    (sum, entry) => sum + (entry.videoSizeBytes ?? 0),
    0,
  );
  const videosWillBeExcluded =
    videoBytes > MAX_EMBEDDED_BACKUP_VIDEO_BYTES;

  const confirmErase = () => {
    if (!entries.length) return;
    setEraseConfirmationVisible(true);
  };

  const openBackup = (action: BackupAction) => {
    setBackupAction(action);
    setBackupPassword('');
    setBackupError('');
  };

  const closeBackup = () => {
    if (backupBusy) return;
    setBackupAction(null);
    setBackupPassword('');
    setBackupError('');
  };

  const submitBackup = async () => {
    if (!backupAction || backupPassword.length < 6) return;
    setBackupBusy(true);
    setBackupError('');
    try {
      if (backupAction === 'export') {
        await onExportBackup(backupPassword);
        setBackupAction(null);
        setBackupPassword('');
      } else {
        const imported = await onImportBackup(backupPassword);
        if (imported) {
          setBackupAction(null);
          setBackupPassword('');
        }
      }
    } catch (reason) {
      setBackupError(
        reason instanceof Error
          ? reason.message
          : 'The backup could not be opened.',
      );
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.ink }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
            Make Daybook feel like yours
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.inkFaint }]}>
          DAILY RHYTHM
        </Text>
        <Card style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View
              style={[styles.settingIcon, { backgroundColor: palette.accentSoft }]}
            >
              <Icon name="notifications-outline" color={palette.accent} size={20} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: palette.ink }]}>
                Journal reminder
              </Text>
              <Text style={[styles.settingBody, { color: palette.inkMuted }]}>
                {Platform.OS === 'web'
                  ? 'Available in the mobile app'
                  : settings.reminderEnabled
                    ? `Every day at ${formatReminderTime(
                        settings.reminderHour,
                        settings.reminderMinute,
                      )}`
                    : 'A gentle daily nudge'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Daily journal reminder"
              disabled={Platform.OS === 'web'}
              value={settings.reminderEnabled}
              onValueChange={(value) =>
                onUpdateSettings({ ...settings, reminderEnabled: value })
              }
              trackColor={{
                false: palette.border,
                true: palette.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.reminderEnabled ? (
            <View style={[styles.timeBlock, { borderTopColor: palette.divider }]}>
              <Text style={[styles.timeLabel, { color: palette.inkMuted }]}>
                Reminder time
              </Text>
              <View style={styles.timeChoices}>
                {reminderTimes.map((time) => {
                  const selected =
                    settings.reminderHour === time.hour &&
                    settings.reminderMinute === time.minute;
                  return (
                    <Pressable
                      accessibilityLabel={`Reminder at ${formatReminderTime(
                        time.hour,
                        time.minute,
                      )}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      key={`${time.hour}:${time.minute}`}
                      onPress={() =>
                        onUpdateSettings({
                          ...settings,
                          reminderHour: time.hour,
                          reminderMinute: time.minute,
                        })
                      }
                      style={({ pressed }) => [
                        styles.timeChoice,
                        {
                          backgroundColor: selected
                            ? palette.primary
                            : palette.input,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeChoiceText,
                          {
                            color: selected
                              ? palette.onPrimary
                              : palette.inkMuted,
                          },
                        ]}
                      >
                        {formatReminderTime(time.hour, time.minute)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Card>

        <Text style={[styles.sectionLabel, { color: palette.inkFaint }]}>
          PRIVACY
        </Text>
        <Card style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View
              style={[styles.settingIcon, { backgroundColor: palette.primarySoft }]}
            >
              <Icon name="finger-print" color={palette.primary} size={21} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: palette.ink }]}>
                App lock
              </Text>
              <Text style={[styles.settingBody, { color: palette.inkMuted }]}>
                Require your fingerprint, face, or device lock when Daybook opens
              </Text>
            </View>
            <Switch
              accessibilityLabel="Lock Daybook with device authentication"
              onValueChange={onToggleAppLock}
              thumbColor="#FFFFFF"
              trackColor={{ false: palette.border, true: palette.primary }}
              value={settings.appLockEnabled}
            />
          </View>
        </Card>

        <Text style={[styles.sectionLabel, { color: palette.inkFaint }]}>
          APPEARANCE
        </Text>
        <Card style={styles.themeCard}>
          {themes.map((theme) => {
            const selected = settings.theme === theme.key;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={theme.key}
                onPress={() => onUpdateSettings({ ...settings, theme: theme.key })}
                style={({ pressed }) => [
                  styles.themeChoice,
                  {
                    backgroundColor: selected
                      ? palette.primarySoft
                      : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Icon
                  name={theme.icon}
                  color={selected ? palette.primaryDark : palette.inkMuted}
                  size={20}
                />
                <Text
                  style={[
                    styles.themeText,
                    { color: selected ? palette.primaryDark : palette.inkMuted },
                  ]}
                >
                  {theme.label}
                </Text>
                {selected ? (
                  <Icon name="checkmark-circle" color={palette.primary} size={20} />
                ) : null}
              </Pressable>
            );
          })}
        </Card>

        <Text style={[styles.sectionLabel, { color: palette.inkFaint }]}>
          YOUR DATA
        </Text>
        <Card style={styles.dataCard}>
          <View style={styles.storageTop}>
            <View>
              <Text style={[styles.settingTitle, { color: palette.ink }]}>
                On this device
              </Text>
              <Text style={[styles.settingBody, { color: palette.inkMuted }]}>
                Daybook never sends your entries away
              </Text>
            </View>
            <View style={[styles.lockBadge, { backgroundColor: palette.primarySoft }]}>
              <Icon name="lock-closed" color={palette.primary} size={18} />
            </View>
          </View>
          <View style={[styles.metrics, { borderTopColor: palette.divider }]}>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: palette.ink }]}>
                {entries.length}
              </Text>
              <Text style={[styles.metricLabel, { color: palette.inkFaint }]}>
                ENTRIES
              </Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: palette.divider }]} />
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: palette.ink }]}>
                {daysJournaled}
              </Text>
              <Text style={[styles.metricLabel, { color: palette.inkFaint }]}>
                DAYS
              </Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: palette.divider }]} />
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: palette.ink }]}>
                {formatDuration(audioDuration)}
              </Text>
              <Text style={[styles.metricLabel, { color: palette.inkFaint }]}>
                AUDIO
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!entries.length}
            onPress={confirmErase}
            style={({ pressed }) => [
              styles.erase,
              {
                borderTopColor: palette.divider,
                opacity: !entries.length ? 0.4 : pressed ? 0.65 : 1,
              },
            ]}
          >
            <Icon name="trash-outline" color={palette.danger} size={19} />
            <Text style={[styles.eraseText, { color: palette.danger }]}>
              Erase all journal entries
            </Text>
          </Pressable>
        </Card>

        <Card style={styles.backupCard}>
          <View style={styles.backupHeader}>
            <View
              style={[styles.settingIcon, { backgroundColor: palette.accentSoft }]}
            >
              <Icon name="archive-outline" color={palette.accent} size={21} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: palette.ink }]}>
                Encrypted backup
              </Text>
              <Text style={[styles.settingBody, { color: palette.inkMuted }]}>
                Keep an offline copy protected by a password
              </Text>
            </View>
          </View>
          <View style={[styles.backupActions, { borderTopColor: palette.divider }]}>
            <Pressable
              accessibilityRole="button"
              disabled={!entries.length}
              onPress={() => openBackup('export')}
              style={({ pressed }) => [
                styles.backupButton,
                {
                  backgroundColor: palette.primarySoft,
                  opacity: !entries.length ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Icon name="share-outline" color={palette.primaryDark} size={18} />
              <Text style={[styles.backupButtonText, { color: palette.primaryDark }]}>
                Export
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => openBackup('import')}
              style={({ pressed }) => [
                styles.backupButton,
                {
                  backgroundColor: palette.input,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Icon name="folder-open-outline" color={palette.ink} size={18} />
              <Text style={[styles.backupButtonText, { color: palette.ink }]}>
                Restore
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={[styles.promise, { backgroundColor: palette.primarySoft }]}>
          <View style={[styles.promiseMark, { backgroundColor: palette.primary }]}>
            <Icon name="leaf" color={palette.onPrimary} size={21} />
          </View>
          <View style={styles.promiseCopy}>
            <Text style={[styles.promiseTitle, { color: palette.primaryDark }]}>
              Private by default
            </Text>
            <Text style={[styles.promiseBody, { color: palette.inkMuted }]}>
              No account. No ads. No cloud sync. Your journal remains yours.
            </Text>
          </View>
        </View>

        <Text style={[styles.version, { color: palette.inkFaint }]}>
          Daybook 1.0 · Made for quiet moments
        </Text>
        </View>
      </ScrollView>
      <ConfirmDialog
        confirmLabel="Erase all"
        message="This permanently removes every journal entry saved by Daybook on this device."
        onCancel={() => setEraseConfirmationVisible(false)}
        onConfirm={() => {
          setEraseConfirmationVisible(false);
          onEraseEntries();
        }}
        title="Erase all entries?"
        visible={eraseConfirmationVisible}
      />
      <BackupDialog
        action={backupAction}
        busy={backupBusy}
        error={backupError}
        onCancel={closeBackup}
        onChangePassword={setBackupPassword}
        onSubmit={() => void submitBackup()}
        password={backupPassword}
        videoBytes={videoBytes}
        videoCount={videoEntries.length}
        videosWillBeExcluded={videosWillBeExcluded}
      />
    </>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 116,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    gap: 13,
  },
  header: {
    marginBottom: 11,
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
  sectionLabel: {
    marginTop: 8,
    marginLeft: 3,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  settingsCard: {
    overflow: 'hidden',
  },
  settingRow: {
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingBody: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
  },
  timeBlock: {
    borderTopWidth: 1,
    padding: 17,
    paddingTop: 14,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  timeChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChoice: {
    minWidth: 76,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChoiceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeCard: {
    padding: 7,
    flexDirection: 'row',
    gap: 5,
  },
  themeChoice: {
    flex: 1,
    height: 78,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  themeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dataCard: {
    overflow: 'hidden',
  },
  backupCard: {
    overflow: 'hidden',
  },
  backupHeader: {
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backupActions: {
    borderTopWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 9,
  },
  backupButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  backupButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  storageTop: {
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockBadge: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    borderTopWidth: 1,
    paddingVertical: 16,
    flexDirection: 'row',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricDivider: {
    width: 1,
    height: 29,
    alignSelf: 'center',
  },
  erase: {
    minHeight: 50,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  eraseText: {
    fontSize: 13,
    fontWeight: '700',
  },
  promise: {
    marginTop: 6,
    borderRadius: radii.lg,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  promiseMark: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseCopy: {
    flex: 1,
  },
  promiseTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  promiseBody: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  version: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
  },
});
