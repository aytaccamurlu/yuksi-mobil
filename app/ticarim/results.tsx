import AnchoredMenu, { AnchoredMenuItem } from '@/components/AnchoredMenu';
import AnimatedCount from '@/components/AnimatedCount';
import RemoteImage from '@/components/RemoteImage';
import Skeleton from '@/components/Skeleton';
import TicarimFilterSheet, { DEFAULT_TICARIM_FILTERS, TicarimFilters } from '@/components/TicarimFilterSheet';
import { TICARIM_CATEGORIES, TicarimCategory } from '@/service/mockData';
import {
    useGetFavoriteListingIdsQuery,
    useSearchListingsInfiniteQuery,
    useToggleFavoriteListingMutation,
} from '@/service/ticarim.service';
import { CATEGORY_KEY_TO_ID, conditionToApi } from '@/utils/ticarim';
import { useGuardedPress } from '@/hooks/useGuardedPress';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
    const rounded = Math.round(rating);
    return (
        <View className="flex-row">
            {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons key={i} name={i <= rounded ? 'star' : 'star-outline'} size={size} color="#FF5B04" />
            ))}
        </View>
    );
}

const formatListingDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

const ListingListCard = React.memo(function ListingListCard({
    item,
    onPress,
    onLongPress,
}: {
    item: any;
    onPress: (item: any) => void;
    onLongPress: (item: any, e: any) => void;
}) {
    return (
        <Tappable
            onPress={() => onPress(item)}
            onLongPress={(e) => onLongPress(item, e)}
            delayLongPress={350}
            activeOpacity={0.8}
            className="bg-white rounded-3xl mb-4 flex-row overflow-hidden border border-gray-100"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
            }}
        >
            <RemoteImage uri={item.photos?.[0] || ''} style={{ width: 110, height: 130 }} resizeMode="cover" />
            <View className="flex-1 p-3">
                <Text className="text-gray-900 font-bold text-[15px]" numberOfLines={1}>
                    {item.title}
                </Text>
                <View className="flex-row items-center mt-1.5">
                    <Feather name="map-pin" size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-[12px] ml-1">{item.location}</Text>
                </View>
                <View className="flex-row items-center mt-1.5">
                    <Stars rating={item.rating} />
                    <Text className="text-gray-400 text-[12px] ml-1.5">({item.reviewCount})</Text>
                </View>
                <View className="flex-row items-center mt-2">
                    {item.verified && (
                        <View className="w-4 h-4 bg-green-500 rounded-full items-center justify-center mr-1.5">
                            <Feather name="check" size={10} color="#fff" />
                        </View>
                    )}
                    <Text className="text-gray-400 text-[11px]">{formatListingDate(item.createdAt)}</Text>
                </View>
            </View>
        </Tappable>
    );
});

const ListingGridCard = React.memo(function ListingGridCard({
    item,
    onPress,
    onLongPress,
}: {
    item: any;
    onPress: (item: any) => void;
    onLongPress: (item: any, e: any) => void;
}) {
    return (
        <Tappable
            onPress={() => onPress(item)}
            onLongPress={(e) => onLongPress(item, e)}
            delayLongPress={350}
            activeOpacity={0.8}
            style={{ width: '48%' }}
            className="bg-white rounded-3xl mb-4 overflow-hidden border border-gray-100"
        >
            <View>
                <RemoteImage uri={item.photos?.[0] || ''} style={{ width: '100%', height: 120 }} resizeMode="cover" />
                {item.verified && (
                    <View className="absolute bottom-2 left-2 w-5 h-5 bg-green-500 rounded-full items-center justify-center">
                        <Feather name="check" size={11} color="#fff" />
                    </View>
                )}
            </View>
            <View className="p-2.5">
                <Text numberOfLines={1} className="text-gray-900 font-bold text-[13px]">
                    {item.title}
                </Text>
                <View className="flex-row items-center mt-1">
                    <Feather name="map-pin" size={10} color="#9CA3AF" />
                    <Text numberOfLines={1} className="text-gray-400 text-[11px] ml-1 flex-1">
                        {item.location}
                    </Text>
                </View>
                <View className="flex-row items-center mt-1.5">
                    <Stars rating={item.rating} size={10} />
                    <Text className="text-gray-400 text-[10px] ml-1">({item.reviewCount})</Text>
                </View>
            </View>
        </Tappable>
    );
});

function ListingListCardSkeleton() {
    return (
        <View className="bg-white rounded-3xl mb-4 flex-row overflow-hidden border border-gray-100">
            <Skeleton style={{ width: 110, height: 130 }} />
            <View className="flex-1 p-3">
                <Skeleton style={{ width: '70%', height: 15, borderRadius: 4 }} />
                <Skeleton style={{ width: '45%', height: 12, borderRadius: 4, marginTop: 10 }} />
                <Skeleton style={{ width: '35%', height: 12, borderRadius: 4, marginTop: 8 }} />
            </View>
        </View>
    );
}

