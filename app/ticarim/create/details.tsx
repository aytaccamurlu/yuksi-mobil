import TicarimBottomSheet from '@/components/TicarimBottomSheet';
import TicarimStepIndicator from '@/components/TicarimStepIndicator';
import {
    useGetBrandsQuery,
    useGetCategoriesQuery,
    useGetModelsQuery,
    useGetVehicleTypesQuery,
} from '@/service/ticarim.service';
import { CATEGORY_ID_TO_KEY } from '@/utils/ticarim';
import { disarmTicarimAutoChain, patchTicarimDraft } from '@/store/feature/ticarim/actions';
import { useTicarimDraft } from '@/store/feature/ticarim/hooks';
import { Feather } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Item = { id: string; name: string };
type PickerKey = 'category' | 'brand' | 'model' | 'vehicleType';

function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
    return (
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-12 mb-4">
            <Feather name="search" size={16} color="#9CA3AF" />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                className="flex-1 ml-2 text-[14px] text-gray-900"
                returnKeyType="search"
            />
            {!!value && (
                <Tappable onPress={() => onChangeText('')} hitSlop={8}>
                    <Feather name="x-circle" size={16} color="#9CA3AF" />
                </Tappable>
            )}
        </View>
    );
}

function PickerRow({
    label,
    required,
    value,
    placeholder,
    disabled,
    onPress,
}: {
    label: string;
    required?: boolean;
    value: string;
    placeholder: string;
    disabled?: boolean;
    onPress: () => void;
}) {
    return (
        <View className="mb-4">
            <Text className="text-[13px] text-gray-700 mb-2">
                {label} {required && <Text className="text-red-500">*</Text>}
            </Text>
            <Tappable
                onPress={onPress}
                disabled={disabled}
                className={`flex-row items-center justify-between border rounded-2xl px-4 h-14 ${
                    disabled ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
                }`}
            >
                <Text className={value ? 'text-gray-900 text-[14px]' : 'text-gray-400 text-[14px]'}>
                    {value || placeholder}
                </Text>
                <Feather name="chevron-down" size={18} color="#9CA3AF" />
            </Tappable>
        </View>
    );
}

function PickerSheet({
    visible,
    stepKey,
    title,
    loading,
    items,
    query,
    onQueryChange,
    onSelect,
    onClose,
    emptyLabel,
}: {
    visible: boolean;
    stepKey: PickerKey;
    title: string;
    loading: boolean;
    items: Item[];
    query: string;
    onQueryChange: (v: string) => void;
    onSelect: (item: Item) => void;
    onClose: () => void;
    emptyLabel: string;
}) {
    const filtered = items.filter((i) => i.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));

    const fade = useSharedValue(1);
    const firstStep = useRef(true);
    useEffect(() => {
        if (firstStep.current) {
            firstStep.current = false;
            return;
        }
        fade.value = 0;
        fade.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepKey]);
    const bodyStyle = useAnimatedStyle(() => ({
        opacity: fade.value,
        transform: [{ translateY: (1 - fade.value) * 12 }],
    }));

    return (
        <TicarimBottomSheet visible={visible} onClose={onClose} heightClassName="h-[60%]">
            <Animated.View style={[{ flex: 1 }, bodyStyle]}>
                <View className="flex-row items-center justify-between mb-5">
                    <Text className="text-gray-900 text-lg font-bold">{title}</Text>
                    <Tappable onPress={onClose} className="p-2 bg-gray-50 rounded-full">
                        <Feather name="x" size={18} color="#374151" />
                    </Tappable>
                </View>
                <SearchBox value={query} onChangeText={onQueryChange} placeholder="Ara..." />
                {loading ? (
                    <ActivityIndicator color="#FF5B04" style={{ marginTop: 20 }} />
                ) : (
                    <BottomSheetScrollView key={stepKey} style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {filtered.length === 0 && (
                            <Text className="text-gray-400 text-[13px] text-center py-6">{emptyLabel}</Text>
                        )}
                        {filtered.map((item) => (
                            <Tappable
                                key={item.id}
                                onPress={() => onSelect(item)}
                                className="px-4 py-3.5 mb-2 rounded-2xl border border-gray-100"
                            >
                                <Text className="text-gray-800">{item.name}</Text>
                            </Tappable>
                        ))}
                    </BottomSheetScrollView>
                )}
            </Animated.View>
        </TicarimBottomSheet>
    );
}

