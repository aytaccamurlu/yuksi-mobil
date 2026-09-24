import { useActiveMatching } from '@/store/feature/jobMatching/hooks';
import { radiusStageLabel, SEARCH_RADIUS_STAGES } from '@/store/feature/jobMatching/slice';
import { useUserSession } from '@/store/feature/user/hooks';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Tappable from '@/components/Tappable';
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#FF5B04';
const GREEN = '#16A34A';
const MAX_VISIBLE_MS = 3000;

const PHASE_TEXT: Record<string, string> = {
    success: 'Taşıyıcı bulundu!',
    review: 'Taşıyıcı onayı bekleniyor',
    not_found: 'Şu an uygun taşıyıcı yok',
};

function PulseDot({ color }: { color: string }) {
    const p = useSharedValue(0);
    useEffect(() => {
        p.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
        return () => cancelAnimation(p);
    }, []);
    const style = useAnimatedStyle(() => ({
        opacity: 0.5 + p.value * 0.5,
        transform: [{ scale: 0.85 + p.value * 0.3 }],
    }));
    return <Animated.View style={[s.dot, { backgroundColor: color }, style]} />;
}

function FadingBadgeText({ text }: { text: string }) {
    const opacity = useSharedValue(0);
    useEffect(() => {
        opacity.value = 0;
        opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.ease) });
    }, [text]);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return (
        <Animated.Text style={[s.text, style]} numberOfLines={1}>
            {text}
        </Animated.Text>
    );
}

// Kullanıcı "Yük Oluştur" sonrası eşleşme ekranından geri çıkarsa, süreç
// arka planda (bkz. store/feature/jobMatching) devam eder; bu rozet
// uygulamanın herhangi bir ekranında üstte belirip geri dönüşü sağlar.
// job-matching ekranının kendisinde gösterilmez (bkz. app/_layout.tsx).
export default function MatchingBadge() {
    const session = useUserSession();
    const active = useActiveMatching();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const label = active
        ? active.phase === 'searching'
            ? radiusStageLabel(SEARCH_RADIUS_STAGES[active.radiusStageIndex])
            : PHASE_TEXT[active.phase]
        : '';

    const [expired, setExpired] = useState(false);
    useEffect(() => {
        setExpired(false);
        if (!label) return;
        const t = setTimeout(() => setExpired(true), MAX_VISIBLE_MS);
        return () => clearTimeout(t);
    }, [label]);

    if (!session || !active || expired) return null;

    const isReview = active.phase === 'review';

    return (
        <View style={[s.wrap, { top: insets.top + 6 }]} pointerEvents="box-none">
            <Tappable
                haptic="light"
                style={[s.pill, isReview && s.pillReview]}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/job-matching/[id]', params: { id: active.jobId } })}
            >
                <PulseDot color={isReview ? GREEN : '#FFFFFF'} />
                <FadingBadgeText text={label} />
                <Feather name="chevron-right" size={16} color="#FFFFFF" />
            </Tappable>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 999,
        elevation: 999,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: PRIMARY,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 9,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
        maxWidth: '92%',
    },
    pillReview: { backgroundColor: '#111827' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    text: { color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 },
});
