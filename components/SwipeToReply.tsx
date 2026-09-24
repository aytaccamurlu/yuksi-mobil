import { Feather } from '@expo/vector-icons';
import { haptic } from '@/utils/haptics';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const THRESHOLD = 52;
const MAX = 150;

export default function SwipeToReply({
  children,
  onReply,
  align,
}: {
  children: React.ReactNode;
  onReply: () => void;
  align: 'me' | 'them';
}) {
  const x = useSharedValue(0);
  const passed = useSharedValue(false);

  const buzz = () => haptic('light');

  const pan = Gesture.Pan()
    .activeOffsetX([-9999, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      const t = Math.max(0, Math.min(e.translationX, MAX));
      x.value = t <= THRESHOLD ? t : THRESHOLD + (t - THRESHOLD) * 0.28;
      if (t >= THRESHOLD && !passed.value) {
        passed.value = true;
        runOnJS(buzz)();
      } else if (t < THRESHOLD && passed.value) {
        passed.value = false;
      }
    })
    .onEnd(() => {
      if (passed.value) runOnJS(onReply)();
      x.value = withSpring(0, { damping: 20, stiffness: 240 });
      passed.value = false;
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const iconStyle = useAnimatedStyle(() => {
    const p = Math.min(x.value / THRESHOLD, 1);
    return { opacity: p, transform: [{ scale: 0.5 + p * 0.5 }] };
  });

  return (
    <View style={s.flex}>
      <Animated.View style={[s.icon, iconStyle]} pointerEvents="none">
        <Feather name="corner-up-left" size={16} color="#6B7280" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[rowStyle, { alignItems: align === 'me' ? 'flex-end' : 'flex-start' }]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  icon: {
    position: 'absolute',
    left: 6,
    top: 0,
    bottom: 0,
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
