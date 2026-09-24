import AnimatedCount from '@/components/AnimatedCount';
import TicarimFilterSheet, { DEFAULT_TICARIM_FILTERS, TicarimFilters } from '@/components/TicarimFilterSheet';
import { TICARIM_CATEGORIES, TicarimCategory } from '@/service/mockData';
import { useGetCategoriesQuery } from '@/service/ticarim.service';
import { CATEGORY_KEY_TO_ID } from '@/utils/ticarim';
import { resetTicarimDraft, startTicarimListing } from '@/store/feature/ticarim/actions';
import { useGuardedPress } from '@/hooks/useGuardedPress';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORY_ICONS: Record<TicarimCategory, any> = {
    motorcycle: require('@/assets/images/motorcycle.png'),
    minivan: require('@/assets/images/minivan.png'),
    panelvan: require('@/assets/images/panelvan.png'),
    pickup: require('@/assets/images/pickup.png'),
    truck: require('@/assets/images/truck.png'),
};

export default function TicarimScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [filterVisible, setFilterVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            resetTicarimDraft();
        }, []),
    );

    const { data: categoriesData } = useGetCategoriesQuery();
    const countsByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        (categoriesData || []).forEach((c: any) => {
            const key = (Object.keys(CATEGORY_KEY_TO_ID) as TicarimCategory[]).find((k) => CATEGORY_KEY_TO_ID[k] === c.id);
            if (key) map[key] = c.active_listing_count || 0;
        });
        return map;
    }, [categoriesData]);

    const handleSearch = useGuardedPress(() => {
        if (!query.trim()) return;
        router.push({ pathname: '/ticarim/results', params: { q: query.trim() } });
    });

    const handleApplyFilters = (filters: TicarimFilters) => {
        router.push({
            pathname: '/ticarim/results',
            params: {
                ...(query.trim() ? { q: query.trim() } : {}),
                filters: JSON.stringify(filters),
            },
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
            <View className="bg-primary px-5 pt-4 pb-5">
                <View className="flex-row items-center mb-5">
                    <Tappable
                        onPress={() => router.back()}
                        className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center"
                    >
                        <Feather name="chevron-left" size={22} color="#fff" />
                    </Tappable>
                    <Text className="text-white text-lg font-bold flex-1 text-center mr-9">Ticarim</Text>
                </View>

                <View className="flex-row items-center">
                    <View className="flex-1 flex-row items-center bg-white rounded-2xl px-4 h-12 mr-2">
                        <Feather name="search" size={18} color="#9CA3AF" />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={handleSearch}
                            placeholder="Araç, marka ara..."
                            placeholderTextColor="#9CA3AF"
                            returnKeyType="search"
                            className="flex-1 ml-2 text-[14px] text-gray-800"
                        />
                    </View>
                    <Tappable className="w-12 h-12 bg-white rounded-2xl items-center justify-center mr-2" activeOpacity={0.7}>
                        <Feather name="map-pin" size={18} color="#FF5B04" />
                    </Tappable>
                    <Tappable
                        onPress={() => setFilterVisible(true)}
                        className="w-12 h-12 bg-white rounded-2xl items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <Feather name="sliders" size={18} color="#FF5B04" />
                    </Tappable>
                </View>
            </View>

            <ScrollView
                className="bg-gray-50"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            >
                <Text className="text-gray-500 text-[13px] leading-5 mb-5">
                    Ticarim, sadece ticari araç alım satımı yapılan bir pazar yeridir. İstersen ilan ver diyerek
                    aracını satabilir ya da yüzlerce ilan arasından sana uygun olanı seçebilirsin.
                </Text>

                <Text className="text-gray-900 text-[17px] font-bold mb-4">Araç Kategorini Seç</Text>

                <View
                    className="bg-white rounded-3xl border border-gray-100 p-2"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 12,
                        elevation: 2,
                    }}
                >
                    {TICARIM_CATEGORIES.map((cat, index) => (
                        <Tappable
                            key={cat.key}
                            onPress={() => router.push({ pathname: '/ticarim/results', params: { category: cat.key } })}
                            activeOpacity={0.6}
                            className={`flex-row items-center px-2 py-3 ${
                                index !== TICARIM_CATEGORIES.length - 1 ? 'border-b border-gray-50' : ''
                            }`}
                        >
                            <View className="w-16 h-16 bg-orange-50 rounded-2xl items-center justify-center mr-3.5">
                                <Image source={CATEGORY_ICONS[cat.key]} style={{ width: 52, height: 52 }} resizeMode="contain" />
                            </View>
                            <Text className="flex-1 text-gray-900 text-[15px] font-semibold">{cat.name}</Text>
                            <AnimatedCount
                                value={countsByCategory[cat.key] || 0}
                                suffix=" İlan"
                                className="text-primary text-[13px] font-bold"
                            />
                        </Tappable>
                    ))}
                </View>
            </ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-3 flex-row"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
                <Tappable
                    onPress={() => router.push('/ticarim/my-listings')}
                    activeOpacity={0.8}
                    className="flex-1 border-2 border-primary rounded-2xl py-3.5 items-center mr-3"
                >
                    <Text className="text-primary font-bold text-[15px]">İlanlarım</Text>
                </Tappable>
                <Tappable
                    onPress={() => {
                        startTicarimListing();
                        router.push('/ticarim/create/photos');
                    }}
                    activeOpacity={0.85}
                    className="flex-1 bg-primary rounded-2xl py-3.5 items-center"
                    style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                >
                    <Text className="text-white font-bold text-[15px]">İlan Ver</Text>
                </Tappable>
            </View>

            <TicarimFilterSheet
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                filters={DEFAULT_TICARIM_FILTERS}
                onApply={handleApplyFilters}
            />
        </SafeAreaView>
    );
}
