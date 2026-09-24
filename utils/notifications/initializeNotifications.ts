import { initializeNotificationPermissions } from './notificationPermissions';
import { registerNotificationBackgroundTask } from './notificationBackgroundTask';
import { destroyNotificationLifecycle, initializeNotificationLifecycle } from './notificationLifecycle';
import { resetMessagePollerState } from './messagePoller';
import { clearShownNotificationIds } from './notificationPoller';
import {
    consumeLastNotificationResponse,
    initializeNotificationResponseHandling,
    resetNotificationResponseState,
} from './notificationResponse';
import { resetOrderStatusPollerState } from './orderStatusPoller';
import { isNativeNotificationPlatform } from './platform';
import './localNotificationService';

export async function initializeNotificationRuntime(): Promise<void> {
    if (!isNativeNotificationPlatform()) return;

    initializeNotificationResponseHandling();
    await registerNotificationBackgroundTask();
}

export async function startAuthenticatedNotifications(): Promise<void> {
    if (!isNativeNotificationPlatform()) return;

    await initializeNotificationPermissions();
    consumeLastNotificationResponse();
    initializeNotificationLifecycle();
}

export function stopAuthenticatedNotifications(): void {
    destroyNotificationLifecycle();
    clearShownNotificationIds();
    resetMessagePollerState();
    resetOrderStatusPollerState();
    resetNotificationResponseState();
}
