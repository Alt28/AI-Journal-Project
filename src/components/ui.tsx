import IconAdjustmentsHorizontal from '@tabler/icons-react-native/IconAdjustmentsHorizontal';
import IconAlertCircle from '@tabler/icons-react-native/IconAlertCircle';
import IconArchive from '@tabler/icons-react-native/IconArchive';
import IconArrowDown from '@tabler/icons-react-native/IconArrowDown';
import IconArrowLeft from '@tabler/icons-react-native/IconArrowLeft';
import IconBell from '@tabler/icons-react-native/IconBell';
import IconBookFilled from '@tabler/icons-react-native/IconBookFilled';
import IconCalendar from '@tabler/icons-react-native/IconCalendar';
import IconCalendarFilled from '@tabler/icons-react-native/IconCalendarFilled';
import IconChartLine from '@tabler/icons-react-native/IconChartLine';
import IconChevronDown from '@tabler/icons-react-native/IconChevronDown';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconChevronRight from '@tabler/icons-react-native/IconChevronRight';
import IconChevronUp from '@tabler/icons-react-native/IconChevronUp';
import IconCircle from '@tabler/icons-react-native/IconCircle';
import IconCircleCheckFilled from '@tabler/icons-react-native/IconCircleCheckFilled';
import IconCircleXFilled from '@tabler/icons-react-native/IconCircleXFilled';
import IconClock from '@tabler/icons-react-native/IconClock';
import IconColorSwatch from '@tabler/icons-react-native/IconColorSwatch';
import IconDeviceMobile from '@tabler/icons-react-native/IconDeviceMobile';
import IconEdit from '@tabler/icons-react-native/IconEdit';
import IconFingerprint from '@tabler/icons-react-native/IconFingerprint';
import IconFlameFilled from '@tabler/icons-react-native/IconFlameFilled';
import IconFolderOpen from '@tabler/icons-react-native/IconFolderOpen';
import IconHeart from '@tabler/icons-react-native/IconHeart';
import IconHeartFilled from '@tabler/icons-react-native/IconHeartFilled';
import IconInfoCircle from '@tabler/icons-react-native/IconInfoCircle';
import IconLeaf from '@tabler/icons-react-native/IconLeaf';
import IconLeafFilled from '@tabler/icons-react-native/IconLeafFilled';
import IconLock from '@tabler/icons-react-native/IconLock';
import IconLogout from '@tabler/icons-react-native/IconLogout';
import IconMicrophone from '@tabler/icons-react-native/IconMicrophone';
import IconMicrophoneFilled from '@tabler/icons-react-native/IconMicrophoneFilled';
import IconMinus from '@tabler/icons-react-native/IconMinus';
import IconMoon from '@tabler/icons-react-native/IconMoon';
import IconNotebook from '@tabler/icons-react-native/IconNotebook';
import IconPhoto from '@tabler/icons-react-native/IconPhoto';
import IconPhotoFilled from '@tabler/icons-react-native/IconPhotoFilled';
import IconPlayerPause from '@tabler/icons-react-native/IconPlayerPause';
import IconPlayerPlay from '@tabler/icons-react-native/IconPlayerPlay';
import IconPlayerStop from '@tabler/icons-react-native/IconPlayerStop';
import IconPlus from '@tabler/icons-react-native/IconPlus';
import IconRefresh from '@tabler/icons-react-native/IconRefresh';
import IconSearch from '@tabler/icons-react-native/IconSearch';
import IconSettings from '@tabler/icons-react-native/IconSettings';
import IconSettingsFilled from '@tabler/icons-react-native/IconSettingsFilled';
import IconShare from '@tabler/icons-react-native/IconShare';
import IconShieldCheck from '@tabler/icons-react-native/IconShieldCheck';
import IconSparkles from '@tabler/icons-react-native/IconSparkles';
import IconSun from '@tabler/icons-react-native/IconSun';
import IconSunFilled from '@tabler/icons-react-native/IconSunFilled';
import IconTags from '@tabler/icons-react-native/IconTags';
import IconTrash from '@tabler/icons-react-native/IconTrash';
import IconTrophy from '@tabler/icons-react-native/IconTrophy';
import IconVideo from '@tabler/icons-react-native/IconVideo';
import IconX from '@tabler/icons-react-native/IconX';
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

const iconMap = {
  add: IconPlus,
  'alert-circle-outline': IconAlertCircle,
  'analytics-outline': IconChartLine,
  'archive-outline': IconArchive,
  'arrow-back': IconArrowLeft,
  'arrow-down-outline': IconArrowDown,
  book: IconBookFilled,
  'book-outline': IconNotebook,
  calendar: IconCalendarFilled,
  'calendar-outline': IconCalendar,
  'checkmark-circle': IconCircleCheckFilled,
  'chevron-back': IconChevronLeft,
  'chevron-down': IconChevronDown,
  'chevron-forward': IconChevronRight,
  'chevron-up': IconChevronUp,
  close: IconX,
  'close-circle': IconCircleXFilled,
  'color-palette-outline': IconColorSwatch,
  'create-outline': IconEdit,
  'ellipse-outline': IconCircle,
  'exit-outline': IconLogout,
  'finger-print': IconFingerprint,
  flame: IconFlameFilled,
  'folder-open-outline': IconFolderOpen,
  heart: IconHeartFilled,
  'heart-outline': IconHeart,
  images: IconPhotoFilled,
  'images-outline': IconPhoto,
  'information-circle-outline': IconInfoCircle,
  leaf: IconLeafFilled,
  'leaf-outline': IconLeaf,
  'lock-closed': IconLock,
  'lock-closed-outline': IconLock,
  mic: IconMicrophoneFilled,
  'mic-outline': IconMicrophone,
  moon: IconMoon,
  'moon-outline': IconMoon,
  notifications: IconBell,
  'notifications-outline': IconBell,
  'options-outline': IconAdjustmentsHorizontal,
  pause: IconPlayerPause,
  'phone-portrait-outline': IconDeviceMobile,
  play: IconPlayerPlay,
  'pricetags-outline': IconTags,
  'refresh-outline': IconRefresh,
  remove: IconMinus,
  'remove-outline': IconMinus,
  'search-outline': IconSearch,
  settings: IconSettingsFilled,
  'settings-outline': IconSettings,
  'share-outline': IconShare,
  'shield-checkmark-outline': IconShieldCheck,
  sparkles: IconSparkles,
  stop: IconPlayerStop,
  sunny: IconSunFilled,
  'sunny-outline': IconSun,
  'time-outline': IconClock,
  'trash-outline': IconTrash,
  'trophy-outline': IconTrophy,
  'video-outline': IconVideo,
} as const;

export type IconName = keyof typeof iconMap;

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
  const TablerIcon = iconMap[name];
  return (
    <TablerIcon
      color={color ?? palette.ink}
      size={size}
      strokeWidth={1.85}
    />
  );
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
      ? palette.onPrimary
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
  size = 48,
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
