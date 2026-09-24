import { useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export const BORDER_IDLE = '#F3F4F6';
export const BORDER_FILLED = '#FF5B04';
export const BORDER_AI = '#16A34A';
export const BORDER_ERROR = '#DC2626';

// Alan durumu değiştikçe (boş / dolu / yapay zekadan / hatalı) çerçeve rengi
// yumuşak geçişle güncellenir.
export const useAnimatedBorderColor = (color: string, duration = 220) => {
    const current = useSharedValue(color);

    useEffect(() => {
        current.value = withTiming(color, { duration });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [color]);

    return useAnimatedStyle(() => ({ borderColor: current.value }));
};
