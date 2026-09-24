import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import DateRangeFilterModal, { DateRange, formatRange } from '@/components/DateRangeFilterModal';
import LoadErrorState from '@/components/LoadErrorState';
import ShipmentHistoryCard from '@/components/ShipmentHistoryCard';
import { useGetCompletedOrdersInfiniteQuery } from '@/service/orders.service';
import { useUserSession } from '@/store/feature/user/hooks';
import type { TransformedJob } from '@/types/shipment';
import { transformOrder } from '@/utils/shipments';

const PRIMARY = '#FF5B04';
const BG = '#F5F6FC';

const FILTER_CHIPS = [
    { key: 'tümü', label: 'Tümü' },
    { key: 'hemen', label: 'Hemen' },
    { key: 'randevulu', label: 'Randevulu' },
    { key: 'tamamlandı', label: 'Tamamlandı' },
    { key: 'başarısız', label: 'Başarısız' },
] as const;

const capitalize = (str: string) => str.charAt(0).toLocaleUpperCase('tr-TR') + str.slice(1);

const monthLabel = (iso: string) => {
    if (!iso) return 'Tarih Belirsiz';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Tarih Belirsiz';
    return capitalize(d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }));
};

type Row =
    | { type: 'header'; key: string; label: string }
    | { type: 'job'; key: string; job: TransformedJob };

export default function ShipmentHistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { userId } = useUserSession() || {};
    const { data, error, isLoading, isFetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useGetCompletedOrdersInfiniteQuery({ userId: userId || '' }, { skip: !userId });
    const showError = !!error && !data;

    const [selectedFilter, setSelectedFilter] = useState<string>('tümü');
    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
    const [rangeModalOpen, setRangeModalOpen] = useState(false);
    const rangeActive = !!dateRange.start && !!dateRange.end;

    const jobs: TransformedJob[] = useMemo(() => {
        const pages = data?.pages ?? [];
        const seen = new Set<string>();
        const out: TransformedJob[] = [];
        for (const page of pages) {
            for (const order of page.data) {
                if (seen.has(order.id)) continue;
                seen.add(order.id);
                out.push(transformOrder(order));
            }
        }
        return out;
    }, [data]);

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const filteredJobs = useMemo(() => {
        let result = jobs;
        if (selectedFilter === 'hemen') result = result.filter(j => j.type === 'hemen');
        else if (selectedFilter === 'randevulu') result = result.filter(j => j.type === 'randevulu');
        else if (selectedFilter === 'tamamlandı') result = result.filter(j => j.status === 'tamamlandı');
        else if (selectedFilter === 'başarısız') result = result.filter(j => j.status === 'iptal');

        if (dateRange.start && dateRange.end) {
            const startIdx = dateRange.start.year * 12 + dateRange.start.month;
            const endIdx = dateRange.end.year * 12 + dateRange.end.month;
            result = result.filter((j) => {
                if (!j.createdAt) return false;
                const d = new Date(j.createdAt);
                if (Number.isNaN(d.getTime())) return false;
                const idx = d.getFullYear() * 12 + d.getMonth();
                return idx >= startIdx && idx <= endIdx;
            });
        }

        return result;
    }, [jobs, selectedFilter, dateRange]);

    // En yeniden en eskiye sıralanır ve ay/yıla göre gruplanır — geçmişte
    // gezinmeyi kolaylaştırmak için.
    const rows: Row[] = useMemo(() => {
        const sorted = [...filteredJobs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const out: Row[] = [];
        let lastLabel: string | null = null;
        for (const job of sorted) {
            const label = monthLabel(job.createdAt);
            if (label !== lastLabel) {
                out.push({ type: 'header', key: `h-${label}`, label });
                lastLabel = label;
            }
            out.push({ type: 'job', key: String(job.id), job });
        }
        return out;
    }, [filteredJobs]);

    const renderItem = useCallback(
        ({ item }: { item: Row }) => {
            if (item.type === 'header') {
                return <Text style={s.sectionHeader}>{item.label}</Text>;
            }
            return (
                <Link href={`/shipment/${item.job.id}`} asChild>
                    <Tappable activeOpacity={0.9}>
                        <ShipmentHistoryCard item={item.job} />
                    </Tappable>
                </Link>
            );
        },
        [],
    );

    const keyExtractor = useCallback((item: Row) => item.key, []);
    const getItemType = useCallback((item: Row) => item.type, []);

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <Tappable onPress={() => router.back()} hitSlop={8}>
                    <Feather name="chevron-left" size={26} color="#FF5B04" />
                </Tappable>
                <Text style={s.headerTitle}>Gönderi Geçmişim</Text>
                <View style={{ flex: 1 }} />
                <Tappable
                    onPress={() => setRangeModalOpen(true)}
                    style={[s.filterBtn, rangeActive && s.filterBtnActive]}
                    activeOpacity={0.7}
                    hitSlop={6}
                >
                    <Feather name="filter" size={17} color={rangeActive ? '#FFFFFF' : PRIMARY} />
                </Tappable>
            </View>

            {rangeActive && (
                <View style={s.activeRangeRow}>
                    <Feather name="calendar" size={12} color={PRIMARY} />
                    <Text style={s.activeRangeText}>{formatRange(dateRange)}</Text>
                    <Tappable
                        onPress={() => setDateRange({ start: null, end: null })}
                        hitSlop={8}
                        style={s.activeRangeClear}
                    >
                        <Feather name="x" size={13} color={PRIMARY} />
                    </Tappable>
                </View>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipsContainer}
                style={s.chipsRow}
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

            {isLoading ? (
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={s.loadingText}>Gönderiler yükleniyor…</Text>
                </View>
            ) : showError ? (
                <LoadErrorState error={error} onRetry={refetch} retrying={isFetching} />
            ) : (
                <FlashList
                    data={rows}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemType={getItemType}
                    contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 40 }}
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
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.6}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View style={s.footerLoading}>
                                <ActivityIndicator color={PRIMARY} />
                            </View>
                        ) : null
                    }
                />
            )}

            <DateRangeFilterModal
                visible={rangeModalOpen}
                initialRange={dateRange}
                onClose={() => setRangeModalOpen(false)}
                onApply={setDateRange}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F2F6',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    filterBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF0E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBtnActive: { backgroundColor: PRIMARY },

    activeRangeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 20,
        marginTop: 10,
        alignSelf: 'flex-start',
        backgroundColor: '#FFF0E8',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    activeRangeText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
    activeRangeClear: { marginLeft: 2 },

    chipsRow: { flexGrow: 0, backgroundColor: BG },
    chipsContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
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

    sectionHeader: {
        fontSize: 13,
        fontWeight: '800',
        color: '#6B7280',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },

    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    footerLoading: { paddingVertical: 20, alignItems: 'center' },
    loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 13 },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 16 },
    emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
