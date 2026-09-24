import React, { useEffect, useRef, useState } from 'react';
import { Animated, ImageSourcePropType, Modal, StyleSheet, Text, View } from 'react-native';
import RNReanimated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const VEHICLE_ICONS: ImageSourcePropType[] = [
    require('@/assets/images/motorcycle.png'),
    require('@/assets/images/minivan.png'),
    require('@/assets/images/panelvan.png'),
    require('@/assets/images/pickup.png'),
    require('@/assets/images/truck.png'),
];

function Ring({ delay }: { delay: number }) {
    const p = useSharedValue(0);
    useEffect(() => {
        p.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false);
        return () => cancelAnimation(p);
    }, []);
    const style = useAnimatedStyle(() => {
        const t = (p.value + delay) % 1;
        return { opacity: 0.4 * (1 - t), transform: [{ scale: 1 + t * 0.8 }] };
    });
    return <RNReanimated.View style={[s.ring, style]} pointerEvents="none" />;
}

function RollingVehicleIcon() {
    const [index, setIndex] = useState(0);
    const fade = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const iv = setInterval(() => {
            Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                setIndex((i) => (i + 1) % VEHICLE_ICONS.length);
                Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
            });
        }, 900);
        return () => clearInterval(iv);
    }, []);

    return <Animated.Image source={VEHICLE_ICONS[index]} style={[s.rollIcon, { opacity: fade }]} resizeMode="contain" />;
}

export default function CargoScanLoading({ visible }: { visible: boolean }) {
    if (!visible) return null;

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent>
            <View style={s.bg}>
                <SafeAreaView style={s.center}>
                    <View style={s.ringWrap}>
                        <Ring delay={0} />
                        <Ring delay={0.5} />
                        <View style={s.iconCircle}>
                            <RollingVehicleIcon />
                        </View>
                    </View>
                    <View style={s.pill}>
                        <Text style={s.pillText}>Yükünüz analiz ediliyor...</Text>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#160D06' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 24 },
    ringWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#FF5B04' },
    iconCircle: {
        width: 104, height: 104, borderRadius: 52,
        borderWidth: 3, borderColor: '#FF5B04',
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    rollIcon: { width: 64, height: 64 },
    pill: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
    pillText: { color: '#111827', fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
