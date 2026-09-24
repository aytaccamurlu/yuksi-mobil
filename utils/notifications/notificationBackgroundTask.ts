import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { store } from '@/store/app';
import { ensureFreshTokenForBackground } from '@/service/api';
import { BACKGROUND_MINIMUM_INTERVAL_MINUTES, NOTIFICATION_BACKGROUND_TASK } from './config';
import { pollMessages } from './messagePoller';
import { pollNotifications } from './notificationPoller';
import { pollOrderStatus } from './orderStatusPoller';
import { isNativeNotificationPlatform } from './platform';

if (isNativeNotificationPlatform() && !TaskManager.isTaskDefined(NOTIFICATION_BACKGROUND_TASK)) {
    TaskManager.defineTask(NOTIFICATION_BACKGROUND_TASK, async () => {
        try {
            await ensureFreshTokenForBackground(store).catch(() => null);
            await Promise.all([pollNotifications(), pollMessages(), pollOrderStatus()]);
            return BackgroundTask.BackgroundTaskResult.Success;
        } catch (error) {
            console.error('[NotificationBackgroundTask]', error);
            return BackgroundTask.BackgroundTaskResult.Failed;
        }
    });
}

export async function registerNotificationBackgroundTask(): Promise<void> {
    if (!isNativeNotificationPlatform()) return;

    try {
        const available = await TaskManager.isAvailableAsync();
        if (!available) return;

        const status = await BackgroundTask.getStatusAsync();
        if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;

        const registered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_BACKGROUND_TASK);
        if (registered) return;

        await BackgroundTask.registerTaskAsync(NOTIFICATION_BACKGROUND_TASK, {
            minimumInterval: BACKGROUND_MINIMUM_INTERVAL_MINUTES,
        });
    } catch (error) {
        console.error('[NotificationBackgroundTask] Registration failed', error);
    }
}
