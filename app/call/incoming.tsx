import Avatar from '@/components/Avatar';
import { useGuardedPress } from '@/hooks/useGuardedPress';
import { onCallEvent, rejectCall } from '@/service/callSignaling';
import { useGetConversationsQuery } from '@/service/messages.service';
import { haptic } from '@/utils/haptics';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IncomingCallScreen() {
    const router = useRouter();
    const { callId, conversationId, isVideo } = useLocalSearchParams<{
        callId: string;
        conversationId: string;
        callerId?: string;
        isVideo?: string;
    }>();
    const video = isVideo === '1';

    const { data } = useGetConversationsQuery();
    const conv = (data?.data || data || []).find((c: any) => c.id === conversationId);
    const name = conv?.name || 'Bilinmeyen';
    const avatar: string | null = conv?.avatar ?? null;

    const settledRef = useRef(false);

    useEffect(() => {
        const offEnded = onCallEvent('CallEnded', (p) => {
            if (p.call_id !== callId || settledRef.current) return;
            settledRef.current = true;
            router.back();
        });
        return offEnded;
    }, [callId, router]);

    const decline = () => {
        if (settledRef.current) return;
        settledRef.current = true;
        haptic('medium');
        rejectCall(callId).catch(() => {});
        router.back();
    };

    const accept = () => {
        if (settledRef.current) return;
        settledRef.current = true;
        haptic('success');
        router.replace({
            pathname: '/call/[id]',
            params: { id: conversationId, role: 'callee', callId, type: video ? 'video' : 'voice' },
        });
    };

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            decline();
            return true;
        });
        return () => sub.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const guardedDecline = useGuardedPress(decline);
    const guardedAccept = useGuardedPress(accept);

    return (
        <View style={s.root}>
            <LinearGradient colors={['rgba(20,18,16,0.72)', 'rgba(26,17,10,0.92)', '#160D06']} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe}>
                <View style={s.top}>
                    <View style={s.brandRow}>
                        <Feather name="shield" size={12} color="#FF8A4C" />
                        <Text style={s.brandText}>{video ? 'Yüksi üzerinden görüntülü arama' : 'Yüksi üzerinden sesli arama'}</Text>
                    </View>
                </View>

                <View style={s.center}>
                    <Avatar name={name} uri={avatar} size={132} />
                    <Text style={s.name} numberOfLines={1}>{name}</Text>
                    <Text style={s.status}>Sizi arıyor…</Text>
                </View>

                <View style={s.controls}>
                    <View style={s.btnCol}>
                        <Pressable
                            onPress={guardedDecline}
                            style={({ pressed }) => [
                                s.circleBtn,
                                s.declineBtn,
                                pressed && { transform: [{ scale: 0.88 }] },
                            ]}
                        >
                            <Feather name="phone" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                        </Pressable>
                        <Text style={s.btnLabel}>Reddet</Text>
                    </View>
                    <View style={s.btnCol}>
                        <Pressable
                            onPress={guardedAccept}
                            style={({ pressed }) => [
                                s.circleBtn,
                                s.acceptBtn,
                                pressed && { transform: [{ scale: 0.88 }] },
                            ]}
                        >
                            <Feather name="phone" size={28} color="#FFFFFF" />
                        </Pressable>
                        <Text style={s.btnLabel}>Kabul et</Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#160D06' },
    safe: { flex: 1, justifyContent: 'space-between' },
    top: { alignItems: 'center', paddingTop: 12 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    brandText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    name: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', maxWidth: '80%' },
    status: { color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: '600' },
    controls: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40, paddingBottom: 40 },
    btnCol: { alignItems: 'center', gap: 8 },
    circleBtn: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
    },
    declineBtn: { backgroundColor: '#EF3B3B' },
    acceptBtn: { backgroundColor: '#33C759' },
    btnLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
});