function ListingGridCardSkeleton() {
    return (
        <View style={{ width: '48%' }} className="bg-white rounded-3xl mb-4 overflow-hidden border border-gray-100">
            <Skeleton style={{ width: '100%', height: 120 }} />
            <View className="p-2.5">
                <Skeleton style={{ width: '80%', height: 13, borderRadius: 4 }} />
                <Skeleton style={{ width: '55%', height: 11, borderRadius: 4, marginTop: 8 }} />
                <Skeleton style={{ width: '40%', height: 10, borderRadius: 4, marginTop: 6 }} />
            </View>
        </View>
    );
}

export default function TicarimResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ category?: string; q?: string; filters?: string }>();
    const [query, setQuery] = useState(params.q || '');
    const [view, setView] = useState<'list' | 'grid'>('list');
    const [filterVisible, setFilterVisible] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
    const [menuItem, setMenuItem] = useState<any>(null);
    const [filters, setFilters] = useState<TicarimFilters>(() => {
        if (params.filters) {
            try {
                return { ...DEFAULT_TICARIM_FILTERS, ...JSON.parse(params.filters) };
            } catch {
                // yoksay
            }
        }
        return DEFAULT_TICARIM_FILTERS;
    });

    const priceChanged =
        filters.priceRange[0] !== DEFAULT_TICARIM_FILTERS.priceRange[0] ||
        filters.priceRange[1] !== DEFAULT_TICARIM_FILTERS.priceRange[1];
    const kmBucket = useMemo(
        () =>
            filters.kmBucket === '0 - 5.000'
                ? { min: 0, max: 5000 }
                : filters.kmBucket === '5.000 - 50.000'
                    ? { min: 5000, max: 50000 }
                    : null,
        [filters.kmBucket],
    );

    const searchArgs = useMemo(
        () => ({
            categoryId: params.category ? CATEGORY_KEY_TO_ID[params.category as TicarimCategory] : undefined,
            q: params.q,
            priceMin: priceChanged ? filters.priceRange[0] : undefined,
            priceMax: priceChanged ? filters.priceRange[1] : undefined,
            kmMin: kmBucket?.min,
            kmMax: kmBucket?.max,
            vehicleCondition: filters.condition ? conditionToApi(filters.condition) : undefined,
        }),
        [params.category, params.q, priceChanged, filters.priceRange, kmBucket, filters.condition],
    );

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useSearchListingsInfiniteQuery(searchArgs);
    const { data: favData } = useGetFavoriteListingIdsQuery();
    const [toggleFavorite] = useToggleFavoriteListingMutation();

    const favoriteIdSet = useMemo(() => {
        const raw: any[] = favData?.listing_ids || [];
        return new Set(raw.map((id) => String(id)));
    }, [favData]);
    const isFavorite = (id: string) => favoriteIdSet.has(String(id));

    const allListings = useMemo(() => {
        const pages = data?.pages ?? [];
        if (pages.length === 1) return pages[0].items;
        const seen = new Set<string>();
        const out: any[] = [];
        for (const page of pages) {
            for (const item of page.items) {
                const key = String(item.id);
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(item);
            }
        }
        return out;
    }, [data]);
    const categoryName = useMemo(
        () => TICARIM_CATEGORIES.find((c) => c.key === (params.category as TicarimCategory))?.name,
        [params.category],
    );

    const filtersActive =
        priceChanged ||
        filters.distanceRange[0] !== DEFAULT_TICARIM_FILTERS.distanceRange[0] ||
        filters.distanceRange[1] !== DEFAULT_TICARIM_FILTERS.distanceRange[1] ||
        !!filters.condition ||
        filters.brands.length > 0 ||
        !!filters.kmBucket ||
        filters.favoritesOnly;

    const localFiltersActive =
        filters.distanceRange[0] !== DEFAULT_TICARIM_FILTERS.distanceRange[0] ||
        filters.distanceRange[1] !== DEFAULT_TICARIM_FILTERS.distanceRange[1] ||
        filters.brands.length > 0 ||
        filters.favoritesOnly;

    const listings = useMemo(() => {
        if (!localFiltersActive) return allListings;
        const brands = filters.brands.map((b) => b.toLowerCase());
        return allListings.filter((item: any) => {
            if (filters.favoritesOnly && !favoriteIdSet.has(String(item.id))) return false;
            if (
                item.distanceKm != null &&
                (item.distanceKm < filters.distanceRange[0] || item.distanceKm > filters.distanceRange[1])
            )
                return false;
            if (brands.length > 0 && !brands.includes((item.brand || '').toLowerCase())) return false;
            return true;
        });
    }, [allListings, filters.brands, filters.distanceRange, filters.favoritesOnly, localFiltersActive, favoriteIdSet]);

    const handleSearch = useGuardedPress(() => {
        router.setParams({ q: query.trim() });
    });

    const showListingOptions = useCallback((item: any, e: any) => {
        setMenuItem(item);
        setMenuAnchor({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
    }, []);

    const openListing = useCallback(
        (item: any) => router.push({ pathname: '/ticarim/[id]', params: { id: String(item.id) } }),
        [router],
    );
    const keyExtractor = useCallback((item: any) => String(item.id), []);
    const renderListItem = useCallback(
        ({ item }: { item: any }) => (
            <ListingListCard item={item} onPress={openListing} onLongPress={showListingOptions} />
        ),
        [openListing, showListingOptions],
    );
    const renderGridItem = useCallback(
        ({ item }: { item: any }) => (
            <ListingGridCard item={item} onPress={openListing} onLongPress={showListingOptions} />
        ),
        [openListing, showListingOptions],
    );
    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
    const listFooter = useMemo(
        () =>
            isFetchingNextPage ? (
                <View className="py-4 items-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : null,
        [isFetchingNextPage],
    );

    const menuItems: AnchoredMenuItem[] = menuItem
        ? [
              {
                  key: 'favorite',
                  label: isFavorite(menuItem.id) ? 'Favorilerden Çıkar' : 'Favorilere Ekle',
                  icon: 'heart',
                  onPress: () => toggleFavorite(menuItem.id),
              },
              {
                  key: 'search-model',
                  label: 'Bu Model ile Ara',
                  icon: 'search',
                  onPress: () =>
                      router.push({ pathname: '/ticarim/results', params: { q: menuItem.model || menuItem.title } }),
              },
          ]
        : [];

    return (
        <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
            <View className="bg-primary px-5 pt-4 pb-4">
                <View className="flex-row items-center">
                    <Tappable
                        onPress={() => router.back()}
                        className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center mr-3"
                    >
                        <Feather name="chevron-left" size={22} color="#fff" />
                    </Tappable>
                    <View className="flex-1 flex-row items-center bg-white rounded-2xl px-4 h-12 mr-2">
                        <Feather name="search" size={18} color="#9CA3AF" />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={handleSearch}
                            placeholder={categoryName ? `${categoryName} ara...` : 'Araç, marka ara...'}
                            placeholderTextColor="#9CA3AF"
                            returnKeyType="search"
                            className="flex-1 ml-2 text-[14px] text-gray-800"
                        />
                    </View>
                    <Tappable className="w-11 h-11 bg-white rounded-2xl items-center justify-center mr-2" activeOpacity={0.7}>
                        <Feather name="map-pin" size={17} color="#FF5B04" />
                    </Tappable>
                    <Tappable
                        onPress={() => setFilterVisible(true)}
                        className="w-11 h-11 bg-white rounded-2xl items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <Feather name="sliders" size={17} color="#FF5B04" />
                        {filtersActive && (
                            <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border border-white" />
                        )}
                    </Tappable>
                </View>
            </View>

            <View className="flex-1 bg-gray-50">
                <View className="flex-row items-center justify-between px-5 py-4">
                    <AnimatedCount
                        value={listings.length}
                        loading={isLoading}
                        suffix=" Sonuç"
                        className="text-gray-900 text-[15px] font-bold"
                    />
                    <View className="flex-row items-center">
                        <Tappable onPress={() => setView('list')} className="p-1.5 mr-1">
                            <Feather name="list" size={18} color={view === 'list' ? '#FF5B04' : '#D1D5DB'} />
                        </Tappable>
                        <Tappable onPress={() => setView('grid')} className="p-1.5">
                            <Feather name="grid" size={18} color={view === 'grid' ? '#FF5B04' : '#D1D5DB'} />
                        </Tappable>
                    </View>
                </View>

                {isLoading ? (
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                        {view === 'list' ? (
                            [0, 1, 2, 3].map((i) => <ListingListCardSkeleton key={i} />)
                        ) : (
                            <View className="flex-row flex-wrap justify-between">
                                {[0, 1, 2, 3].map((i) => (
                                    <ListingGridCardSkeleton key={i} />
                                ))}
                            </View>
                        )}
                    </ScrollView>
                ) : listings.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <View className="w-20 h-20 bg-orange-50 rounded-3xl items-center justify-center mb-5">
                            <Feather name="search" size={32} color="#FF5B04" />
                        </View>
                        <Text className="text-gray-800 text-lg font-bold text-center">Sonuç Bulunamadı</Text>
                        <Text className="text-gray-400 text-sm text-center mt-2">
                            Farklı bir arama veya kategori deneyebilirsin.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        key={view}
                        data={listings}
                        keyExtractor={keyExtractor}
                        renderItem={view === 'list' ? renderListItem : renderGridItem}
                        numColumns={view === 'grid' ? 2 : 1}
                        columnWrapperStyle={view === 'grid' ? { justifyContent: 'space-between' } : undefined}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                        initialNumToRender={8}
                        maxToRenderPerBatch={8}
                        windowSize={7}
                        removeClippedSubviews
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.6}
                        ListFooterComponent={listFooter}
                    />
                )}
            </View>

            <TicarimFilterSheet
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                filters={filters}
                onApply={setFilters}
            />

            <AnchoredMenu
                visible={!!menuAnchor}
                anchor={menuAnchor}
                items={menuItems}
                onClose={() => setMenuAnchor(null)}
            />
        </SafeAreaView>
    );
}
