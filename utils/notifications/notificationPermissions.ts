import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ANDROID_NOTIFICATION_CHANNEL_ID } from './config';
import { isNativeNotificationPlatform } from './platform';

function isIosAuthorized(status: Notifications.IosAuthorizationStatus | undefined): boolean {
    return (
        status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
        status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        status === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
}

async function ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
        name: 'Bildirimler',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
    });
}

export async function hasNotificationPermission(): Promise<boolean> {
    if (!isNativeNotificationPlatform()) return false;
    const current = await Notifications.getPermissionsAsync();
    if (Platform.OS === 'ios') return isIosAuthorized(current.ios?.status);
    return current.status === 'granted';
}

export async function initializeNotificationPermissions(): Promise<boolean> {
    if (!isNativeNotificationPlatform()) return false;

    await ensureAndroidChannel();

    if (await hasNotificationPermission()) return true;

    const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });

    if (Platform.OS === 'ios') return isIosAuthorized(requested.ios?.status);
    return requested.status === 'granted';
}
