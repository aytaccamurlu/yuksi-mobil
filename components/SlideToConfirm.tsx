import { Feather } from '@expo/vector-icons';
import { haptic } from '@/utils/haptics';
import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
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
const GREEN = '#16A34A';
const TRACK_H = 56;
const KNOB = TRACK_H;
const ICON = Math.round(TRACK_H * 0.4);
const ACTIVATE_AT = 0.65;
const SPRING = { damping: 18, stiffness: 220 };

export default function SlideToConfirm({
    label,
    onActivate,
    disabled,
}: {
    label: string;
    onActivate: () => void;
    disabled?: boolean;
}) {
    const [trackW, setTrackW] = useState(0);
    const travel = Math.max(trackW - KNOB, 1);
    const x = useSharedValue(0);
    const fired = useSharedValue(false);

    const fire = () => {
        haptic('medium');
        onActivate();
    };

    const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

    const pan = Gesture.Pan()
        .enabled(!disabled)
        .activeOffsetX([-12, 12])
        .failOffsetY([-14, 14])
        .onBegin(() => {
            fired.value = false;
        })
        .onUpdate((e) => {
            x.value = Math.min(Math.max(e.translationX, 0), travel);
        })
        .onEnd(() => {
            if (x.value >= travel * ACTIVATE_AT && !fired.value) {
                fired.value = true;
                x.value = withTiming(travel, { duration: 110 }, () => {
                    x.value = withSpring(0, SPRING);
                });
                runOnJS(fire)();
            } else {
                x.value = withSpring(0, SPRING);
            }
        });

    const knobStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }],
        backgroundColor: interpolateColor(x.value, [travel * 0.45, travel * ACTIVATE_AT], ['#FFFFFF', GREEN]),
    }));
    const labelStyle = useAnimatedStyle(() => ({
        opacity: interpolate(x.value, [0, travel * 0.7], [1, 0], Extrapolation.CLAMP),
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                onLayout={onLayout}
                style={[s.track, disabled && s.trackDisabled]}
            >
                <Animated.Text style={[s.label, labelStyle]} numberOfLines={1}>
                    {label}
                </Animated.Text>
                {trackW > 0 && (
                    <Animated.View style={[s.knob, knobStyle]}>
                        <Feather name="arrow-right" size={ICON} color={PRIMARY} />
                    </Animated.View>
                )}
            </Animated.View>
        </GestureDetector>
    );
}

const s = StyleSheet.create({
    track: {
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        backgroundColor: PRIMARY,
        justifyContent: 'center',
    },
    trackDisabled: { opacity: 0.6 },
    label: {
        position: 'absolute',
        left: KNOB,
        right: 0,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    knob: {
        position: 'absolute',
        left: 0,
        width: KNOB,
        height: KNOB,
        borderRadius: KNOB / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
});
