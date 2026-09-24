import React, { useMemo } from 'react';
import { View } from 'react-native';
import AppBottomSheet from '@/components/AppBottomSheet';

export default function TicarimBottomSheet({
    visible,
    onClose,
    children,
    heightClassName = 'h-[70%]',
}: {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    heightClassName?: string;
}) {
    const snapPoints = useMemo(() => {
        const match = heightClassName.match(/h-\[(\d+)%\]/);
        return match ? [`${match[1]}%`] : undefined;
    }, [heightClassName]);

    return (
        <AppBottomSheet visible={visible} onClose={onClose} snapPoints={snapPoints}>
            <View className={`px-6 pb-6 ${snapPoints ? 'flex-1' : ''}`}>{children}</View>
        </AppBottomSheet>
    );
}
