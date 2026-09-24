import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'network_usage_bytes_v1';
const FLUSH_DELAY_MS = 3000;

export type NetworkCategory = 'messages' | 'calls' | 'media';

type Counters = {
    messagesSent: number;
    messagesReceived: number;
    callsSent: number;
    callsReceived: number;
    mediaSent: number;
    mediaReceived: number;
};

const EMPTY: Counters = {
    messagesSent: 0,
    messagesReceived: 0,
    callsSent: 0,
    callsReceived: 0,
    mediaSent: 0,
    mediaReceived: 0,
};

let counters: Counters | null = null;
let loading: Promise<Counters> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const load = (): Promise<Counters> => {
    if (counters) return Promise.resolve(counters);
    if (!loading) {
        loading = AsyncStorage.getItem(KEY)
            .then((raw): Counters => (raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY }))
            .catch((): Counters => ({ ...EMPTY }))
            .then((loaded) => {
                counters = loaded;
                return loaded;
            });
    }
    return loading;
};

const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        if (counters) AsyncStorage.setItem(KEY, JSON.stringify(counters)).catch(() => {});
    }, FLUSH_DELAY_MS);
};

export const categorizeUrl = (url: string): NetworkCategory | null => {
    if (/\/messages\/conversations\/[^/?]+\/(voice|media)/.test(url)) return 'media';
    if (/\/messages\//.test(url)) return 'messages';
    if (/\/media\/upload|\/User\/avatar|\/cargo-scan|\/cargo\/chat|\/ticarim\/listings\/[^/?]+\/images/.test(url)) return 'media';
    if (/\/call|\/tracking|\/map\/route/.test(url)) return 'calls';
    return null;
};

export const recordNetworkUsage = async (
    category: NetworkCategory,
    sentBytes: number,
    receivedBytes: number,
): Promise<void> => {
    const c = await load();
    c[`${category}Sent`] += sentBytes;
    c[`${category}Received`] += receivedBytes;
    scheduleFlush();
};

export const getNetworkUsageMb = async () => {
    const c = await load();
    const toMb = (bytes: number) => bytes / (1024 * 1024);
    return {
        messagesSentMb: toMb(c.messagesSent),
        messagesReceivedMb: toMb(c.messagesReceived),
        callsSentMb: toMb(c.callsSent),
        callsReceivedMb: toMb(c.callsReceived),
        mediaSentMb: toMb(c.mediaSent),
        mediaReceivedMb: toMb(c.mediaReceived),
    };
};
