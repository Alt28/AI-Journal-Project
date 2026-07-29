import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext';
import { AppTab } from '../types';
import { shadows } from '../theme';
import { Icon, IconName } from './ui';

const tabs: Array<{
  key: AppTab;
  label: string;
  icon: IconName;
  activeIcon: IconName;
}> = [
  { key: 'today', label: 'Today', icon: 'sunny-outline', activeIcon: 'sunny' },
  {
    key: 'journal',
    label: 'Journal',
    icon: 'book-outline',
    activeIcon: 'book',
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
];

export const BottomNavigation = ({
  active,
  onChange,
  onAdd,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  onAdd: () => void;
}) => {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const firstTabs = tabs.slice(0, 2);
  const lastTabs = tabs.slice(2);

  const renderTab = (tab: (typeof tabs)[number]) => {
    const selected = active === tab.key;
    return (
      <Pressable
        accessibilityLabel={tab.label}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        key={tab.key}
        onPress={() => onChange(tab.key)}
        style={({ pressed }) => [
          styles.mobileTab,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Icon
          name={selected ? tab.activeIcon : tab.icon}
          color={selected ? palette.primary : palette.inkFaint}
          size={22}
        />
        <Text
          style={[
            styles.mobileTabLabel,
            { color: selected ? palette.primary : palette.inkFaint },
          ]}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.mobileNav,
        {
          minHeight: 70 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: palette.nav,
          borderTopColor: palette.border,
          shadowColor: palette.shadow,
        },
        shadows.floating,
      ]}
    >
      <View style={styles.mobileGroup}>{firstTabs.map(renderTab)}</View>
      <View style={styles.addSlot}>
        <Pressable
          accessibilityLabel="New journal entry"
          accessibilityRole="button"
          onPress={onAdd}
          style={({ pressed }) => [
            styles.add,
            {
              backgroundColor: palette.primary,
              shadowColor: palette.primaryDark,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
            shadows.floating,
          ]}
        >
          <Icon name="add" color="#FFFFFF" size={29} />
        </Pressable>
      </View>
      <View style={styles.mobileGroup}>{lastTabs.map(renderTab)}</View>
    </View>
  );
};

export const SideNavigation = ({
  active,
  onChange,
  onAdd,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  onAdd: () => void;
}) => {
  const palette = useTheme();

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: palette.surface,
          borderRightColor: palette.border,
        },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.brandMark, { backgroundColor: palette.primary }]}>
          <Icon name="leaf" color="#FFFFFF" size={20} />
        </View>
        <View>
          <Text style={[styles.brandName, { color: palette.ink }]}>Daybook</Text>
          <Text style={[styles.brandSub, { color: palette.inkFaint }]}>
            Private journal
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => [
          styles.desktopAdd,
          { backgroundColor: palette.primary, opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <Icon name="add" color="#FFFFFF" size={21} />
        <Text style={styles.desktopAddText}>New entry</Text>
      </Pressable>

      <View style={styles.desktopTabs}>
        {tabs.map((tab) => {
          const selected = active === tab.key;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={({ pressed }) => [
                styles.desktopTab,
                {
                  backgroundColor: selected ? palette.primarySoft : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Icon
                name={selected ? tab.activeIcon : tab.icon}
                color={selected ? palette.primaryDark : palette.inkMuted}
                size={21}
              />
              <Text
                style={[
                  styles.desktopTabText,
                  { color: selected ? palette.primaryDark : palette.inkMuted },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.localNote,
          {
            backgroundColor: palette.input,
            borderColor: palette.border,
          },
        ]}
      >
        <Icon name="lock-closed" color={palette.primary} size={17} />
        <Text style={[styles.localText, { color: palette.inkMuted }]}>
          Your entries stay on this device.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mobileNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: 7,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 50,
  },
  mobileGroup: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileTab: {
    flex: 1,
    minHeight: 55,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  mobileTabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  addSlot: {
    width: 66,
    alignItems: 'center',
  },
  add: {
    width: 54,
    height: 54,
    marginTop: -23,
    borderRadius: 27,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebar: {
    width: 242,
    height: '100%',
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 30,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandSub: {
    fontSize: 11,
    marginTop: 1,
  },
  desktopAdd: {
    height: 47,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  desktopAddText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  desktopTabs: {
    gap: 7,
  },
  desktopTab: {
    minHeight: 47,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  localNote: {
    marginTop: 'auto',
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  localText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
