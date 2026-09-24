import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const EASING = Easing.bezier(0.42, 0, 0.36, 0.99);
const DURATION = 280;

export default function FieldHint({ text, satisfied }: { text: string; satisfied: boolean }) {
    const progress = useSharedValue(satisfied ? 0 : 1);

    useEffect(() => {
        progress.value = withTiming(satisfied ? 0 : 1, { duration: DURATION, easing: EASING });
    }, [satisfied]);

    const style = useAnimatedStyle(() => ({
        opacity: progress.value,
        maxHeight: progress.value * 48,
        marginTop: progress.value * 8,
        marginBottom: progress.value * 14,
    }));

    return (
        <Animated.View style={[s.row, style]} pointerEvents="none">
            <Feather name="info" size={12} color="#9CA3AF" />
            <Text style={s.text} numberOfLines={2}>{text}</Text>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingHorizontal: 4,
        overflow: 'hidden',
    },
    text: { flex: 1, fontSize: 11.5, color: '#9CA3AF', lineHeight: 15 },
});