export default function TicarimDetailsScreen() {
    const router = useRouter();
    const draft = useTicarimDraft();
    const [activePicker, setActivePicker] = useState<PickerKey | null>(null);
    const [renderKey, setRenderKey] = useState<PickerKey>('category');
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (activePicker) setRenderKey(activePicker);
    }, [activePicker]);

    const { data: categories, isLoading: categoriesLoading } = useGetCategoriesQuery();
    const { data: brands, isLoading: brandsLoading } = useGetBrandsQuery(
        { categoryId: draft.categoryId },
        { skip: !draft.categoryId },
    );
    const brandIsGuid = /^[0-9a-fA-F-]{36}$/.test(draft.brandId);
    const { data: models, isLoading: modelsLoading } = useGetModelsQuery(
        { brandId: draft.brandId, categoryId: draft.categoryId },
        { skip: !draft.brandId || !brandIsGuid },
    );
    const { data: vehicleTypes, isLoading: vehicleTypesLoading } = useGetVehicleTypesQuery(
        { categoryId: draft.categoryId },
        { skip: !draft.categoryId },
    );

    const brandItems = useMemo(
        () => (brands || []).map((b: any) => ({ id: b.id, name: b.name })),
        [brands],
    );

    const modelItems = useMemo(
        () => (models || []).map((m: any) => ({ id: m.id, name: m.name })),
        [models],
    );

    const armed = draft.autoChainArmed;

    const openPicker = (key: PickerKey) => {
        setQuery('');
        setActivePicker(key);
    };
    const closePicker = () => setActivePicker(null);

    const handleSheetDismiss = () => {
        closePicker();
        disarmTicarimAutoChain();
    };

    useFocusEffect(
        useCallback(() => {
            return () => disarmTicarimAutoChain();
        }, []),
    );

    const handleCategorySelect = (item: Item) => {
        patchTicarimDraft({
            categoryId: item.id,
            category: CATEGORY_ID_TO_KEY[item.id] || null,
            brand: '',
            brandId: '',
            model: '',
            modelId: '',
            vehicleType: '',
            vehicleTypeId: '',
        });
        if (armed) openPicker('brand');
        else closePicker();
    };

    const handleBrandSelect = (item: Item) => {
        patchTicarimDraft({ brand: item.name, brandId: item.id, model: '', modelId: '' });
        if (armed) openPicker('model');
        else closePicker();
    };

    const handleModelSelect = (item: Item) => {
        patchTicarimDraft({ model: item.name, modelId: item.id });
        if (armed) openPicker('vehicleType');
        else closePicker();
    };

    const handleVehicleTypeSelect = (item: Item) => {
        patchTicarimDraft({ vehicleType: item.name, vehicleTypeId: item.id });
        closePicker();
        disarmTicarimAutoChain();
    };

    const pickers: Record<PickerKey, {
        title: string;
        loading: boolean;
        items: Item[];
        onSelect: (item: Item) => void;
        emptyLabel: string;
    }> = {
        category: {
            title: 'Kategori Seç',
            loading: categoriesLoading,
            items: (categories || []).map((c: any) => ({ id: c.id, name: c.name })),
            onSelect: handleCategorySelect,
            emptyLabel: 'Kategori bulunamadı',
        },
        brand: {
            title: 'Marka Seç',
            loading: brandsLoading,
            items: brandItems,
            onSelect: handleBrandSelect,
            emptyLabel: 'Marka bulunamadı',
        },
        model: {
            title: draft.brand ? `${draft.brand} Model Seç` : 'Model Seç',
            loading: modelsLoading,
            items: modelItems,
            onSelect: handleModelSelect,
            emptyLabel: 'Bu marka için kayıtlı model yok',
        },
        vehicleType: {
            title: 'Araç Tipi Seç',
            loading: vehicleTypesLoading,
            items: (vehicleTypes || []).map((v: any) => ({ id: v.id, name: v.name })),
            onSelect: handleVehicleTypeSelect,
            emptyLabel: 'Araç tipi bulunamadı',
        },
    };

    const activeConfig = pickers[renderKey];

    const handleConfirm = () => {
        const missing: string[] = [];
        if (!draft.categoryId) missing.push('kategori');
        if (!draft.brandId) missing.push('marka');
        if (!draft.modelId) missing.push('model');
        if (!draft.vehicleTypeId) missing.push('araç tipi');
        if (!draft.condition) missing.push('durum');
        if (!draft.location) missing.push('konum');

        if (missing.length > 0) {
            const list = missing.length > 1
                ? `${missing.slice(0, -1).join(', ')} ve ${missing[missing.length - 1]}`
                : missing[0];
            const suffix = missing.length > 1 ? 'bilgilerini' : 'bilgisini';
            Alert.alert('Eksik Bilgi', `Devam etmeden önce ${list} ${suffix} gir.`);
            return;
        }
        router.push('/ticarim/create/description');
    };

    return (
        <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
            <View className="bg-primary px-5 pt-4 pb-5 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center mr-3"
                >
                    <Feather name="chevron-left" size={22} color="#fff" />
                </Tappable>
                <Text className="text-white text-lg font-bold flex-1 text-center mr-9">
                    {draft.editingId ? 'İlanı Düzenle' : 'İlan Detaylarını Gir'}
                </Text>
            </View>

            <View className="flex-1 bg-white">
                <TicarimStepIndicator step={2} />

                <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text className="text-gray-900 text-[16px] font-bold mb-4">Araç Detayı</Text>

                <PickerRow
                    label="Kategori"
                    required
                    value={categories?.find((c: any) => c.id === draft.categoryId)?.name || ''}
                    placeholder="Seç"
                    onPress={() => openPicker('category')}
                />

                <PickerRow
                    label="Marka"
                    required
                    value={draft.brand}
                    placeholder={draft.categoryId ? 'Seç' : 'Önce kategori seçin'}
                    disabled={!draft.categoryId}
                    onPress={() => draft.categoryId && openPicker('brand')}
                />

                <PickerRow
                    label="Model"
                    required
                    value={draft.model}
                    placeholder={draft.brandId ? 'Seç' : 'Önce marka seçin'}
                    disabled={!draft.brandId}
                    onPress={() => draft.brandId && openPicker('model')}
                />

                <PickerRow
                    label="Araç Tipi"
                    required
                    value={draft.vehicleType}
                    placeholder={draft.categoryId ? 'Seç' : 'Önce kategori seçin'}
                    disabled={!draft.categoryId}
                    onPress={() => draft.categoryId && openPicker('vehicleType')}
                />

                <View className="mb-4">
                    <Text className="text-[13px] text-gray-700 mb-2">
                        Durumu <Text className="text-red-500">*</Text>
                    </Text>
                    <Tappable
                        onPress={() => router.push('/ticarim/create/condition')}
                        className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 h-14"
                    >
                        <Text className={draft.condition ? 'text-gray-900 text-[14px]' : 'text-gray-400 text-[14px]'}>
                            {draft.condition
                                ? `${draft.condition}${draft.conditionScore ? ` · ${draft.conditionScore}` : ''}`
                                : 'Seç'}
                        </Text>
                        <Feather name="chevron-down" size={18} color="#9CA3AF" />
                    </Tappable>
                </View>

                <View className="mb-4">
                    <Text className="text-[13px] text-gray-700 mb-2">
                        Konum <Text className="text-red-500">*</Text>
                    </Text>
                    <Tappable
                        onPress={() => router.push('/ticarim/create/location')}
                        className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 h-14"
                    >
                        <Text className={draft.location ? 'text-gray-900 text-[14px]' : 'text-gray-400 text-[14px]'}>
                            {draft.location || 'Seç'}
                        </Text>
                        <Feather name="chevron-right" size={18} color="#9CA3AF" />
                    </Tappable>
                </View>
                </ScrollView>

                <View className="px-5 pb-6 pt-2">
                    <Tappable
                        onPress={handleConfirm}
                        activeOpacity={0.85}
                        className="bg-primary rounded-full py-4 items-center"
                        style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    >
                        <Text className="text-white font-bold text-[15px]">Onayla</Text>
                    </Tappable>
                </View>
            </View>

            <PickerSheet
                visible={activePicker !== null}
                stepKey={renderKey}
                title={activeConfig.title}
                loading={activeConfig.loading}
                items={activeConfig.items}
                query={query}
                onQueryChange={setQuery}
                onSelect={activeConfig.onSelect}
                onClose={handleSheetDismiss}
                emptyLabel={activeConfig.emptyLabel}
            />
        </SafeAreaView>
    );
}
