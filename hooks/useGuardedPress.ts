import { useCallback, useRef } from 'react';

const DEFAULT_GUARD_MS = 400;

export function useGuardedPress<Args extends unknown[]>(
    handler?: ((...args: Args) => unknown) | null,
    guardMs: number = DEFAULT_GUARD_MS,
) {
    const lastPressRef = useRef(0);
    const inFlightRef = useRef(false);

    return useCallback(
        (...args: Args) => {
            if (!handler || inFlightRef.current) return;

            const now = Date.now();
            if (now - lastPressRef.current < guardMs) return;
            lastPressRef.current = now;

            const result = handler(...args);
            if (result && typeof (result as any).then === 'function') {
                inFlightRef.current = true;
                (result as Promise<unknown>).finally(() => {
                    inFlightRef.current = false;
                    lastPressRef.current = Date.now();
                });
            }
        },
        [handler, guardMs],
    );
}
