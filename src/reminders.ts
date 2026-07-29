import { Platform } from 'react-native';

import { AppSettings } from './types';

export const syncDailyReminder = async (
  next: AppSettings,
  previous?: AppSettings,
): Promise<{ reminderId?: string; error?: string }> => {
  if (Platform.OS === 'web') {
    return {
      error: 'Daily reminders are available in the Android and iOS app.',
    };
  }

  try {
    const Notifications = await import('expo-notifications');

    if (previous?.reminderId) {
      await Notifications.cancelScheduledNotificationAsync(previous.reminderId);
    }

    if (!next.reminderEnabled) return {};

    const permission = await Notifications.getPermissionsAsync();
    const finalPermission =
      permission.status === 'granted'
        ? permission
        : await Notifications.requestPermissionsAsync();

    if (finalPermission.status !== 'granted') {
      return {
        error:
          'Notifications are turned off. You can enable them in device settings.',
      };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('journal-reminders', {
        name: 'Journal reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const reminderId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'A quiet moment for you',
        body: 'How did today feel? Add a note to your Daybook.',
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: next.reminderHour,
        minute: next.reminderMinute,
        channelId: Platform.OS === 'android' ? 'journal-reminders' : undefined,
      },
    });

    return { reminderId };
  } catch {
    return {
      error: 'The reminder could not be scheduled on this device.',
    };
  }
};
