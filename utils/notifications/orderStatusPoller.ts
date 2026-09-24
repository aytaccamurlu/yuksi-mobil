import { store } from '@/store/app';
import OrdersService, { type Order } from '@/service/orders.service';
import { getAccessToken } from '@/utils/storage';
import { showLocalNotification } from './localNotificationService';
import { hasNotificationPermission } from './notificationPermissions';
import { isNativeNotificationPlatform } from './platform';

let polling = false;
let seeded = false;
const lastStatus = new Map<string, string>();

const STATUS_MESSAGE: Record<string, string> = {
    'Atandı': 'Siparişinize bir kurye atandı.',
    'Yolda': 'Siparişiniz yolda.',
    'Tamamlandı': 'Siparişiniz teslim edildi.',
    'İptal': 'Siparişiniz iptal edildi.',
    'Başarısız': 'Siparişiniz başarısız oldu.',
};

export async function pollOrderStatus(): Promise<boolean> {
    if (!isNativeNotificationPlatform() || polling) return true;

    polling = true;

    try {
        const token = await getAccessToken();
        if (!token) return true;
        if (!(await hasNotificationPermission())) return true;

        const userId = store.getState().userSlice.userSession?.userId;
        if (!userId) return true;

        const activeSub = store.dispatch(OrdersService.endpoints.getActiveOrders.initiate({ userId }, { forceRefetch: true }));
        const completedSub = store.dispatch(OrdersService.endpoints.getCompletedOrders.initiate({ userId }, { forceRefetch: true }));
        let list: Order[];
        try {
            const [active, completed] = await Promise.all([activeSub.unwrap(), completedSub.unwrap()]);
            list = [...(active || []), ...(completed?.pages?.[0]?.data || [])];
        } finally {
            activeSub.unsubscribe();
            completedSub.unsubscribe();
        }

        if (!seeded) {
            list.forEach((o) => lastStatus.set(o.id, o.status));
            seeded = true;
            return true;
        }

        const seenThisPoll = new Set<string>();

        for (const o of list) {
            if (seenThisPoll.has(o.id)) continue;
            seenThisPoll.add(o.id);

            const previous = lastStatus.get(o.id);

            if (previous !== undefined && previous !== o.status) {
                await showLocalNotification(
                    `Sipariş ${o.orderNumber || o.id}`,
                    STATUS_MESSAGE[o.status] || `Sipariş durumu "${o.status}" olarak güncellendi.`,
                    {
                        notificationId: `local-order-${o.id}-${Date.now()}`,
                        type: 'shipment',
                        relatedId: o.id,
                        interactable: true,
                    },
                );
            }

            lastStatus.set(o.id, o.status);
        }
        return true;
    } catch (error: any) {
        console.error('[OrderStatusPoller] Poll failed', error);
        return false;
    } finally {
        polling = false;
    }
}

export function resetOrderStatusPollerState(): void {
    lastStatus.clear();
    seeded = false;
}
