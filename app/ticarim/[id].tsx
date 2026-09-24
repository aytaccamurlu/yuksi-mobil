import AnchoredMenu from '@/components/AnchoredMenu';
import LoadErrorState, { isConnectivityError } from '@/components/LoadErrorState';
import TicarimImageViewer from '@/components/TicarimImageViewer';
import { TICARIM_CATEGORIES, TicarimCategory } from '@/service/mockData';
import {
    useGetFavoriteListingIdsQuery,
    useGetListingByIdQuery,
    useToggleFavoriteListingMutation,
} from '@/service/ticarim.service';
import { useCreateConversationMutation } from '@/service/messages.service';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import Tappable from '@/components/Tappable';
import { useUserSession } from '@/store/feature/user/hooks';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_H = 300;
const HEADER_CONTENT_H = 46;

const formatPrice = (price: number) => `${price.toLocaleString('tr-TR')}TL`;

const FUEL_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Benzin: 'gas-station',
    Dizel: 'gas-station',
    LPG: 'gas-cylinder',
    Elektrik: 'flash',
    Hibrit: 'leaf',
};

const DETAIL_FIELDS = (item: any) => [
    { label: 'İlan Tarihi', value: item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : null },
    { label: 'Marka', value: item.brand },
    { label: 'Model', value: item.model },
    { label: 'Tipi', value: item.type },
    { label: 'Yıl', value: item.year },
    { label: 'Araç Durumu', value: item.condition },
    { label: 'KM', value: item.km != null ? item.km.toLocaleString('tr-TR') : null },
    { label: 'Motor Hacmi', value: item.engineCc },
].filter((f) => f.value != null && f.value !== '');

// description'a pipe'lanan "Etiket: değer" alanları burada geri ayıklanır.
const DESCRIPTION_EXTRA_LABELS = [
    'Motor Hacmi', 'Zamanlama Tipi', 'Silindir Sayısı', 'Vites', 'Soğutma',
    'Renk', 'Menşei', 'Plaka/Uyruk', 'Kimden', 'Takas', 'Güvenlik', 'Aksesuar',
];

const splitDescription = (raw: string) => {
    const text: string[] = [];
    const extras: { label: string; value: string }[] = [];
    raw.split(' | ').forEach((segment) => {
        const label = DESCRIPTION_EXTRA_LABELS.find((l) => segment.startsWith(`${l}: `));
        if (label) extras.push({ label, value: segment.slice(label.length + 2) });
        else if (segment.trim()) text.push(segment);
    });
    return { text: text.join(' | '), extras };
};

