import { Feather } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import AppBottomSheet from '@/components/AppBottomSheet';
import RangeSlider from './RangeSlider';

export type TicarimFilters = {
    priceRange: [number, number];
    distanceRange: [number, number];
    condition: string | null;
    brands: string[];
    kmBucket: string | null;
    favoritesOnly: boolean;
};

export const DEFAULT_TICARIM_FILTERS: TicarimFilters = {
    priceRange: [0, 5000000],
    distanceRange: [0, 100],
    condition: null,
    brands: [],
    kmBucket: null,
    favoritesOnly: false,
};

const PRICE_MIN = 0;
const PRICE_MAX = 5000000;
const DISTANCE_MIN = 0;
const DISTANCE_MAX = 100;

const BRAND_OPTIONS: { name: string; count: number | null }[] = [
    { name: 'Abush', count: 80 },
    { name: 'AJP', count: 3 },
    { name: 'Altai', count: 409 },
    { name: 'Ariic', count: 5 },
    { name: 'Apec', count: 1166 },
    { name: 'Aprilia', count: 562 },
    { name: 'Bajaj', count: 9868 },
    { name: 'Baotian', count: 3 },
    { name: 'Barossa', count: 58 },
    { name: 'Arora', count: null },
    { name: 'Benda Motor', count: 150 },
    { name: 'Suzuki', count: null },
    { name: 'Honda', count: 100 },
];

const KM_BUCKETS = [
    { label: '0 - 5.000', min: 0, max: 5000 },
    { label: '5.000 - 50.000', min: 5000, max: 50000 },
];

const formatTL = (n: number) => `${n.toLocaleString('tr-TR')}TL`;
const formatKm = (n: number) => `${n}km`;

function Pill({
    label,
    selected,
    onPress,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Tappable
            onPress={onPress}
            activeOpacity={0.7}
            className={`px-4 py-2.5 rounded-full border mr-2 mb-2 ${
                selected ? 'bg-primary border-primary' : 'bg-white border-gray-200'
            }`}
        >
            <Text className={selected ? 'text-white font-bold text-[13px]' : 'text-gray-700 text-[13px]'}>
                {label}
            </Text>
        </Tappable>
    );
}

export default function TicarimFilterSheet({
    visible,
    onClose,
    filters,
    onApply,
}: {
    visible: boolean;
    onClose: () => void;
    filters: TicarimFilters;
    onApply: (filters: TicarimFilters) => void;
}) {
    const [draft, setDraft] = useState<TicarimFilters>(filters);

    useEffect(() => {
        if (visible) setDraft(filters);
    }, [visible, filters]);

    const toggleBrand = (name: string) => {
        setDraft((d) => ({
            ...d,
            brands: d.brands.includes(name) ? d.brands.filter((b) => b !== name) : [...d.brands, name],
        }));
    };

    const toggleCondition = (value: string) => {
        setDraft((d) => ({ ...d, condition: d.condition === value ? null : value }));
    };

    const toggleKmBucket = (label: string) => {
        setDraft((d) => ({ ...d, kmBucket: d.kmBucket === label ? null : label }));
    };

    const handleReset = () => setDraft(DEFAULT_TICARIM_FILTERS);

    const handleApply = () => {
        onApply(draft);
        onClose();
    };

    return (
        <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['85%']}>
            <View className="flex-1">
                <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-50">
                    <Text className="text-gray-900 text-xl font-bold">Filtrele</Text>
                    <Tappable onPress={onClose} className="p-1">
                        <Feather name="x" size={22} color="#111827" />
                    </Tappable>
                </View>

                <BottomSheetScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="mb-6 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <Feather name="heart" size={16} color="#FF5B04" />
                            <Text className="text-gray-900 text-[15px] font-bold ml-2">Favorilerim</Text>
                        </View>
                        <Switch
                            value={draft.favoritesOnly}
                            onValueChange={(v) => setDraft((d) => ({ ...d, favoritesOnly: v }))}
                            trackColor={{ false: '#E5E7EB', true: '#FFD3B8' }}
                            thumbColor={draft.favoritesOnly ? '#FF5B04' : '#fff'}
                        />
                    </View>

                    <View className="mb-6">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-gray-900 text-[15px] font-bold">Fiyat</Text>
                            <Text className="text-gray-400 text-[13px]">
                                {formatTL(draft.priceRange[0])}-{formatTL(draft.priceRange[1])}
                            </Text>
                        </View>
                        <RangeSlider
                            min={PRICE_MIN}
                            max={PRICE_MAX}
                            step={10000}
                            value={draft.priceRange}
                            onChange={(priceRange) => setDraft((d) => ({ ...d, priceRange }))}
                        />
                    </View>

                    <View className="mb-6">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-gray-900 text-[15px] font-bold">Mesafe</Text>
                            <Text className="text-gray-400 text-[13px]">
                                {formatKm(draft.distanceRange[0])}-{formatKm(draft.distanceRange[1])}
                            </Text>
                        </View>
                        <RangeSlider
                            min={DISTANCE_MIN}
                            max={DISTANCE_MAX}
                            step={1}
                            value={draft.distanceRange}
                            onChange={(distanceRange) => setDraft((d) => ({ ...d, distanceRange }))}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-gray-900 text-[15px] font-bold mb-3">Durumu</Text>
                        <View className="flex-row flex-wrap">
                            <Pill label="Sıfır" selected={draft.condition === 'Sıfır'} onPress={() => toggleCondition('Sıfır')} />
                            <Pill
                                label="İkinci El"
                                selected={draft.condition === 'İkinci El'}
                                onPress={() => toggleCondition('İkinci El')}
                            />
                        </View>
                    </View>

                    <View className="mb-6">
                        <Text className="text-gray-900 text-[15px] font-bold mb-3">Marka</Text>
                        <View className="flex-row flex-wrap">
                            {BRAND_OPTIONS.map((b) => (
                                <Pill
                                    key={b.name}
                                    label={b.count != null ? `${b.name} (${b.count.toLocaleString('tr-TR')})` : b.name}
                                    selected={draft.brands.includes(b.name)}
                                    onPress={() => toggleBrand(b.name)}
                                />
                            ))}
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-900 text-[15px] font-bold mb-3">Araç Kilometresi</Text>
                        <View className="flex-row flex-wrap">
                            {KM_BUCKETS.map((k) => (
                                <Pill
                                    key={k.label}
                                    label={k.label}
                                    selected={draft.kmBucket === k.label}
                                    onPress={() => toggleKmBucket(k.label)}
                                />
                            ))}
                        </View>
                    </View>
                </BottomSheetScrollView>

                <View className="flex-row items-center px-5 pt-3 pb-6 border-t border-gray-50">
                    <Tappable onPress={handleReset} activeOpacity={0.7} className="mr-5">
                        <Text className="text-primary font-bold text-[15px]">Sıfırla</Text>
                    </Tappable>
                    <Tappable
                        onPress={handleApply}
                        activeOpacity={0.85}
                        className="flex-1 bg-primary rounded-full py-3.5 items-center"
                        style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    >
                        <Text className="text-white font-bold text-[15px]">Filtreyi Uygula</Text>
                    </Tappable>
                </View>
            </View>
        </AppBottomSheet>
    );
}
