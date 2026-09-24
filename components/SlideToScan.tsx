import { haptic } from '@/utils/haptics';
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const PRIMARY = '#FF5B04';
// Kaydırdıkça turuncudan yeşile döner; tetikleme eşiğinde tam yeşil olur.
const GREEN = '#16A34A';
const TRACK_BG = '#F4F5F7';
const TRACK_BG_ACTIVE = '#E7F6EC';
const TRACK_H = 56;
const TRACK_W = Math.round(TRACK_H * 2.55);
const KNOB = TRACK_H;
const ICON = Math.round(TRACK_H * 0.4);
const TRAVEL = TRACK_W - KNOB;
// Bu oranı geçince bırakınca tetikleniyor; altında kalırsa geri yaylanıyor.
const ACTIVATE_AT = 0.65;

const SPRING = { damping: 18, stiffness: 220 };

export default function SlideToScan({ onActivate }: { onActivate: () => void }) {
    const x = useSharedValue(0);
    const fired = useSharedValue(false);

    const fire = () => {
        haptic('medium');
        onActivate();
    };

    const pan = Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-14, 14])
        .onBegin(() => {
            fired.value = false;
        })
        .onUpdate((e) => {
            x.value = Math.min(Math.max(e.translationX, 0), TRAVEL);
        })
        .onEnd(() => {
            if (x.value >= TRAVEL * ACTIVATE_AT && !fired.value) {
                fired.value = true;
                x.value = withTiming(TRAVEL, { duration: 110 }, () => {
                    x.value = withSpring(0, SPRING);
                });
                runOnJS(fire)();
            } else {
                x.value = withSpring(0, SPRING);
            }
        });

    const knobStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }],
        backgroundColor: interpolateColor(
            x.value,
            [TRAVEL * 0.45, TRAVEL * ACTIVATE_AT],
            [PRIMARY, GREEN],
        ),
    }));
    const trackStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            x.value,
            [TRAVEL * 0.45, TRAVEL * ACTIVATE_AT],
            [TRACK_BG, TRACK_BG_ACTIVE],
        ),
    }));
    const labelStyle = useAnimatedStyle(() => ({
        opacity: interpolate(x.value, [0, TRAVEL * 0.7], [1, 0], Extrapolation.CLAMP),
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[s.track, trackStyle]}>
                <Animated.Text style={[s.label, labelStyle]} numberOfLines={1}>
                    Yük Tarat
                </Animated.Text>
                <Animated.View style={[s.knob, knobStyle]}>
                    <Image source={require('@/assets/images/scan-aperture.png')} style={s.icon} resizeMode="contain" />
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
}

const s = StyleSheet.create({
    track: {
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        justifyContent: 'center',
    },
    label: {
        position: 'absolute',
        left: KNOB,
        right: 0,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    knob: {
        position: 'absolute',
        left: 0,
        width: KNOB,
        height: KNOB,
        borderRadius: KNOB / 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5,
    },
    icon: { width: ICON, height: ICON },
});
