import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import { radii, shadows } from '../theme';
import { Icon } from './ui';

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const palette = useTheme();

  return (
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Cancel confirmation"
          accessibilityRole="button"
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
          <View style={[styles.icon, { backgroundColor: palette.dangerSoft }]}>
            <Icon name="trash-outline" color={palette.danger} size={24} />
          </View>

          <Text style={[styles.title, { color: palette.ink }]}>{title}</Text>
          <Text style={[styles.message, { color: palette.inkMuted }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: palette.input,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelText, { color: palette.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: palette.danger,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Icon name="trash-outline" color={palette.onDanger} size={18} />
              <Text style={[styles.confirmText, { color: palette.onDanger }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xl,
    borderWidth: 1,
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
    marginTop: 16,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.35,
    textAlign: 'center',
  },
  message: {
    maxWidth: 330,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: 23,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
