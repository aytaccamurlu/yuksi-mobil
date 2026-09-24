import AsyncStorage from '@react-native-async-storage/async-storage';
import BannersService from '@/service/banners.service';
import CreateLoadService from '@/service/createLoad.service';
import MessagesService from '@/service/messages.service';
import { isMockAccessToken } from '@/service/mockData';
import NotificationsService from '@/service/notifications.service';
import OrdersService from '@/service/orders.service';
import ProfileService from '@/service/profile.service';
import TicarimService from '@/service/ticarim.service';
import { store } from '@/store/app';
import { KEY_PREFIX, Snapshot, entryKey, readCacheBlob, writeCacheBlob } from './queryCacheStorage';

export { getPersistedQueryData } from './queryCacheStorage';

const sessionOf = () => (store.getState() as any)?.userSlice?.userSession;

const WRITE_THROTTLE_MS = 2000;
const MAX_ENTRY_BYTES = 400_000;
const MAX_TOTAL_BYTES = 1_500_000;

const PERSISTED: { api: any; endpoints: string[] }[] = [
    { api: MessagesService, endpoints: ['getConversations', 'getMessages'] },
    { api: NotificationsService, endpoints: ['getNotifications'] },
    { api: BannersService, endpoints: ['getBanners'] },
    { api: ProfileService, endpoints: ['getProfile'] },
    { api: OrdersService, endpoints: ['getActiveOrders'] },
    { api: CreateLoadService, endpoints: ['getVehicles', 'getJobs', 'getAddresses'] },
    { api: TicarimService, endpoints: ['getCategories', 'getListings', 'getMyListings', 'getFavoriteListingIds'] },
];

let lastSignature = '';
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let hydratedFor: string | null = null;

const fulfilledEntries = (): { reducerPath: string; entry: any }[] => {
    const state = store.getState() as any;
    const out: { reducerPath: string; entry: any }[] = [];
    for (const { api, endpoints } of PERSISTED) {
        const queries = state[api.reducerPath]?.queries ?? {};
        for (const entry of Object.values<any>(queries)) {
            if (entry?.status === 'fulfilled' && endpoints.includes(entry.endpointName)) {
                out.push({ reducerPath: api.reducerPath, entry });
            }
        }
    }
    return out;
};

const signatureOf = (entries: { reducerPath: string; entry: any }[]) =>
    entries.map(({ reducerPath, entry }) => `${reducerPath}|${entry.endpointName}|${entry.fulfilledTimeStamp ?? 0}`).join(';');

const collect = (entries: { reducerPath: string; entry: any }[]): Snapshot => {
    const out: Snapshot = [];
    for (const { reducerPath, entry } of entries) {
        const size = JSON.stringify(entry.data ?? null).length;
        if (size > MAX_ENTRY_BYTES) continue;
        out.push({ reducerPath, endpointName: entry.endpointName, originalArgs: entry.originalArgs, data: entry.data });
    }
    return out;
};

// fulfilled olmayan kayıtlar diskten silinmez, sadece güncel olanlar üstüne yazılır.
const persist = async () => {
    const session = sessionOf();
    if (!session?.userId || isMockAccessToken(session.accessToken)) return;
    const entries = fulfilledEntries();
    const signature = signatureOf(entries);
    if (signature === lastSignature) return;
    lastSignature = signature;

    const fresh = collect(entries);

    try {
        const existing = await readCacheBlob(session.userId);
        const merged = new Map((existing ?? []).map((e) => [entryKey(e), e]));
        for (const e of fresh) merged.set(entryKey(e), e);

        let combined = Array.from(merged.values());
        let total = combined.reduce((sum, e) => sum + JSON.stringify(e.data ?? null).length, 0);
        while (total > MAX_TOTAL_BYTES && combined.length > 0) {
            const dropped = combined.shift()!;
            total -= JSON.stringify(dropped.data ?? null).length;
        }

        await writeCacheBlob(session.userId, combined);
    } catch {
        await writeCacheBlob(session.userId, fresh).catch(() => {});
    }
};

const scheduleWrite = () => {
    if (writeTimer) return;
    writeTimer = setTimeout(() => {
        writeTimer = null;
        persist();
    }, WRITE_THROTTLE_MS);
};

export const hydrateQueryCache = async (): Promise<void> => {
    const session = sessionOf();
    if (!session?.userId || isMockAccessToken(session.accessToken) || hydratedFor === session.userId) return;
    hydratedFor = session.userId;

    const snapshot = await readCacheBlob(session.userId).catch(() => null);
    if (!snapshot) return;

    // forceRefetch yok — tazeleme ekranın kendi polling/refetch davranışına bırakılıyor.
    for (const item of snapshot) {
        const target = PERSISTED.find((p) => p.api.reducerPath === item.reducerPath);
        if (!target) continue;
        store.dispatch(target.api.util.upsertQueryData(item.endpointName, item.originalArgs, item.data));
    }
};

export const clearQueryCache = async (userId?: string | null): Promise<void> => {
    hydratedFor = null;
    lastSignature = '';
    if (!userId) return;
    await AsyncStorage.removeItem(KEY_PREFIX + userId).catch(() => {});
};

export const startQueryCachePersistence = (): (() => void) => store.subscribe(scheduleWrite);
