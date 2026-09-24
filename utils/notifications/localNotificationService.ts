import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ANDROID_NOTIFICATION_CHANNEL_ID } from './config';
import { isNativeNotificationPlatform } from './platform';

if (isNativeNotificationPlatform()) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

export async function showLocalNotification(
    title: string,
    body: string,
    data: Record<string, unknown> = {},
): Promise<string> {
    return Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: 'default' },
        trigger: Platform.OS === 'android' ? { channelId: ANDROID_NOTIFICATION_CHANNEL_ID } as any : null,
    });
}
