import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

export default function AnimatedCount({
    value,
    loading,
    suffix = '',
    className = '',
}: {
    value: number;
    loading?: boolean;
    suffix?: string;
    className?: string;
}) {
    const [display, setDisplay] = useState(0);
    const countAnim = useRef(new Animated.Value(0)).current;
    const barAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!loading) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(barAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
                Animated.timing(barAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [loading]);

    useEffect(() => {
        if (loading) return;
        countAnim.setValue(0);
        const id = countAnim.addListener(({ value: v }) => setDisplay(Math.round(v)));
        Animated.timing(countAnim, {
            toValue: value,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
        return () => countAnim.removeListener(id);
    }, [value, loading]);

    if (loading) {
        return (
            <View className="w-16 h-2 rounded-full bg-orange-100 overflow-hidden">
                <Animated.View
                    className="h-2 rounded-full bg-primary"
                    style={{ width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['15%', '85%'] }) }}
                />
            </View>
        );
    }

    return (
        <Text className={className}>
            {display.toLocaleString('tr-TR')}{suffix}
        </Text>
    );
}
