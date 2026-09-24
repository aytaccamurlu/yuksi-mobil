import { router } from 'expo-router';
import type { NotificationTapData } from './types';

function asBoolean(value: unknown): boolean {
    return value === true || value === 'true';
}

export function parseNotificationTapData(data: Record<string, unknown> | undefined): NotificationTapData | null {
    if (!data) return null;
    const notificationId = data.notificationId;
    if (typeof notificationId !== 'string' || notificationId.length === 0) return null;
    return {
        notificationId,
        type: typeof data.type === 'string' ? data.type : 'info',
        relatedId: typeof data.relatedId === 'string' ? data.relatedId : '',
        interactable: asBoolean(data.interactable),
    };
}

export function handleNotificationNavigation(data: NotificationTapData): void {
    if (!data.interactable || !data.relatedId) {
        router.push('/notifications');
        return;
    }

    switch (data.type) {
        case 'message':
            router.push({ pathname: '/messages/[id]', params: { id: data.relatedId } });
            return;
        case 'job':
        case 'shipment':
            router.push({ pathname: '/shipment/[id]', params: { id: data.relatedId } });
            return;
        case 'ticarim':
            router.push({ pathname: '/ticarim/[id]', params: { id: data.relatedId } });
            return;
        case 'complaint':
            router.push({ pathname: '/complaint/[id]', params: { id: data.relatedId } });
            return;
        default:
            router.push('/notifications');
    }
}
