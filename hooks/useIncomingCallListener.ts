import { onCallEvent } from '@/service/callSignaling';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export function useIncomingCallListener(enabled: boolean) {
    const router = useRouter();

    useEffect(() => {
        if (!enabled) return;
        return onCallEvent('IncomingCall', (p) => {
            router.push({
                pathname: '/call/incoming',
                params: {
                    callId: p.call_id,
                    conversationId: p.conversation_id,
                    callerId: p.caller_id,
                    isVideo: p.is_video ? '1' : '0',
                },
            });
        });
    }, [enabled, router]);
}
