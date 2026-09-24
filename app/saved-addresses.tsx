import SortableList from '@/components/SortableList';
import { useDeleteAddressMutation, useGetAddressesQuery } from '@/service/createLoad.service';
import { setFromLocation, setToLocation } from '@/store/feature/createLoad/actions';
import { LocationData } from '@/store/feature/createLoad/slice';
import { goToCreateLoadOrActiveMatching } from '@/store/feature/jobMatching/actions';
import {
    getHasDraggedSavedRoute,
    getSavedRouteOrder,
    setHasDraggedSavedRoute,
    setSavedRouteOrder,
} from '@/utils/storage';
import { Feather } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const LABEL_WIDTH = 92;

function RouteCard({
    item,
    onDelete,
    onReuse,
    isActive,
}: {
    item: any;
    onDelete: () => void;
    onReuse: (from: LocationData, to: LocationData) => void;
    isActive: boolean;
}) {
    const [swapped, setSwapped] = useState(false);
    const from: LocationData = swapped ? item.to : item.from;
    const to: LocationData = swapped ? item.from : item.to;

    const rotateAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handleSwapPress = () => {
        Animated.timing(rotateAnim, {
            toValue: swapped ? 0 : 1,
            duration: 260,
            useNativeDriver: true,
        }).start();

        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
            setSwapped((v) => !v);
            Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
        });
    };

    const rotateInterpolate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <View
            className="bg-white rounded-3xl p-4"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: isActive ? 6 : 2 },
                shadowOpacity: isActive ? 0.18 : 0.06,
                shadowRadius: isActive ? 18 : 12,
                elevation: isActive ? 8 : 3,
                borderWidth: 2,
                borderColor: isActive ? '#FF5B04' : 'transparent',
            }}
        >
            <View className="flex-row items-center justify-between mb-3.5">
                <View className="flex-row items-center bg-orange-50 rounded-full pl-2.5 pr-3.5 py-1.5">
                    <Feather name="map-pin" size={13} color="#FF5B04" />
                    <Text className="text-primary font-bold text-[13px] ml-1">{item.title || 'Adres'}</Text>
                </View>
                <Tappable onPress={handleSwapPress} activeOpacity={0.6} className="p-1.5">
                    <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                        <Feather name="repeat" size={19} color="#FF5B04" />
                    </Animated.View>
                </Tappable>
            </View>

            {/* numberOfLines=1: kartlar sabit yükseklikte kalmazsa sürüklemede çöküyor */}
            <Animated.View style={{ opacity: fadeAnim }}>
                <View className="flex-row items-center mb-2.5">
                    <View
                        className="flex-row items-center justify-center bg-primary rounded-full py-1.5 mr-2.5"
                        style={{ width: LABEL_WIDTH }}
                    >
                        <Feather name="map-pin" size={11} color="#fff" />
                        <Text className="text-white font-bold text-[11px] ml-1">Nereden</Text>
                    </View>
                    <Text className="flex-1 text-gray-800 text-[13px] font-medium" numberOfLines={1}>
                        {from?.address}
                    </Text>
                </View>

                <View className="flex-row items-center mb-4">
                    <View
                        className="flex-row items-center justify-center bg-primary rounded-full py-1.5 mr-2.5"
                        style={{ width: LABEL_WIDTH }}
                    >
                        <Feather name="map-pin" size={11} color="#fff" />
                        <Text className="text-white font-bold text-[11px] ml-1">Nereye</Text>
                    </View>
                    <Text className="flex-1 text-gray-800 text-[13px] font-medium" numberOfLines={1}>
                        {to?.address}
                    </Text>
                </View>
            </Animated.View>

            <View className="flex-row items-center">
                <Tappable
                    onPress={() => onReuse(from, to)}
                    activeOpacity={0.85}
                    className="flex-1 bg-primary rounded-full py-3.5 items-center mr-3"
                    style={{
                        shadowColor: '#FF5B04',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                >
                    <Text className="text-white font-bold text-[15px]">Yeniden Kullan</Text>
                </Tappable>
                <Tappable haptic="warning"
                    onPress={onDelete}
                    activeOpacity={0.7}
                    className="w-11 h-11 rounded-2xl border-2 border-primary items-center justify-center"
                >
                    <Feather name="x" size={18} color="#FF5B04" />
                </Tappable>
            </View>
        </View>
    );
}

