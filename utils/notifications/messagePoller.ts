import { store } from '@/store/app';
import MessagesService from '@/service/messages.service';
import { getAccessToken } from '@/utils/storage';
import { getActiveConversationId } from './activeConversation';
import { showLocalNotification } from './localNotificationService';
import { hasNotificationPermission } from './notificationPermissions';
import { isNativeNotificationPlatform } from './platform';

let polling = false;
let seeded = false;
const lastUnread = new Map<string, number>();

export async function pollMessages(): Promise<boolean> {
    if (!isNativeNotificationPlatform() || polling) return true;

    polling = true;

    try {
        const token = await getAccessToken();
        if (!token) return true;
        if (!(await hasNotificationPermission())) return true;

        const sub = store.dispatch(MessagesService.endpoints.getConversations.initiate(undefined, { forceRefetch: true }));
        let result: any;
        try {
            result = await sub.unwrap();
        } finally {
            sub.unsubscribe();
        }
        const list: any[] = result?.data || result || [];

        if (!seeded) {
            list.forEach((c) => lastUnread.set(c.id, c.unread || 0));
            seeded = true;
            return true;
        }

        const activeConversationId = getActiveConversationId();

        for (const c of list) {
            const previous = lastUnread.get(c.id) ?? 0;
            const current = c.unread || 0;

            if (current > previous && c.id !== activeConversationId && !c.muted && !c.blocked) {
                await showLocalNotification(c.name || 'Yeni mesaj', c.lastMessage || 'Yeni bir mesajınız var.', {
                    notificationId: `local-msg-${c.id}-${Date.now()}`,
                    type: 'message',
                    relatedId: c.id,
                    interactable: true,
                });
            }

            lastUnread.set(c.id, current);
        }
        return true;
    } catch (error: any) {
        if (error?.status !== 'FETCH_ERROR' || !String(error?.error).includes('Abort')) {
            console.error('[MessagePoller] Poll failed', error);
        }
        return false;
    } finally {
        polling = false;
    }
}

export function resetMessagePollerState(): void {
    lastUnread.clear();
    seeded = false;
}
