import AsyncStorage from '@react-native-async-storage/async-storage';
import { decryptFromStorage, encryptForStorage } from './cacheEncryption';

// store/servis bağımlılığı yok, döngüsel import olmadan her yerden import edilebilsin diye.
export const KEY_PREFIX = 'query_cache_v1:';

export type Snapshot = { reducerPath: string; endpointName: string; originalArgs: unknown; data: unknown }[];

export const entryKey = (e: { reducerPath: string; endpointName: string; originalArgs: unknown }) =>
    `${e.reducerPath}|${e.endpointName}|${JSON.stringify(e.originalArgs)}`;

export const readCacheBlob = async (userId: string): Promise<Snapshot | null> => {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + userId);
    if (!raw) return null;
    const plain = await decryptFromStorage(raw);
    if (!plain) return null;
    try {
        const snapshot = JSON.parse(plain);
        return Array.isArray(snapshot) ? snapshot : null;
    } catch {
        return null;
    }
};

export const writeCacheBlob = async (userId: string, snapshot: Snapshot): Promise<void> => {
    const cipher = await encryptForStorage(JSON.stringify(snapshot));
    await AsyncStorage.setItem(KEY_PREFIX + userId, cipher);
};

// Ağ hatasında servisin doğrudan okuyup kendi sonucu olarak dönebileceği offline yedek.
export const getPersistedQueryData = async (
    userId: string | undefined | null,
    reducerPath: string,
    endpointName: string,
    originalArgs: unknown,
): Promise<unknown> => {
    if (!userId) return undefined;
    try {
        const snapshot = await readCacheBlob(userId);
        if (!snapshot) return undefined;
        const wanted = entryKey({ reducerPath, endpointName, originalArgs });
        return snapshot.find((e) => entryKey(e) === wanted)?.data;
    } catch {
        return undefined;
    }
};
