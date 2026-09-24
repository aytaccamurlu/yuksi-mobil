import { store } from '@/store/app';
import NotificationsService from '@/service/notifications.service';
import { getAccessToken } from '@/utils/storage';
import { titleForNotificationType } from './config';
import { showLocalNotification } from './localNotificationService';
import { hasNotificationPermission } from './notificationPermissions';
import { isNativeNotificationPlatform } from './platform';

let polling = false;
const shownIds = new Set<string>();

export function clearShownNotificationIds(): void {
    shownIds.clear();
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const bool = (v: unknown): boolean => v === true;

export async function pollNotifications(): Promise<boolean> {
    if (!isNativeNotificationPlatform() || polling) return true;

    polling = true;

    try {
        const token = await getAccessToken();
        if (!token) return true;
        if (!(await hasNotificationPermission())) return true;

        const sub = store.dispatch(NotificationsService.endpoints.getNotifications.initiate(undefined, { forceRefetch: true }));
        let raw: any[];
        try {
            raw = await sub.unwrap();
        } finally {
            sub.unsubscribe();
        }

        const undelivered = (Array.isArray(raw) ? raw : []).filter(
            (n) => !bool(n?.is_delivered ?? n?.isDelivered),
        );

        for (const n of undelivered) {
            const id = str(n?.id);
            if (!id) continue;

            try {
                if (!shownIds.has(id)) {
                    const type = str(n?.type) || 'info';
                    const title = str(n?.title) || titleForNotificationType(type);
                    const message = str(n?.message) || str(n?.body);

                    const localId = await showLocalNotification(title, message, {
                        notificationId: id,
                        type,
                        relatedId: str(n?.related_id ?? n?.relatedId),
                        interactable: bool(n?.is_interactable ?? n?.isInteractable),
                    });
                    if (!localId) continue;
                    shownIds.add(id);
                }

                const deliver = store.dispatch(NotificationsService.endpoints.markNotificationDelivered.initiate(id));
                try {
                    await deliver.unwrap();
                } finally {
                    deliver.reset();
                }
            } catch (error) {
                console.error(`[NotificationPoller] Failed notification ${id}`, error);
            }
        }
        return true;
    } catch (error) {
        console.error('[NotificationPoller] Poll failed', error);
        return false;
    } finally {
        polling = false;
    }
}
