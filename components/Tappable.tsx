import { cssInterop } from 'nativewind';
import React, { forwardRef } from 'react';
import { GestureResponderEvent, Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { HapticStyle, haptic } from '@/utils/haptics';
import { useGuardedPress } from '@/hooks/useGuardedPress';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export type TappableHaptic = HapticStyle;

export type TappableProps = Omit<PressableProps, 'style'> & {
    haptic?: TappableHaptic;
    scaleTo?: number;
    activeOpacity?: number;
    style?: PressableProps['style'];
    className?: string;
    guardMs?: number;
};

const Tappable = forwardRef<React.ComponentRef<typeof Pressable>, TappableProps>(
    ({ haptic: hapticStyle = 'none', scaleTo = 0.96, activeOpacity = 0.85, style, disabled, onPressIn, onPressOut, onPress, guardMs, ...rest }, ref) => {
        const scale = useSharedValue(1);
        const opacity = useSharedValue(1);

        const animStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        }));

        const handlePressIn = (e: GestureResponderEvent) => {
            scale.value = withTiming(scaleTo, { duration: 90 });
            opacity.value = withTiming(activeOpacity, { duration: 90 });
            onPressIn?.(e);
        };

        const handlePressOut = (e: GestureResponderEvent) => {
            scale.value = withTiming(1, { duration: 150 });
            opacity.value = withTiming(1, { duration: 150 });
            onPressOut?.(e);
        };

        const guardedPress = useGuardedPress(onPress, guardMs);
        const handlePress = (e: GestureResponderEvent) => {
            if (disabled) return;
            haptic(hapticStyle);
            guardedPress(e);
        };

        return (
            <AnimatedPressableBase
                ref={ref}
                disabled={disabled}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                style={[style, animStyle]}
                {...rest}
            />
        );
    },
);
Tappable.displayName = 'Tappable';

cssInterop(Tappable, { className: 'style' });

export default Tappable;
