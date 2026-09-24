import { Feather } from '@expo/vector-icons';
import { haptic } from '@/utils/haptics';
import React from 'react';
import { Switch, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

export function ToggleRow({
    title,
    subtitle,
    value,
    onValueChange,
    isLast,
}: {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    isLast?: boolean;
}) {
    return (
        <View className={`flex-row items-center px-3 py-3.5 ${isLast ? '' : 'border-b border-gray-50'}`}>
            <View className="flex-1 pr-3">
                <Text className="text-[15px] font-semibold text-gray-800 tracking-tight">{title}</Text>
                {!!subtitle && <Text className="text-[12px] text-gray-400 mt-0.5">{subtitle}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={(v) => { haptic('light'); onValueChange(v); }}
                trackColor={{ false: '#E5E7EB', true: '#FFD3B8' }}
                thumbColor={value ? '#FF5B04' : '#fff'}
            />
        </View>
    );
}

export function LinkRow({
    title,
    subtitle,
    value,
    onPress,
    isLast,
}: {
    title: string;
    subtitle?: string;
    value?: string;
    onPress: () => void;
    isLast?: boolean;
}) {
    return (
        <Tappable
            className={`flex-row items-center px-3 py-3.5 ${isLast ? '' : 'border-b border-gray-50'}`}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View className="flex-1 pr-3">
                <Text className="text-[15px] font-semibold text-gray-800 tracking-tight">{title}</Text>
                {!!subtitle && <Text className="text-[12px] text-gray-400 mt-0.5">{subtitle}</Text>}
            </View>
            {!!value && <Text className="text-[13px] text-gray-400 mr-2">{value}</Text>}
            <Feather name="chevron-right" size={18} color="#D1D5DB" />
        </Tappable>
    );
}

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View className="mb-6">
            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wide">{title}</Text>
            <View
                className="bg-white rounded-3xl p-2 border border-gray-100"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                }}
            >
                {children}
            </View>
        </View>
    );
}

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return (
        <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-100 flex-row items-center">
            <Tappable
                onPress={onBack}
                className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 mr-3"
            >
                <Feather name="arrow-left" size={20} color="#374151" />
            </Tappable>
            <Text className="text-gray-900 text-xl font-bold tracking-tight">{title}</Text>
        </View>
    );
}
