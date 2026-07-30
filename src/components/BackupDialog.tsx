import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import { radii, shadows } from '../theme';
import { formatFileSize } from '../utils';
import { Icon } from './ui';

export type BackupAction = 'export' | 'import';

export const BackupDialog = ({
  action,
  busy,
  error,
  password,
  onChangePassword,
  onCancel,
  onSubmit,
  videoBytes,
  videoCount,
  videosWillBeExcluded,
}: {
  action: BackupAction | null;
  busy: boolean;
  error: string;
  password: string;
  onChangePassword: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  videoBytes: number;
  videoCount: number;
  videosWillBeExcluded: boolean;
}) => {
  const palette = useTheme();
  const exporting = action === 'export';

  return (
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={Boolean(action)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Pressable
          accessibilityLabel="Close backup dialog"
          accessibilityRole="button"
          disabled={busy}
          onPress={onCancel}
          style={[styles.backdrop, { backgroundColor: palette.overlay }]}
        />
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: palette.elevated,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
            shadows.floating,
          ]}
        >
          <View style={[styles.icon, { backgroundColor: palette.primarySoft }]}>
            <Icon
              name={exporting ? 'lock-closed-outline' : 'shield-checkmark-outline'}
              color={palette.primary}
              size={25}
            />
          </View>
          <Text style={[styles.title, { color: palette.ink }]}>
            {exporting ? 'Create encrypted backup' : 'Restore encrypted backup'}
          </Text>
          <Text style={[styles.message, { color: palette.inkMuted }]}>
            {exporting
              ? videosWillBeExcluded
                ? `Your ${videoCount === 1 ? 'video uses' : 'videos use'} ${formatFileSize(
                    videoBytes,
                  )}. To keep this export reliable, entries, photos, and recordings will be backed up, but videos will not. Keep the original clips separately.`
                : 'Choose a password with at least 6 characters. Entries and attached media are included and protected.'
              : 'Enter the backup password, then choose a .daybook file. Restoring replaces the entries currently on this device.'}
          </Text>
          <TextInput
            accessibilityLabel="Backup password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            onChangeText={onChangePassword}
            onSubmitEditing={onSubmit}
            placeholder="Backup password"
            placeholderTextColor={palette.inkFaint}
            returnKeyType="done"
            secureTextEntry
            selectionColor={palette.primary}
            style={[
              styles.input,
              {
                backgroundColor: palette.input,
                borderColor: error ? palette.danger : palette.border,
                color: palette.ink,
              },
            ]}
            value={password}
          />
          {error ? (
            <Text
              accessibilityLiveRegion="assertive"
              style={[styles.error, { color: palette.danger }]}
            >
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: palette.input,
                  opacity: busy ? 0.45 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: palette.ink }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy || password.length < 6}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: palette.primary,
                  opacity:
                    busy || password.length < 6 ? 0.4 : pressed ? 0.78 : 1,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={palette.onPrimary} size="small" />
              ) : (
                <Icon
                  name={exporting ? 'share-outline' : 'folder-open-outline'}
                  color={palette.onPrimary}
                  size={18}
                />
              )}
              <Text style={[styles.buttonText, { color: palette.onPrimary }]}>
                {busy
                  ? 'Working…'
                  : exporting && videosWillBeExcluded
                    ? 'Save without videos'
                    : exporting
                      ? 'Save backup'
                      : 'Choose file'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialog: {
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    minHeight: 52,
    marginTop: 19,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  error: {
    width: '100%',
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    width: '100%',
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
