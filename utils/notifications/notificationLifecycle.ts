import { AppState } from 'react-native';
import {
    MESSAGE_POLL_INTERVAL_MS,
    NOTIFICATION_POLL_INTERVAL_MS,
    ORDER_STATUS_POLL_INTERVAL_MS,
    POLL_BACKOFF_MAX_MS,
    POLL_INITIAL_DELAY_MS,
} from './config';
import { pollMessages } from './messagePoller';
import { pollNotifications } from './notificationPoller';
import { pollOrderStatus } from './orderStatusPoller';
import { isNativeNotificationPlatform } from './platform';

type PollLoop = { timer: ReturnType<typeof setTimeout> | null; delay: number };

const loops: Record<string, PollLoop> = {};
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

const startLoop = (name: string, poll: () => Promise<boolean>, baseInterval: number) => {
    if (loops[name]?.timer) return;
    const loop: PollLoop = { timer: null, delay: baseInterval };
    loops[name] = loop;

    const schedule = (ms: number) => {
        loop.timer = setTimeout(async () => {
            if (loops[name] !== loop) return;
            const ok = await poll();
            if (loops[name] !== loop) return;
            loop.delay = ok ? baseInterval : Math.min(loop.delay * 2, POLL_BACKOFF_MAX_MS);
            schedule(loop.delay);
        }, ms);
    };

    schedule(POLL_INITIAL_DELAY_MS);
};

export function startNotificationPolling(): void {
    if (!isNativeNotificationPlatform()) return;
    startLoop('notifications', pollNotifications, NOTIFICATION_POLL_INTERVAL_MS);
    startLoop('messages', pollMessages, MESSAGE_POLL_INTERVAL_MS);
    startLoop('orders', pollOrderStatus, ORDER_STATUS_POLL_INTERVAL_MS);
}

export function stopNotificationPolling(): void {
    for (const name of Object.keys(loops)) {
        const loop = loops[name];
        if (loop.timer) clearTimeout(loop.timer);
        delete loops[name];
    }
}

export function initializeNotificationLifecycle(): void {
    if (!isNativeNotificationPlatform() || appStateSubscription) return;

    if (AppState.currentState === 'active') startNotificationPolling();

    appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
            startNotificationPolling();
            return;
        }
        stopNotificationPolling();
    });
}

export function destroyNotificationLifecycle(): void {
    stopNotificationPolling();
    appStateSubscription?.remove();
    appStateSubscription = null;
}
