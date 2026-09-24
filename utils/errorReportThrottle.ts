const WINDOW_MS = 60000;
const MAX_PER_WINDOW = 5;

const recentTimestamps: number[] = [];
const recentSignatures = new Map<string, number>();

export type IssueKind = 'crash' | 'js_error' | 'api_error';

export const shouldReport = (signature: string): boolean => {
    const now = Date.now();
    const lastSeen = recentSignatures.get(signature);
    if (lastSeen && now - lastSeen < WINDOW_MS) return false;

    while (recentTimestamps.length && now - recentTimestamps[0] > WINDOW_MS) {
        recentTimestamps.shift();
    }
    if (recentTimestamps.length >= MAX_PER_WINDOW) return false;

    recentTimestamps.push(now);
    recentSignatures.set(signature, now);
    return true;
};
