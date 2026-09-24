import * as Notifications from 'expo-notifications';
import { store } from '@/store/app';
import NotificationsService from '@/service/notifications.service';
import { getAccessToken } from '@/utils/storage';
import { handleNotificationNavigation, parseNotificationTapData } from './notificationRouter';
import { isNativeNotificationPlatform } from './platform';

let responseSubscription: { remove: () => void } | null = null;
let lastHandledIdentifier: string | null = null;

async function handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const identifier = response.notification.request.identifier;
    if (lastHandledIdentifier === identifier) return;
    lastHandledIdentifier = identifier;

    const data = parseNotificationTapData(
        response.notification.request.content.data as Record<string, unknown> | undefined,
    );
    if (!data) return;

    const token = await getAccessToken();
    if (!token) return;

    if (!data.notificationId.startsWith('local-')) {
        try {
            await store.dispatch(NotificationsService.endpoints.markNotificationRead.initiate(data.notificationId)).unwrap();
        } catch (error) {
            console.error(`[NotificationResponse] Failed to mark read ${data.notificationId}`, error);
        }
    }

    Notifications.clearLastNotificationResponse();
    handleNotificationNavigation(data);
}

export function initializeNotificationResponseHandling(): void {
    if (!isNativeNotificationPlatform() || responseSubscription) return;

    responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        void handleNotificationResponse(response);
    });
}

export function consumeLastNotificationResponse(): void {
    if (!isNativeNotificationPlatform()) return;
    try {
        const lastResponse = Notifications.getLastNotificationResponse();
        if (lastResponse) void handleNotificationResponse(lastResponse);
    } catch (error) {
        console.error('[NotificationResponse] Failed to read last response', error);
    }
}

export function resetNotificationResponseState(): void {
    lastHandledIdentifier = null;
}