export default function TicarimListingDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data, isLoading, error, isFetching, refetch } = useGetListingByIdQuery(id);
    const { data: favData } = useGetFavoriteListingIdsQuery();
    const [toggleFavorite] = useToggleFavoriteListingMutation();
    const [createConversation] = useCreateConversationMutation();
    const [descExpanded, setDescExpanded] = useState(false);
    const [activePhoto, setActivePhoto] = useState(0);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
    const photoScrollRef = useRef<ScrollView>(null);
    const draggingRef = useRef(false);
    const insets = useSafeAreaInsets();
    const headerH = insets.top + HEADER_CONTENT_H;

    const pageScrollY = useSharedValue(0);
    const onPageScroll = useAnimatedScrollHandler({
        onScroll: (e) => { pageScrollY.value = e.contentOffset.y; },
    });
    const headerFade: [number, number] = [PHOTO_H - 90, PHOTO_H - 30];
    const headerBgStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pageScrollY.value, headerFade, [0, 1], Extrapolation.CLAMP),
    }));
    const headerOnPhotoStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pageScrollY.value, headerFade, [1, 0], Extrapolation.CLAMP),
    }));
    const headerOnPageStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pageScrollY.value, headerFade, [0, 1], Extrapolation.CLAMP),
    }));

    const userSession = useUserSession();
    const item = data?.data || data;
    const photos: string[] = item?.photos || [];
    const isOwnListing = !!item?.ownerId && String(item.ownerId) === String(userSession?.userId);

    const favoriteIds: string[] = favData?.listing_ids || [];
    const isFavorite = item ? favoriteIds.includes(String(item.id)) : false;

    const searchByModel = () => {
        if (!item) return;
        router.push({ pathname: '/ticarim/results', params: { q: item.model || item.title } });
    };

    const goToReport = () => {
        if (!item) return;
        router.push({
            pathname: '/ticarim/report',
            params: {
                id: item.id,
                title: item.title,
                photo: photos[0] || '',
                price: formatPrice(item.price),
            },
        });
    };

    const menuItems = item
        ? [
              {
                  key: 'favorite',
                  label: isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle',
                  icon: 'heart' as const,
                  onPress: () => toggleFavorite(item.id),
              },
              {
                  key: 'search-model',
                  label: 'Bu Model ile Ara',
                  icon: 'search' as const,
                  onPress: searchByModel,
              },
              {
                  key: 'report',
                  label: 'İlanı Bildir',
                  icon: 'alert-circle' as const,
                  danger: true,
                  onPress: goToReport,
              },
          ]
        : [];

    const handleShare = () => {
        if (!item) return;
        const url = Linking.createURL(`/ticarim/${item.id}`);
        Share.share({
            message: `${item.title} - ${formatPrice(item.price)}\n${url}`,
            url,
            title: item.title,
        }).catch(() => {});
    };

    useEffect(() => {
        if (photos.length <= 1) return;
        const timer = setInterval(() => {
            if (draggingRef.current) return;
            setActivePhoto((prev) => {
                const next = (prev + 1) % photos.length;
                photoScrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
                return next;
            });
        }, 3500);
        return () => clearInterval(timer);
    }, [photos.length]);

    const sellerName = item?.ownerName || item?.title || 'Satıcı';

    const openConversation = async (pathname: '/call/[id]' | '/messages/[id]') => {
        if (!item) return;
        if (!item.ownerId) {
            router.push({ pathname, params: { id: `conv-listing-${item.id}`, name: sellerName, avatar: '' } });
            return;
        }
        try {
            const conv = await createConversation({ otherUserId: item.ownerId }).unwrap();
            const convo = conv?.data || conv;
            router.push({ pathname, params: { id: convo.id, name: sellerName, avatar: '' } });
        } catch (e) {
            Alert.alert(
                'Hata',
                isConnectivityError(e) ? 'İnternet bağlantınızı kontrol edip tekrar deneyin.' : 'Sohbet başlatılamadı, lütfen tekrar dene.',
            );
        }
    };

    const handleCall = () => openConversation('/call/[id]');
    const handleMessage = () => openConversation('/messages/[id]');

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
                <ActivityIndicator size="large" color="#FF5B04" />
            </SafeAreaView>
        );
    }

    if (!item && error) {
        return (
            <SafeAreaView className="flex-1 bg-white" edges={['top']}>
                <LoadErrorState error={error} onRetry={refetch} retrying={isFetching} />
            </SafeAreaView>
        );
    }

    if (!item) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center px-8" edges={['top']}>
                <Text className="text-gray-800 text-lg font-bold text-center">İlan Bulunamadı</Text>
                <Tappable onPress={() => router.back()} className="mt-5 bg-primary px-6 py-3 rounded-2xl">
                    <Text className="text-white font-bold">Geri Dön</Text>
                </Tappable>
            </SafeAreaView>
        );
    }

    const { text: description, extras: descExtras } = splitDescription(String(item.description || ''));
    const truncated = description.length > 120 && !descExpanded ? `${description.slice(0, 120)}…` : description;

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <View pointerEvents="box-none" style={[s.stickyHeader, { height: headerH, paddingTop: insets.top }]}>
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }, headerBgStyle]} />
                <View className="flex-row items-center justify-between px-4" style={{ height: HEADER_CONTENT_H }}>
                    <Tappable onPress={() => router.back()} className="w-9 h-9 rounded-full items-center justify-center">
                        <Animated.View style={[s.headerIconLayer, headerOnPhotoStyle]}>
                            <View className="w-9 h-9 bg-black/40 rounded-full items-center justify-center">
                                <Feather name="arrow-left" size={18} color="#fff" />
                            </View>
                        </Animated.View>
                        <Animated.View style={[s.headerIconLayer, headerOnPageStyle]}>
                            <Feather name="arrow-left" size={20} color="#111827" />
                        </Animated.View>
                    </Tappable>
                    <View className="flex-row">
                        <Tappable onPress={handleShare} className="w-9 h-9 rounded-full items-center justify-center mr-2">
                            <Animated.View style={[s.headerIconLayer, headerOnPhotoStyle]}>
                                <View className="w-9 h-9 bg-black/40 rounded-full items-center justify-center">
                                    <Feather name="share-2" size={16} color="#fff" />
                                </View>
                            </Animated.View>
                            <Animated.View style={[s.headerIconLayer, headerOnPageStyle]}>
                                <Feather name="share-2" size={18} color="#111827" />
                            </Animated.View>
                        </Tappable>
                        <Tappable
                            onPress={(e) => setMenuAnchor({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                            className="w-9 h-9 rounded-full items-center justify-center"
                        >
                            <Animated.View style={[s.headerIconLayer, headerOnPhotoStyle]}>
                                <View className="w-9 h-9 bg-black/40 rounded-full items-center justify-center">
                                    <Feather name="more-vertical" size={16} color="#fff" />
                                </View>
                            </Animated.View>
                            <Animated.View style={[s.headerIconLayer, headerOnPageStyle]}>
                                <Feather name="more-vertical" size={18} color="#111827" />
                            </Animated.View>
                        </Tappable>
                    </View>
                </View>
            </View>

            <Animated.ScrollView showsVerticalScrollIndicator={false} bounces={false} onScroll={onPageScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
                <View style={{ height: 300 }}>
                    <ScrollView
                        ref={photoScrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScrollBeginDrag={() => { draggingRef.current = true; }}
                        onScrollEndDrag={() => { draggingRef.current = false; }}
                        onMomentumScrollEnd={(e) => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
                        keyboardShouldPersistTaps="handled"
                    >
                        {(photos.length ? photos : [null]).map((uri: string | null, i: number) => (
                            <Tappable
                                key={i}
                                activeOpacity={0.95}
                                disabled={!uri}
                                onPress={() => setViewerVisible(true)}
                                style={{ width: SCREEN_W, height: 300, backgroundColor: '#F3F4F6' }}
                            >
                                {uri && <Image source={{ uri }} style={{ width: SCREEN_W, height: 300 }} resizeMode="cover" />}
                            </Tappable>
                        ))}
                    </ScrollView>

                    {photos.length > 1 && (
                        <View className="absolute bottom-3 w-full flex-row justify-center">
                            {photos.map((_: string, i: number) => (
                                <View
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full mx-0.5 ${i === activePhoto ? 'bg-white' : 'bg-white/40'}`}
                                />
                            ))}
                        </View>
                    )}
                </View>

                <View className="bg-white rounded-t-3xl -mt-5 px-5 pt-5">
                    <Text className="text-gray-900 text-xl font-bold">{item.title}</Text>

                    <View className="flex-row items-stretch mt-3" style={{ gap: 10 }}>
                        <View style={{ width: 116 }}>
                            <View className="border border-gray-100 rounded-2xl px-3 flex-1" style={{ paddingTop: item.fuel ? 30 : 12, paddingBottom: 12 }}>
                                {!!(item.conditionScore || item.condition) && (
                                    <Text className="text-primary text-[13px] font-bold">
                                        {item.conditionScore ? `Durumu ${item.conditionScore}` : item.condition}
                                    </Text>
                                )}
                            </View>
                            {!!item.fuel && (
                                <LinearGradient
                                    colors={['#FFFFFF', '#FFFFFF', '#FF5B04']}
                                    locations={[0, 0.3, 0.8]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{
                                        position: 'absolute',
                                        top: -2,
                                        left: 0,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderRadius: 4,
                                        paddingLeft: 12,
                                        paddingRight: 20,
                                        paddingVertical: 6,
                                    }}
                                >
                                    <MaterialCommunityIcons name={FUEL_ICONS[item.fuel] || 'gas-station'} size={15} color="#FF5B04" />
                                    <Text
                                        className="text-white text-[12px] ml-3"
                                        style={{ fontWeight: '800', transform: [{ translateX: 9 }] }}
                                    >
                                        {item.fuel}
                                    </Text>
                                </LinearGradient>
                            )}
                        </View>

                        <Tappable
                            onPress={() => router.push({ pathname: '/ticarim/map/[id]', params: { id: String(id), category: item.category } })}
                            activeOpacity={0.85}
                            className="flex-1 border border-gray-100 rounded-2xl flex-row items-stretch overflow-hidden"
                        >
                            <View className="flex-1 justify-center px-4 py-3">
                                <Text className="text-primary text-[15px] font-bold" numberOfLines={1}>{item.location}</Text>
                                {item.distanceKm != null && (
                                    <View className="flex-row items-center mt-2">
                                        <Feather name="navigation" size={12} color="#9CA3AF" />
                                        <Text className="text-gray-400 text-[12px] ml-1.5">Size {item.distanceKm} km uzakta</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ width: 76, overflow: 'hidden' }}>
                                <MapView
                                    style={{ position: 'absolute', top: -20, left: -90, right: -20, bottom: -50 }}
                                    pointerEvents="none"
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                    rotateEnabled={false}
                                    pitchEnabled={false}
                                    initialRegion={{
                                        latitude: item.latitude ?? 41.0082,
                                        longitude: item.longitude ?? 28.9784,
                                        latitudeDelta: 0.05,
                                        longitudeDelta: 0.05,
                                    }}
                                />
                                <View
                                    style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                    }}
                                />
                                <View className="flex-1 items-center justify-center">
                                    <Feather name="map-pin" size={20} color="#FF5B04" />
                                    <Text className="text-primary text-[11px] mt-1" style={{ fontWeight: '800' }}>Konum</Text>
                                </View>
                            </View>
                        </Tappable>
                    </View>

                    <View className="flex-row items-center mt-3">
                        <Tappable
                            onPress={searchByModel}
                            activeOpacity={0.7}
                            className="flex-1 flex-row items-center bg-white border border-gray-100 rounded-full px-4 py-2.5"
                        >
                            <Text className="text-gray-500 text-[12px]" numberOfLines={1}>
                                Vasıta/{TICARIM_CATEGORIES.find((c) => c.key === (item.category as TicarimCategory))?.name || item.category}/{item.brand}/{item.model}
                            </Text>
                            <Feather name="chevron-right" size={14} color="#D1D5DB" style={{ marginLeft: 'auto' }} />
                        </Tappable>
                    </View>

                    <View className="mt-6">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-gray-900 text-[15px] font-bold">Açıklama</Text>
                            {description.length > 120 && (
                                <Tappable onPress={() => setDescExpanded((v) => !v)}>
                                    <View className="flex-row items-center">
                                        <Text className="text-primary text-[13px] font-semibold mr-1">
                                            {descExpanded ? 'Daha az' : 'Daha fazla'}
                                        </Text>
                                        <Feather name="chevron-right" size={14} color="#FF5B04" />
                                    </View>
                                </Tappable>
                            )}
                        </View>

                        <Text className="text-gray-600 text-[14px] leading-6">{truncated}</Text>

                        <View className="mt-4">
                            {[...DETAIL_FIELDS(item), ...descExtras].map((f) => (
                                <View key={f.label} className="flex-row py-1.5 border-b border-gray-50">
                                    <Text className="text-gray-400 text-[13px] w-32">{f.label}</Text>
                                    <Text className="text-gray-800 text-[13px] font-semibold flex-1">{f.value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={{ height: 120 }} />
                </View>
            </Animated.ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-3 pb-8 flex-row items-center justify-between"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <Text className="text-gray-900 text-2xl font-extrabold">{formatPrice(item.price)}</Text>
                {!isOwnListing && (
                    <View className="flex-row items-center">
                        <Tappable
                            onPress={handleMessage}
                            className="flex-row items-center border-2 border-primary rounded-full px-4 py-2.5 mr-2.5"
                            activeOpacity={0.7}
                        >
                            <Feather name="message-circle" size={15} color="#FF5B04" />
                            <Text className="text-primary text-[13px] font-bold ml-1.5">Mesaj</Text>
                        </Tappable>
                        <Tappable
                            onPress={handleCall}
                            className="flex-row items-center bg-primary rounded-full px-4 py-2.5"
                            activeOpacity={0.85}
                        >
                            <Feather name="phone" size={15} color="#fff" />
                            <Text className="text-white text-[13px] font-bold ml-1.5">Ara</Text>
                        </Tappable>
                    </View>
                )}
            </View>

            <TicarimImageViewer
                images={photos}
                startIndex={activePhoto}
                visible={viewerVisible}
                onClose={() => setViewerVisible(false)}
            />

            <AnchoredMenu visible={!!menuAnchor} anchor={menuAnchor} items={menuItems} onClose={() => setMenuAnchor(null)} />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    stickyHeader: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        overflow: 'hidden',
    },
    headerIconLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
