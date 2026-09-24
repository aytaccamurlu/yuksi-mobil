import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { UserSessionType } from "../types/UserSessionType";

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64Decode(input: string): string {
  const s = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const a = B64.indexOf(s[i]);
    const b = B64.indexOf(s[i + 1]);
    const c = B64.indexOf(s[i + 2]);
    const d = B64.indexOf(s[i + 3]);
    bytes.push((a << 2) | (b >> 4));
    if (c !== -1) bytes.push(((b & 15) << 4) | (c >> 2));
    if (d !== -1) bytes.push(((c & 3) << 6) | d);
  }
  return bytes.map((b) => String.fromCharCode(b)).join('');
}

export const decodeJWT = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = b64Decode(parts[1]);
    const jsonPayload = decodeURIComponent(
      decoded.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const SESSION_KEY = "userSession";
const SESSION_TOKENS_KEY = "session_tokens";

type SessionTokens = Pick<UserSessionType, "accessToken" | "refreshToken">;

const writeSessionTokens = async (tokens: SessionTokens): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(SESSION_TOKENS_KEY, JSON.stringify(tokens));
    return true;
  } catch {
    return false;
  }
};

const readSessionTokens = async (): Promise<SessionTokens | null> => {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_TOKENS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUserSessionToStorage = async (session: UserSessionType) => {
  const { accessToken, refreshToken, ...profile } = session;
  const secured = await writeSessionTokens({ accessToken, refreshToken });
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(secured ? profile : session));
};

export const getUserSessionFromStorage = async (): Promise<UserSessionType | null> => {
  const value = await AsyncStorage.getItem(SESSION_KEY);
  if (!value) return null;

  let stored: any;
  try {
    stored = JSON.parse(value);
  } catch {
    return null;
  }

  if (stored?.accessToken) {
    const secured = await writeSessionTokens({ accessToken: stored.accessToken, refreshToken: stored.refreshToken });
    if (secured) {
      const { accessToken: _a, refreshToken: _r, ...profile } = stored;
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    }
    return stored;
  }

  const tokens = await readSessionTokens();
  if (!tokens?.accessToken) return null;
  return { ...stored, ...tokens };
};

export const clearUserSessionFromStorage = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
  try {
    await SecureStore.deleteItemAsync(SESSION_TOKENS_KEY);
  } catch {
    // yoksay
  }
};


export const getAccessToken = async () => {
  const session = await getUserSessionFromStorage();
  return session?.accessToken ?? null;
};

export const setAccessTokenToStorage = async (token: string) => {
  const session = await getUserSessionFromStorage();
  if (!session) return;

  const updated = { ...session, accessToken: token };
  await setUserSessionToStorage(updated);
};

export const clearTokens = async () => {
  await clearUserSessionFromStorage();
};

const AUTO_RELOGIN_KEY = "auto_relogin_credentials";

export const clearAutoReloginCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync(AUTO_RELOGIN_KEY);
  } catch {
    // yoksay
  }
};

const ONBOARDING_KEY = "onboarding_done";

export const markOnboardingDone = async () => {
  await AsyncStorage.setItem(ONBOARDING_KEY, "1");
};

export const checkOnboardingDone = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === "1";
};

export const resetOnboardingDone = async () => {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
};

const HOME_TOUR_KEY = "home_tour_done";

export const checkHomeTourDone = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(HOME_TOUR_KEY);
  return value === "1";
};

export const markHomeTourDone = async () => {
  await AsyncStorage.setItem(HOME_TOUR_KEY, "1");
};

// Kayıtlı rota kartlarının sürükleme sırası — cihaza özel, backend'den bağımsız.
const SAVED_ROUTE_ORDER_KEY = "saved_route_order";

export const getSavedRouteOrder = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_ROUTE_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setSavedRouteOrder = async (ids: string[]) => {
  try {
    await AsyncStorage.setItem(SAVED_ROUTE_ORDER_KEY, JSON.stringify(ids));
  } catch {
    // yoksay
  }
};

const HAS_DRAGGED_ROUTE_KEY = "has_dragged_saved_route";

export const getHasDraggedSavedRoute = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(HAS_DRAGGED_ROUTE_KEY);
  return value === "1";
};

export const setHasDraggedSavedRoute = async () => {
  await AsyncStorage.setItem(HAS_DRAGGED_ROUTE_KEY, "1");
};

// onboarding_done/home_tour_done cihaza ait, istisna tutulur.
export const clearAllLocalData = async () => {
  const onboardingDone = await checkOnboardingDone();
  const homeTourDone = await checkHomeTourDone();
  await AsyncStorage.clear();
  if (onboardingDone) await markOnboardingDone();
  if (homeTourDone) await markHomeTourDone();
};