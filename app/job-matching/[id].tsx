import { useGetOrderByIdQuery } from '@/service/orders.service';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import RNReanimated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Phase = 'searching' | 'success' | 'not_found';

const MAX_SEARCH_MS = 5 * 60 * 1000;

const SEARCHING_STATUSES = ['Searching5km', 'Searching10km', 'SearchingCityWide'];
const FOUND_STATUSES = ['DriverAssigned', 'Confirmed'];
const NOT_FOUND_STATUSES = ['NoDriverFound', 'Cancelled'];

const RADIUS_LABEL: Record<string, string> = {
    Searching5km: '5 km alanda aranıyor',
    Searching10km: '10 km alanda aranıyor',
    SearchingCityWide: 'Şehir çapında aranıyor',
};

const PHASE_PILL: Record<Phase, string> = {
    searching: 'Taşıyıcı aranıyor',
    success: 'Taşıyıcı bulundu',
    not_found: 'Şu an uygun taşıyıcı bulunamadı',
};

const VEHICLE_ICONS: ImageSourcePropType[] = [
    require('@/assets/images/motorcycle.png'),
    require('@/assets/images/minivan.png'),
    require('@/assets/images/panelvan.png'),
    require('@/assets/images/pickup.png'),
    require('@/assets/images/truck.png'),
];

const SCATTER = [
    { top: '14%', left: '10%', size: 40, rot: '-12deg' },
    { top: '22%', right: '14%', size: 34, rot: '10deg' },
    { top: '62%', left: '8%', size: 30, rot: '6deg' },
    { top: '70%', right: '10%', size: 42, rot: '-8deg' },
    { top: '40%', left: '78%', size: 26, rot: '14deg' },
] as const;

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

function FadingLabel({ text }: { text: string }) {
    const opacity = useSharedValue(0);
    useEffect(() => {
        opacity.value = 0;
        opacity.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.ease) });
    }, [text]);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return <RNReanimated.Text style={[s.pillText, style]}>{text}</RNReanimated.Text>;
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

export default function JobMatchingScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const { data: order } = useGetOrderByIdQuery(id as string, {
        skip: !id,
        pollingInterval: 4000,
    });

    const [timedOut, setTimedOut] = useState(false);
    const navigatedRef = useRef(false);

    useEffect(() => {
        const t = setTimeout(() => setTimedOut(true), MAX_SEARCH_MS);
        return () => clearTimeout(t);
    }, []);

    const status = order?.status;
    const phase: Phase =
        !timedOut && status && FOUND_STATUSES.includes(status)
            ? 'success'
            : !timedOut && status && NOT_FOUND_STATUSES.includes(status)
                ? 'not_found'
                : timedOut && !(status && FOUND_STATUSES.includes(status))
                    ? 'not_found'
                    : 'searching';

    useEffect(() => {
        if (phase !== 'success' || navigatedRef.current || !id) return;
        navigatedRef.current = true;
        const t = setTimeout(() => {
            router.replace({ pathname: '/shipment/[id]', params: { id: String(id) } });
        }, 1400);
        return () => clearTimeout(t);
    }, [phase, id, router]);

    const handleBack = useCallback(() => {
        router.replace('/(tabs)');
    }, [router]);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });
        return () => sub.remove();
    }, [handleBack]);

    const handleCancel = () => {
        Alert.alert(
            'Aramadan Çık',
            'Bu bekleme ekranından çıkmak istediğinize emin misiniz? Siparişiniz arka planda aranmaya devam edecek, İşlemlerim sekmesinden takip edebilirsiniz.',
            [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Çık', style: 'destructive', onPress: handleBack },
            ],
        );
    };

    const searching = phase === 'searching' || phase === 'success';

    return (
        <View style={s.root}>
            <LinearGradient colors={['#3A1D0C', '#241207', '#160D06']} style={StyleSheet.absoluteFill} />
            {searching &&
                SCATTER.map((sc, i) => (
                    <Image
                        key={i}
                        source={VEHICLE_ICONS[i % VEHICLE_ICONS.length]}
                        style={[s.scatterIcon, { top: sc.top as any, left: (sc as any).left, right: (sc as any).right, width: sc.size, height: sc.size, transform: [{ rotate: sc.rot }] }]}
                        resizeMode="contain"
                    />
                ))}

            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.topBar}>
                    <Tappable onPress={handleBack} style={s.topBarBtn} hitSlop={10} activeOpacity={0.7}>
                        <Feather name="chevron-left" size={24} color="#FFFFFF" />
                    </Tappable>
                    <Tappable onPress={handleCancel} style={s.cancelBtn} hitSlop={10} activeOpacity={0.7}>
                        <Text style={s.cancelBtnText}>İptal Et</Text>
                    </Tappable>
                </View>

                {searching && (
                    <View style={s.center}>
                        <View style={s.ringWrap}>
                            <Ring delay={0} />
                            <Ring delay={0.5} />
                            <View style={s.iconCircle}>
                                {phase === 'success' ? (
                                    <View style={s.checkCircle}>
                                        <Feather name="check" size={40} color="#FFFFFF" />
                                    </View>
                                ) : (
                                    <RollingVehicleIcon />
                                )}
                            </View>
                        </View>
                        <View style={s.pill}>
                            <FadingLabel
                                text={
                                    phase === 'searching'
                                        ? (status && RADIUS_LABEL[status]) || 'Aranmaya başlıyor, lütfen bekleyin'
                                        : PHASE_PILL[phase]
                                }
                            />
                        </View>
                    </View>
                )}

                {phase === 'not_found' && (
                    <View style={s.center}>
                        <View style={[s.checkCircle, s.checkCircleMuted]}>
                            <Feather name="user-x" size={40} color="#FFFFFF" />
                        </View>
                        <View style={s.pill}>
                            <Text style={s.pillText}>{PHASE_PILL.not_found}</Text>
                        </View>
                        <Tappable haptic="light" style={s.homeBtn} onPress={handleBack} activeOpacity={0.85}>
                            <Text style={s.homeBtnText}>Anasayfaya Dön</Text>
                        </Tappable>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#160D06' },
    safe: { flex: 1 },
    scatterIcon: { position: 'absolute', opacity: 0.14 },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    topBarBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
    cancelBtnText: { color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 13.5 },

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
    checkCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
    checkCircleMuted: { backgroundColor: '#6B7280' },

    pill: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    pillText: { color: '#111827', fontWeight: '700', fontSize: 14, textAlign: 'center' },

    homeBtn: { marginTop: 8, backgroundColor: '#FF5B04', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, maxWidth: 280 },
    homeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, textAlign: 'center' },
});
