import { TICARIM_CATEGORIES, TicarimCategory } from '@/service/mockData';
import { useGetNotificationsQuery } from '@/service/notifications.service';
import { useGetListingsQuery } from '@/service/ticarim.service';
import { CATEGORY_KEY_TO_ID } from '@/utils/ticarim';
import { goToCreateLoadOrActiveMatching } from '@/store/feature/jobMatching/actions';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Linking, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const PRIMARY = '#FF5B04';
const CARD_W = W - 88;
const CARD_GAP = 12;

const formatPrice = (price: number) => `${(price ?? 0).toLocaleString('tr-TR')}TL`;

export default function TicarimNearbyMapScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();

    const { data } = useGetListingsQuery(
        category ? { categoryId: CATEGORY_KEY_TO_ID[category as TicarimCategory] } : undefined,
    );
    const listings: any[] = useMemo(() => {
        const raw: any[] = data || [];
        return [...raw].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }, [data]);

    const initialIndex = Math.max(0, listings.findIndex((l) => String(l.id) === String(id)));
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const mapRef = useRef<MapView>(null);
    const cardListRef = useRef<FlatList>(null);

    const { data: notificationsData } = useGetNotificationsQuery();
    const notificationCount = (() => {
        const raw = notificationsData?.data || notificationsData || [];
        return Array.isArray(raw) ? raw.length : 0;
    })();

    const active = listings[activeIndex];
    const categoryName = TICARIM_CATEGORIES.find((c) => c.key === (category as TicarimCategory))?.name;

    const focusListing = (index: number, animateMap = true) => {
        setActiveIndex(index);
        const item = listings[index];
        if (animateMap && item?.latitude != null && item?.longitude != null) {
            mapRef.current?.animateToRegion(
                { latitude: item.latitude, longitude: item.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 },
                400,
            );
        }
    };

    const onCardScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_GAP));
        focusListing(Math.max(0, Math.min(idx, listings.length - 1)));
    };

    const onMarkerPress = (index: number) => {
        focusListing(index);
        cardListRef.current?.scrollToOffset({ offset: index * (CARD_W + CARD_GAP), animated: true });
    };

    const openLocation = (item: any) => {
        if (item?.latitude == null || item?.longitude == null) return;
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`).catch(() => {});
    };

    const initialRegion = active?.latitude != null
        ? { latitude: active.latitude, longitude: active.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }
        : { latitude: 40.2168, longitude: 29.3417, latitudeDelta: 0.5, longitudeDelta: 0.5 };

    return (
        <View style={s.root}>
            <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} showsUserLocation={false}>
                {listings.map((item, i) =>
                    item.latitude != null && item.longitude != null ? (
                        <Marker
                            key={item.id}
                            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                            onPress={() => onMarkerPress(i)}
                        >
                            <View style={[s.pin, i === activeIndex && s.pinActive]}>
                                <Feather name="truck" size={13} color={i === activeIndex ? '#FFFFFF' : PRIMARY} />
                            </View>
                        </Marker>
                    ) : null,
                )}
            </MapView>

            <SafeAreaView style={s.topBar} edges={['top']}>
                <Tappable style={s.topBtn} activeOpacity={0.85} onPress={() => router.back()}>
                    <Feather name="chevron-left" size={20} color="#374151" />
                </Tappable>
                <View style={s.topActions}>
                    <Tappable style={s.topBtn} activeOpacity={0.85} onPress={() => router.push('/ticarim')}>
                        <Feather name="search" size={18} color={PRIMARY} />
                    </Tappable>
                    <Tappable style={s.topBtn} activeOpacity={0.85} onPress={() => router.push('/notifications')}>
                        <Feather name="bell" size={18} color={PRIMARY} />
                        {notificationCount > 0 && (
                            <View style={s.topBadge}>
                                <Text style={s.topBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                            </View>
                        )}
                    </Tappable>
                </View>
            </SafeAreaView>

            <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                <View style={s.sheetHeader}>
                    <Tappable onPress={() => router.push({ pathname: '/ticarim/results', params: { category: (category as string) || '' } })}>
                        <Text style={s.seeAll}>Tümünü Gör</Text>
                    </Tappable>
                </View>

                {listings.length === 0 ? (
                    <View style={s.emptyWrap}>
                        <Text style={s.emptyText}>
                            {categoryName ? `${categoryName} kategorisinde` : 'Bu kategoride'} yakınlarda ilan yok.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={cardListRef}
                        data={listings}
                        horizontal
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_W + CARD_GAP}
                        decelerationRate="fast"
                        initialScrollIndex={activeIndex}
                        getItemLayout={(_, index) => ({ length: CARD_W + CARD_GAP, offset: (CARD_W + CARD_GAP) * index, index })}
                        onMomentumScrollEnd={onCardScrollEnd}
                        contentContainerStyle={s.cardList}
                        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
                        renderItem={({ item }) => (
                            <Tappable
                                style={s.card}
                                activeOpacity={0.9}
                                onPress={() => router.push({ pathname: '/ticarim/[id]', params: { id: item.id } })}
                            >
                                <View style={s.cardImageWrap}>
                                    {!!item.photos?.[0] && (
                                        <Image source={{ uri: item.photos[0] }} style={s.cardImage} resizeMode="cover" />
                                    )}
                                    <View style={s.favBtn}>
                                        <Feather name="heart" size={15} color={PRIMARY} />
                                    </View>
                                </View>
                                <View style={s.cardBody}>
                                    <View style={s.cardTitleRow}>
                                        <Text style={s.cardPrice}>{formatPrice(item.price)}</Text>
                                    </View>
                                    <Text style={s.cardTitle} numberOfLines={2}>{item.description || item.title}</Text>
                                    <View style={s.chipsRow}>
                                        {!!item.fuel && (
                                            <View style={s.chip}>
                                                <Feather name="droplet" size={11} color={PRIMARY} />
                                                <Text style={s.chipText}>{item.fuel}</Text>
                                            </View>
                                        )}
                                        {!!item.conditionScore && (
                                            <View style={[s.chip, s.chipMuted]}>
                                                <Text style={[s.chipText, s.chipTextMuted]}>Durumu {item.conditionScore}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={s.locationRow}>
                                        <Text style={s.locationText} numberOfLines={1}>
                                            {item.location}
                                            {item.distanceKm != null ? `\nSize ${item.distanceKm} km uzakta` : ''}
                                        </Text>
                                        <Tappable style={s.locationBtn} onPress={() => openLocation(item)} hitSlop={6}>
                                            <Feather name="map-pin" size={13} color={PRIMARY} />
                                            <Text style={s.locationBtnText}>Konum</Text>
                                        </Tappable>
                                    </View>
                                </View>
                            </Tappable>
                        )}
                    />
                )}

                <View style={s.actionsRow}>
                    <Tappable style={s.actionBtn} activeOpacity={0.85} onPress={() => router.push('/ticarim')}>
                        <Feather name="briefcase" size={17} color="#FFFFFF" />
                        <Text style={s.actionText}>Ticarim</Text>
                    </Tappable>
                    <Tappable style={s.actionBtn} activeOpacity={0.85} onPress={() => goToCreateLoadOrActiveMatching(router)}>
                        <Feather name="box" size={17} color="#FFFFFF" />
                        <Text style={s.actionText}>Yük Oluştur</Text>
                    </Tappable>
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#EDEEF2' },

    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6,
        zIndex: 3,
    },
    topActions: { flexDirection: 'row', gap: 8 },
    topBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },
    topBadge: {
        position: 'absolute', top: 3, right: 3,
        minWidth: 14, height: 14, paddingHorizontal: 2, borderRadius: 7,
        backgroundColor: PRIMARY, borderWidth: 1.5, borderColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
    },
    topBadgeText: { fontSize: 8, color: '#FFFFFF', fontWeight: '800' },

    pin: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#FFFFFF',
        borderWidth: 2, borderColor: PRIMARY,
        alignItems: 'center', justifyContent: 'center',
    },
    pinActive: { backgroundColor: PRIMARY },

    sheet: {
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        paddingTop: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 10,
    },
    sheetHeader: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    seeAll: { fontSize: 13, fontWeight: '800', color: PRIMARY },

    emptyWrap: { paddingHorizontal: 20, paddingVertical: 24 },
    emptyText: { fontSize: 13, color: '#9CA3AF' },

    cardList: { paddingHorizontal: 20, paddingBottom: 4 },
    card: {
        width: CARD_W,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#F1F2F6',
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    cardImageWrap: { width: 110, backgroundColor: '#F5F6FC' },
    cardImage: { width: '100%', height: '100%' },
    favBtn: {
        position: 'absolute', top: 8, right: 8,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center', justifyContent: 'center',
    },
    cardBody: { flex: 1, padding: 12 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardPrice: { fontSize: 15, fontWeight: '800', color: '#16A34A' },
    cardTitle: { fontSize: 12.5, fontWeight: '600', color: '#374151', marginTop: 3, lineHeight: 16 },
    chipsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFF0E8', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
    },
    chipMuted: { backgroundColor: '#F9FAFB' },
    chipText: { fontSize: 10.5, fontWeight: '700', color: PRIMARY },
    chipTextMuted: { color: '#6B7280' },
    locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    locationText: { flex: 1, fontSize: 10.5, color: '#9CA3AF', fontWeight: '600', lineHeight: 14 },
    locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 6 },
    locationBtnText: { fontSize: 11, fontWeight: '700', color: PRIMARY },

    actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 14 },
    actionBtn: {
        flex: 1, height: 50, borderRadius: 14,
        backgroundColor: PRIMARY,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