export default function SavedAddressesScreen() {
    const router = useRouter();
    const { data: addressesData, isLoading } = useGetAddressesQuery();
    const [deleteAddress] = useDeleteAddressMutation();

    const [orderedAddresses, setOrderedAddresses] = useState<any[]>([]);
    const [hasDragged, setHasDragged] = useState(false);

    // Boş/yükleniyor durumunu native header'ı hesaba katıp gerçek ekran ortasına oturtur.
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const centerOffset = -(headerHeight - insets.bottom) / 2;

    useEffect(() => {
        getHasDraggedSavedRoute().then((value) => {
            if (value) setHasDragged(true);
        });
    }, []);

    const handleDragStart = useCallback(() => {
        setHasDragged(true);
        setHasDraggedSavedRoute();
    }, []);

    // Kart sırası cihazda saklanır — bilinmeyen id'ler sona eklenir.
    useEffect(() => {
        const raw = addressesData?.data?.addresses || addressesData?.data || addressesData;
        const list = (Array.isArray(raw) ? raw : []).filter((a: any) => a && a.id);

        (async () => {
            try {
                const orderIds = await getSavedRouteOrder();
                const byId = new Map(list.map((a: any) => [String(a.id), a]));
                // Yinelenen id aynı öğeyi iki kez eklemesin (React key çakışması).
                const seen = new Set<string>();
                const ordered: any[] = [];
                for (const id of orderIds) {
                    const key = String(id);
                    if (seen.has(key)) continue;
                    seen.add(key);
                    const item = byId.get(key);
                    if (item) ordered.push(item);
                }
                const remaining = list.filter((a: any) => !seen.has(String(a.id)));
                setOrderedAddresses([...ordered, ...remaining]);
            } catch {
                // Kayıtlı sıra okunamadı — sunucudan gelen listeyi olduğu gibi göster.
                setOrderedAddresses(list);
            }
        })();
    }, [addressesData]);

    const handleDeleteAddress = (id: string, title: string) => {
        Alert.alert('Rotayı Sil', `"${title}" rotasını silmek istediğinize emin misiniz?`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteAddress(id).unwrap();
                    } catch (e: any) {
                        Alert.alert('Hata', e?.data?.message || 'Rota silinemedi.');
                    }
                },
            },
        ]);
    };

    const handleReuse = (from: LocationData, to: LocationData) => {
        goToCreateLoadOrActiveMatching(router, () => {
            setFromLocation(from);
            setToLocation(to);
        });
    };

    const handleOrderChange = useCallback((ids: string[]) => {
        setOrderedAddresses((prev) => {
            const byId = new Map(prev.map((a: any) => [String(a.id), a]));
            const next = ids.map((id) => byId.get(id)).filter(Boolean) as any[];
            return next.length === prev.length ? next : prev;
        });
        setSavedRouteOrder(ids);
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Kayıtlı Adreslerim',
                    headerTitleStyle: { fontWeight: '800', fontSize: 18, color: '#111827' },
                    headerStyle: { backgroundColor: '#fff' },
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <Tappable onPress={() => router.back()} className="mr-3">
                            <Feather name="arrow-left" size={22} color="#374151" />
                        </Tappable>
                    ),
                }}
            />

            {isLoading ? (
                <View className="flex-1 items-center justify-center" style={{ marginTop: centerOffset }}>
                    <ActivityIndicator size="large" color="#FF5B04" />
                    <Text className="text-gray-400 mt-3 text-sm">Adresler yükleniyor...</Text>
                </View>
            ) : orderedAddresses.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8" style={{ marginTop: centerOffset }}>
                    <View className="w-20 h-20 bg-orange-50 rounded-3xl items-center justify-center mb-5">
                        <Feather name="map-pin" size={36} color="#FF5B04" />
                    </View>
                    <Text className="text-gray-800 text-lg font-bold text-center">Henüz Kayıtlı Rota Yok</Text>
                    <Text className="text-gray-400 text-sm text-center mt-2">
                        Sık kullandığınız nereden-nereye rotalarını kaydedin, gönderi oluştururken tek dokunuşla kullanın.
                    </Text>
                    <Tappable
                        className="mt-6 bg-primary px-8 py-3.5 rounded-2xl flex-row items-center"
                        onPress={() => router.push('/add-route')}
                        activeOpacity={0.8}
                        style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    >
                        <Feather name="plus" size={16} color="#fff" />
                        <Text className="text-white font-bold text-sm ml-2">Rota Ekle</Text>
                    </Tappable>
                </View>
            ) : (
                <View className="flex-1">
                    {!hasDragged && (
                        <View className="px-5 pt-5">
                            <Text className="text-gray-400 text-xs text-center mb-1">
                                Sırasını değiştirmek için bir karta basılı tutup sürükleyin
                            </Text>
                        </View>
                    )}

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <SortableList
                            items={orderedAddresses}
                            keyOf={(item: any) => String(item.id)}
                            onDragStart={handleDragStart}
                            onOrderChange={handleOrderChange}
                            renderRow={(item: any, isActive: boolean) => (
                                <RouteCard
                                    item={item}
                                    onDelete={() => handleDeleteAddress(item.id, item.title)}
                                    onReuse={handleReuse}
                                    isActive={isActive}
                                />
                            )}
                        />
                    </ScrollView>

                    <View className="px-5 pb-5">
                        <Tappable
                            className="border-2 border-dashed border-gray-200 rounded-2xl py-4 items-center flex-row justify-center bg-gray-50"
                            onPress={() => router.push('/add-route')}
                            activeOpacity={0.6}
                        >
                            <Feather name="plus-circle" size={18} color="#9CA3AF" />
                            <Text className="text-gray-400 font-semibold text-sm ml-2">Yeni Rota Ekle</Text>
                        </Tappable>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
