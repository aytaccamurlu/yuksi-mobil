import { useActiveCallBadge } from '@/hooks/useCallSession';
import { useGuardedPress } from '@/hooks/useGuardedPress';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { RTCView } from 'react-native-webrtc';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PIP_W = 120;
const PIP_H = 160;
const PIP_MARGIN = 14;
const PIP_TOP = 60;

const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};

export default function ActiveCallBadge() {
    const { visible, params, phase, seconds, remoteStream } = useActiveCallBadge();
    const router = useRouter();
    const [, forceTick] = useState(0);

    useEffect(() => {
        if (!visible) return;
        const iv = setInterval(() => forceTick((v) => v + 1), 1000);
        return () => clearInterval(iv);
    }, [visible]);

    const restore = () => {
        if (!params) return;
        router.push({
            pathname: '/call/[id]',
            params: {
                id: params.conversationId,
                name: params.name,
                avatar: params.avatar ?? undefined,
                type: params.isVideo ? 'video' : 'voice',
                role: params.role,
                callId: params.initialCallId,
            },
        });
    };

    const guardedRestore = useGuardedPress(restore);

    if (!visible || !params) return null;

    const label = phase === 'active' ? fmt(seconds) : phase === 'ringing' ? 'Aranıyor…' : 'Bağlanıyor…';
    const hasRemoteVideo = params.isVideo && !!(remoteStream as any)?.toURL && (remoteStream?.getVideoTracks?.().length ?? 0) > 0;

    if (hasRemoteVideo) {
        return <VideoPip streamURL={(remoteStream as any).toURL()} name={params.name} label={label} onTap={guardedRestore} />;
    }

    return (
        <SafeAreaView edges={['top']} style={s.safe} pointerEvents="box-none">
            <Pressable onPress={guardedRestore} style={s.pill}>
                <View style={s.dot} />
                <Feather name={params.isVideo ? 'video' : 'phone'} size={13} color="#FFFFFF" />
                <Text style={s.text} numberOfLines={1}>
                    {params.name} · {label}
                </Text>
            </Pressable>
        </SafeAreaView>
    );
}

function VideoPip({
    streamURL,
    name,
    label,
    onTap,
}: {
    streamURL: string;
    name: string;
    label: string;
    onTap: () => void;
}) {
    const baseLeft = SCREEN_W - PIP_W - PIP_MARGIN;
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const clampX = (x: number) => {
        'worklet';
        return Math.min(SCREEN_W - PIP_W - baseLeft, Math.max(-baseLeft, x));
    };
    const clampY = (y: number) => {
        'worklet';
        return Math.min(SCREEN_H - PIP_H - PIP_TOP - 40, Math.max(-PIP_TOP + 8, y));
    };

    const pan = Gesture.Pan()
        .onStart(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;
        })
        .onUpdate((e) => {
            translateX.value = clampX(startX.value + e.translationX);
            translateY.value = clampY(startY.value + e.translationY);
        })
        .onEnd(() => {
            const goLeft = translateX.value + baseLeft < SCREEN_W / 2;
            translateX.value = withSpring(goLeft ? -baseLeft + PIP_MARGIN : SCREEN_W - PIP_W - baseLeft - PIP_MARGIN, {
                damping: 18,
            });
            translateY.value = withSpring(translateY.value, { damping: 18 });
        });

    const tap = Gesture.Tap().onEnd(() => {
        runOnJS(onTap)();
    });

    const gesture = Gesture.Race(pan, tap);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    }));

    return (
        <View style={s.pipRoot} pointerEvents="box-none">
            <GestureDetector gesture={gesture}>
                <Animated.View style={[s.pipBox, { left: baseLeft, top: PIP_TOP }, animStyle]}>
                    <RTCView streamURL={streamURL} style={StyleSheet.absoluteFill} objectFit="cover" />
                    <View style={s.pipLabel}>
                        <Text style={s.pipName} numberOfLines={1}>
                            {name}
                        </Text>
                        <Text style={s.pipStatus}>{label}</Text>
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const s = StyleSheet.create({
    safe: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
    pill: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1BA451',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
    text: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', maxWidth: 220 },

    pipRoot: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
    pipBox: {
        position: 'absolute',
        width: PIP_W,
        height: PIP_H,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#160D06',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    pipLabel: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    pipName: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    pipStatus: { color: '#FF8A4C', fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
