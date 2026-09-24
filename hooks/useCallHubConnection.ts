import { connectCallHub, disconnectCallHub } from '@/service/callSignaling';
import { useEffect } from 'react';

export function useCallHubConnection(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        connectCallHub().catch(() => {});
        return () => {
            disconnectCallHub();
        };
    }, [enabled]);
}
