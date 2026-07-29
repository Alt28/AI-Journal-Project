import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import { radii, shadows } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const Icon = ({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => {
  const palette = useTheme();
  return <Ionicons name={name} size={size} color={color ?? palette.ink} />;
};

interface ButtonProps {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  compact?: boolean;
  disabled?: boolean;
  loading?: boolean;
  foregroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({
  label,
  icon,
  onPress,
  variant = 'primary',
  compact = false,
  disabled = false,
  loading = false,
  foregroundColor,
  style,
}: ButtonProps) => {
  const palette = useTheme();
  const background =
    variant === 'primary'
      ? palette.primary
      : variant === 'secondary'
        ? palette.primarySoft
        : variant === 'danger'
          ? palette.dangerSoft
          : 'transparent';
  const foreground =
    foregroundColor ??
    (variant === 'primary'
      ? '#FFFFFF'
      : variant === 'danger'
        ? palette.danger
        : variant === 'secondary'
          ? palette.primaryDark
          : palette.inkMuted);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: background,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={compact ? 17 : 19} color={foreground} /> : null}
          <Text style={[styles.buttonLabel, { color: foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

export const IconButton = ({
  icon,
  onPress,
  label,
  size = 42,
  color,
  background,
  disabled = false,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  color?: string;
  background?: string;
  disabled?: boolean;
}) => {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background ?? palette.input,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={color ?? palette.ink} />
    </Pressable>
  );
};

export const Chip = ({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) => {
  const palette = useTheme();
  const content = (
    <>
      {icon ? (
        <Icon
          name={icon}
          size={15}
          color={selected ? palette.primaryDark : palette.inkMuted}
        />
      ) : null}
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? palette.primaryDark : palette.inkMuted },
        ]}
      >
        {label}
      </Text>
    </>
  );

  const chipStyle: StyleProp<ViewStyle> = [
    styles.chip,
    {
      backgroundColor: selected ? palette.primarySoft : palette.surface,
      borderColor: selected ? palette.primary : palette.border,
    },
  ];

  if (!onPress) return <View style={chipStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        chipStyle,
        {
          opacity: pressed ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {content}
    </Pressable>
  );
};

export const Card = ({
  children,
  style,
  elevated = false,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}>) => {
  const palette = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? palette.elevated : palette.surface,
          borderColor: palette.border,
          shadowColor: palette.shadow,
        },
        elevated && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const SectionHeader = ({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) => {
  const palette = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.ink }]}>{title}</Text>
      {action}
    </View>
  );
};

export const EmptyState = ({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) => {
  const palette = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.primarySoft }]}>
        <Icon name={icon} color={palette.primary} size={28} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.ink }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>{body}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
};

export const BodyText = ({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) => {
  const palette = useTheme();
  return (
    <Text style={[styles.body, { color: palette.inkMuted }, style]}>{children}</Text>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radii.pill,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  buttonCompact: {
    minHeight: 48,
    paddingHorizontal: 15,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  sectionHeader: {
    minHeight: 40,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  empty: {
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyBody: {
    maxWidth: 310,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: 18,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
});
