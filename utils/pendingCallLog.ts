import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingCallLog = {
  convId: string;
  direction: 'out' | 'in';
  status: 'completed' | 'missed' | 'cancelled' | 'declined';
  durationSec: number;
  createdAt: string;
  isVideo: boolean;
};

const STORAGE_KEY = 'pending_call_logs_v1';

let queue: PendingCallLog[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

const persist = () => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue)).catch(() => {});
};

export const hydratePendingCallLogs = async (): Promise<void> => {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored: PendingCallLog[] = JSON.parse(raw);
    if (Array.isArray(stored) && stored.length) {
      queue = [...stored, ...queue];
      listeners.forEach((l) => l());
    }
  } catch {
    // yoksay
  }
};

export const setPendingCallLog = (log: PendingCallLog) => {
  queue.push(log);
  persist();
  listeners.forEach((l) => l());
};

export const takePendingCallLogs = (convId: string): PendingCallLog[] => {
  const matching = queue.filter((l) => l.convId === convId);
  if (matching.length) {
    queue = queue.filter((l) => l.convId !== convId);
    persist();
  }
  return matching;
};

export const subscribePendingCallLog = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
