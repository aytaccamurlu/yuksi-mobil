import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const PHASE1_HOLD = 900;
const TRANSITION  = 700;
const PHASE2_HOLD = 900;
const FADE_OUT    = 450;

interface AppSplashProps {
    onFinish: () => void;
}

export default function AppSplash({ onFinish }: AppSplashProps) {
    const gradientOpacity  = useSharedValue(1);
    const patternOpacity   = useSharedValue(0);
    const logoScale        = useSharedValue(0.75);
    const containerOpacity = useSharedValue(1);

    useEffect(() => {
        const transitionAt = PHASE1_HOLD;
        const fadeAt       = PHASE1_HOLD + TRANSITION + PHASE2_HOLD;

        gradientOpacity.value = withDelay(transitionAt, withTiming(0, { duration: TRANSITION }));
        patternOpacity.value  = withDelay(transitionAt, withTiming(1, { duration: TRANSITION }));
        logoScale.value       = withDelay(transitionAt, withTiming(1, { duration: TRANSITION }));
        containerOpacity.value = withDelay(fadeAt, withTiming(0, { duration: FADE_OUT }));

        // JS timer — animasyon bitince onFinish çağır (runOnJS deprecated)
        const timer = setTimeout(onFinish, fadeAt + FADE_OUT);
        return () => clearTimeout(timer);
    }, []);

    const gradientStyle  = useAnimatedStyle(() => ({ opacity: gradientOpacity.value }));
    const patternStyle   = useAnimatedStyle(() => ({ opacity: patternOpacity.value }));
    const logoStyle      = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
    const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));

    return (
        <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]}>

            {/* Faz 1: Turuncu gradient */}
            <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]} pointerEvents="none">
                <LinearGradient
                    colors={['#FF6B2B', '#FFB99A']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
            </Animated.View>

            {/* Faz 2: Ikonlu pattern arka plan */}
            <Animated.View style={[StyleSheet.absoluteFill, patternStyle]} pointerEvents="none">
                <Image
                    source={require('@/assets/splash-pattern.png')}
                    style={styles.patternImage}
                />
            </Animated.View>

            {/* Logo — faz geçişinde büyür */}
            <Animated.Image
                source={require('@/assets/images/yüksi-vector-orange.png')}
                style={[styles.logo, logoStyle]}
                resizeMode="contain"
            />

        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: {
        zIndex: 999,
    },
    patternImage: {
        width,
        height,
        resizeMode: 'cover',
    },
    logo: {
        position: 'absolute',
        top: 286,
        left: 33,
        width: 346,
        height: 346,
    },
});
