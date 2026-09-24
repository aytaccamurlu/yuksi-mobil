import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';

const KEY_STORE_KEY = 'query_cache_enc_key';

let cachedKey: string | null = null;

const getKey = async (): Promise<string> => {
    if (cachedKey) return cachedKey;
    let key = await SecureStore.getItemAsync(KEY_STORE_KEY);
    if (!key) {
        key = CryptoJS.lib.WordArray.random(32).toString();
        await SecureStore.setItemAsync(KEY_STORE_KEY, key);
    }
    cachedKey = key;
    return key;
};

export const encryptForStorage = async (plain: string): Promise<string> => {
    const key = await getKey();
    return CryptoJS.AES.encrypt(plain, key).toString();
};

export const decryptFromStorage = async (cipher: string): Promise<string | null> => {
    try {
        const key = await getKey();
        const text = CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8);
        return text || null;
    } catch {
        return null;
    }
};
