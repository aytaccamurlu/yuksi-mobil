import { FOREGROUND_POLL_INTERVAL_MS } from '@/constants/polling';

export const NOTIFICATION_POLL_INTERVAL_MS = FOREGROUND_POLL_INTERVAL_MS;
export const MESSAGE_POLL_INTERVAL_MS = FOREGROUND_POLL_INTERVAL_MS;
export const ORDER_STATUS_POLL_INTERVAL_MS = FOREGROUND_POLL_INTERVAL_MS;
export const POLL_INITIAL_DELAY_MS = 2_500;
export const POLL_BACKOFF_MAX_MS = 180_000;
export const BACKGROUND_MINIMUM_INTERVAL_MINUTES = 15;
export const NOTIFICATION_BACKGROUND_TASK = 'notification-background-poll';
export const ANDROID_NOTIFICATION_CHANNEL_ID = 'default';

const TYPE_TITLES: Record<string, string> = {
    info: 'Bildirim',
    message: 'Mesaj',
    job: 'Yük',
    shipment: 'Gönderi',
    ticarim: 'Ticarim',
    complaint: 'Şikayet',
};

// Backend title boşsa devreye giren tür bazlı yedek.
export function titleForNotificationType(type: string): string {
    return TYPE_TITLES[type] || 'Bildirim';
}
