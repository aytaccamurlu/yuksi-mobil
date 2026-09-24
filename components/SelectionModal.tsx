import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import AppBottomSheet from '@/components/AppBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface SelectionModalProps {
    visible: boolean;
    type: 'capacity' | 'type' | null;
    vehicleKey?: string;
    selectedValue: any;
    onSelect: (value: any) => void;
    onClose: () => void;
}

export const CAPACITY_OPTIONS_BY_VEHICLE: Record<string, { id: number; label: string }[]> = {
    courier: [
        { id: 1, label: '1 kg - Hafif Yük' },
        { id: 2, label: '5 kg - Ortalama Yük' },
        { id: 3, label: '10 kg - Orta Ağır Yük' },
        { id: 4, label: '20 kg - Ağır Yük' },
    ],
    minivan: [
        { id: 1, label: '50 kg - Hafif Yük' },
        { id: 2, label: '150 kg - Ortalama Yük' },
        { id: 3, label: '300 kg - Orta Ağır Yük' },
        { id: 4, label: '500 kg - Ağır Yük' },
    ],
    panelvan: [
        { id: 1, label: '100 kg - Hafif Yük' },
        { id: 2, label: '400 kg - Ortalama Yük' },
        { id: 3, label: '800 kg - Orta Ağır Yük' },
        { id: 4, label: '1.200 kg - Ağır Yük' },
    ],
    pickup: [
        { id: 1, label: '250 kg - Hafif Yük' },
        { id: 2, label: '750 kg - Ortalama Yük' },
        { id: 3, label: '1.500 kg - Orta Ağır Yük' },
        { id: 4, label: '3.500 kg - Ağır Yük' },
    ],
    truck: [
        { id: 1, label: '1 ton - Hafif Yük' },
        { id: 2, label: '5 ton - Ortalama Yük' },
        { id: 3, label: '10 ton - Orta Ağır Yük' },
        { id: 4, label: '24 ton - Ağır Yük' },
    ],
};

export const CAPACITY_OPTIONS = CAPACITY_OPTIONS_BY_VEHICLE.courier;

export const TYPE_OPTIONS = [
    { id: 1, label: 'Sıvı' },
    { id: 2, label: 'Isı Korumalı' },
    { id: 3, label: 'Canlı' },
    { id: 4, label: 'Katı' },
];

export default function SelectionModal({
    visible,
    type,
    vehicleKey,
    selectedValue,
    onSelect,
    onClose,
}: SelectionModalProps) {
    const insets = useSafeAreaInsets();
    const [activeType, setActiveType] = useState<'capacity' | 'type' | null>(type);
    const contentFade = useSharedValue(1);
    const firstContent = useRef(true);

    useEffect(() => {
        if (type) setActiveType(type);
    }, [type]);

    useEffect(() => {
        if (firstContent.current) {
            firstContent.current = false;
            return;
        }
        contentFade.value = 0;
        contentFade.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeType]);

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentFade.value,
        transform: [{ translateY: (1 - contentFade.value) * 10 }],
    }));

    const title = activeType === 'capacity' ? 'Kapasite Seçimi' : 'Yük Türü Seçimi';
    const options = activeType === 'capacity'
        ? (CAPACITY_OPTIONS_BY_VEHICLE[vehicleKey ?? 'courier'] ?? CAPACITY_OPTIONS_BY_VEHICLE.courier)
        : TYPE_OPTIONS;

    return (
        <AppBottomSheet visible={visible} onClose={onClose}>
            <Animated.View style={[{ paddingBottom: insets.bottom + 20 }, contentStyle]}>
                <View className="flex-row justify-between items-center px-6 mb-5">
                    <Text className="text-xl font-bold text-gray-900">{title}</Text>
                    <Tappable onPress={onClose} className="p-2 bg-gray-50 rounded-full">
                        <Feather name="x" size={20} color="#374151" />
                    </Tappable>
                </View>

                <View className="px-6">
                    {options.map((option) => {
                        const isSelected = selectedValue?.id === option.id;

                        return (
                            <Tappable haptic="light"
                                key={option.id}
                                onPress={() => onSelect(option)}
                                className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl border ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'
                                    }`}
                            >
                                <Text
                                    className={`text-base font-semibold ${isSelected ? 'text-orange-600' : 'text-gray-700'
                                        }`}
                                >
                                    {option.label}
                                </Text>

                                {isSelected && (
                                    <View className="w-6 h-6 rounded-full bg-orange-500 items-center justify-center">
                                        <Feather name="check" size={14} color="white" />
                                    </View>
                                )}
                            </Tappable>
                        );
                    })}
                </View>
            </Animated.View>
        </AppBottomSheet>
    );
}
