import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LoadErrorState from '@/components/LoadErrorState';
import ShipmentCard from '@/components/ShipmentCard';
import { useGetActiveOrdersQuery, type OrderDateFilter } from '@/service/orders.service';
import { useUserSession } from '@/store/feature/user/hooks';
import type { TransformedJob } from '@/types/shipment';
import { transformOrder } from '@/utils/shipments';

const PRIMARY = '#FF5B04';
const BG = '#F5F6FC';

const FILTER_CHIPS = [
    { key: 'tümü', label: 'Tümü' },
    { key: 'hemen', label: 'Hemen' },
    { key: 'randevulu', label: 'Randevulu' },
] as const;

const TIME_TABS = [
    { key: 'bugün', label: 'Bugün' },
    { key: 'bu-hafta', label: 'Bu Hafta' },
    { key: 'bu-ay', label: 'Bu Ay' },
] as const;

const TIME_TAB_TO_FILTER: Record<string, OrderDateFilter> = {
    'bugün': 'today',
    'bu-hafta': 'week',
    'bu-ay': 'month',
};

export default function ShipmentsScreen() {
    const router = useRouter();
    const { userId } = useUserSession() || {};
    const [selectedFilter, setSelectedFilter] = useState<string>('tümü');
    const [selectedTime, setSelectedTime] = useState<string>('bugün');
    const { data, error, isLoading, isFetching, refetch } = useGetActiveOrdersQuery(
        { userId: userId || '', filter: TIME_TAB_TO_FILTER[selectedTime] },
        { skip: !userId },
    );
    const showError = !!error && !data;
    const insets = useSafeAreaInsets();
    const historyNavLock = useRef(false);

    const [chipsHeight, setChipsHeight] = useState(60);
    const chipsHeightMeasured = useRef(false);
    const chipsProgress = useSharedValue(1);
    const chipsShown = useRef(true);
    const lastScrollY = useRef(0);
    const isDragging = useRef(false);

    const showChips = useCallback(() => {
        if (chipsShown.current) return;
        chipsShown.current = true;
        chipsProgress.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    }, []);

    const hideChips = useCallback(() => {
        if (!chipsShown.current) return;
        chipsShown.current = false;
        chipsProgress.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
    }, []);

    const handleChipsLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
        if (chipsHeightMeasured.current) return;
        const h = e.nativeEvent.layout.height;
        if (h > 10) {
            chipsHeightMeasured.current = true;
            setChipsHeight(h);
        }
    }, []);

    const handleScrollBeginDrag = useCallback(() => {
        isDragging.current = true;
    }, []);

    const handleMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        isDragging.current = false;
        if (e.nativeEvent.contentOffset.y <= 20) showChips();
    }, [showChips]);

    const handleScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (e.nativeEvent.contentOffset.y <= 20) showChips();
    }, [showChips]);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        if (y <= 4) {
            showChips();
            lastScrollY.current = y;
            return;
        }
        if (!isDragging.current) {
            lastScrollY.current = y;
            return;
        }
        const diff = y - lastScrollY.current;
        if (diff > 6) {
            hideChips();
        } else if (diff < -6) {
            showChips();
        }
        lastScrollY.current = y;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const chipsOpacityStyle = useAnimatedStyle(() => ({
        opacity: chipsProgress.value,
    }));

    const belowChipsStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(chipsProgress.value, [0, 1], [-chipsHeight, 0]) }],
    }), [chipsHeight]);

    const handleHistoryPress = useCallback(() => {
        if (historyNavLock.current) return;
        historyNavLock.current = true;
        router.push('/shipment-history');
        setTimeout(() => { historyNavLock.current = false; }, 1000);
    }, [router]);

    const jobs: TransformedJob[] = useMemo(() => {
        const raw = data || [];
        return Array.isArray(raw) ? raw.map(transformOrder) : [];
    }, [data]);

    const filteredJobs = useMemo(() => {
        if (selectedFilter === 'hemen') return jobs.filter(j => j.type === 'hemen');
        if (selectedFilter === 'randevulu') return jobs.filter(j => j.type === 'randevulu');
        return jobs;
    }, [jobs, selectedFilter]);

    const renderItem = useCallback(
        ({ item }: { item: TransformedJob }) => (
            <Link href={`/shipment/${item.id}`} asChild>
                <Tappable activeOpacity={0.9}>
                    <ShipmentCard item={item} />
                </Tappable>
            </Link>
        ),
        [],
    );

    const keyExtractor = useCallback((item: TransformedJob) => item.id?.toString(), []);

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerTitle}>İşlemlerim</Text>
                <Tappable
                    onPress={handleHistoryPress}
                    style={s.historyBtn}
                    activeOpacity={0.7}
                    hitSlop={8}
                >
                    <Feather name="clock" size={19} color={PRIMARY} />
                </Tappable>
            </View>

            {/* Filter Chips */}
            <Animated.View style={chipsOpacityStyle}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.chipsContainer}
                    style={s.chipsRow}
                    onLayout={handleChipsLayout}
                    keyboardShouldPersistTaps="handled"
                >
                    {FILTER_CHIPS.map(chip => {
                        const active = selectedFilter === chip.key;
                        return (
                            <Tappable
                                key={chip.key}
                                onPress={() => setSelectedFilter(chip.key)}
                                style={[s.chip, active ? s.chipActive : s.chipInactive]}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.chipText, active ? s.chipTextActive : s.chipTextInactive]}>
                                    {chip.label}
                                </Text>
                            </Tappable>
                        );
                    })}
                </ScrollView>
            </Animated.View>

            {/* Time Tabs + Content — slides up to close the gap chips leave behind */}
            <Animated.View style={[{ flex: 1 }, belowChipsStyle]}>
                <View style={s.timeTabs}>
                    {TIME_TABS.map(tab => {
                        const active = selectedTime === tab.key;
                        return (
                            <Tappable
                                key={tab.key}
                                onPress={() => setSelectedTime(tab.key)}
                                style={s.timeTab}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.timeTabText, active && s.timeTabTextActive]}>
                                    {tab.label}
                                </Text>
                                {active && <View style={s.timeTabUnderline} />}
                            </Tappable>
                        );
                    })}
                </View>

                {isLoading ? (
                    <View style={s.loadingContainer}>
                        <ActivityIndicator size="large" color={PRIMARY} />
                        <Text style={s.loadingText}>Gönderiler yükleniyor…</Text>
                    </View>
                ) : showError ? (
                    <LoadErrorState error={error} onRetry={refetch} retrying={isFetching} />
                ) : (
                    <FlashList
                        data={filteredJobs}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 100 }}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        onScrollBeginDrag={handleScrollBeginDrag}
                        onScrollEndDrag={handleScrollEndDrag}
                        onMomentumScrollEnd={handleMomentumScrollEnd}
                        refreshControl={
                            <RefreshControl
                                refreshing={isFetching && !isLoading}
                                onRefresh={refetch}
                                tintColor={PRIMARY}
                                colors={[PRIMARY]}
                            />
                        }
                        ListEmptyComponent={
                            <View style={s.emptyContainer}>
                                <Feather name="inbox" size={52} color="#CBD5E1" />
                                <Text style={s.emptyTitle}>Gönderi bulunamadı</Text>
                                <Text style={s.emptyDesc}>Bu filtrede kayıt yok</Text>
                            </View>
                        }
                    />
                )}
            </Animated.View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 14,
        backgroundColor: BG,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: PRIMARY,
    },
    historyBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F2F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },

    chipsRow: { flexGrow: 0, backgroundColor: BG },
    chipsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    chipActive: {
        backgroundColor: PRIMARY,
        borderColor: PRIMARY,
    },
    chipInactive: {
        backgroundColor: '#FFFFFF',
        borderColor: PRIMARY,
    },
    chipText: { fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: '#FFFFFF' },
    chipTextInactive: { color: PRIMARY },

    timeTabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 10,
        gap: 24,
        backgroundColor: BG,
    },
    timeTab: { alignItems: 'center' },
    timeTabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    timeTabTextActive: { color: PRIMARY },
    timeTabUnderline: {
        height: 2,
        backgroundColor: PRIMARY,
        borderRadius: 1,
        marginTop: 3,
        alignSelf: 'stretch',
    },

    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 13 },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 16 },
    emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
