import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import MotorcycleSvg from '@/assets/images/vehicles/motorcycle.svg';
import Tappable from '@/components/Tappable';
import { VEHICLE_SVG_MAP } from '@/constants/shipments';
import type { TransformedJob } from '@/types/shipment';

const PRIMARY = '#FF5B04';

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    bekliyor:      { label: 'Bekliyor',      color: '#6B7280', bg: '#F3F4F6' },
    atandı:        { label: 'Kurye Atandı',  color: '#3B82F6', bg: '#EFF6FF' },
    teslim_alındı: { label: 'Teslim Alındı', color: '#8B5CF6', bg: '#F5F3FF' },
    yolda:         { label: 'Yolda',         color: '#10B981', bg: '#ECFDF5' },
    tamamlandı:    { label: 'Tamamlandı',    color: PRIMARY,   bg: '#FFF0E8' },
    iptal:         { label: 'İptal',         color: '#EF4444', bg: '#FEF2F2' },
};

const STATUS_STEP: Record<string, number> = {
    bekliyor: 0,
    atandı: 1,
    teslim_alındı: 2,
    yolda: 2,
    tamamlandı: 4,
    iptal: -1,
};

const PROGRESS_STEPS = ['Onaylandı', 'Teslim Alındı', 'Yolda', 'Tamamlandı'];

const ShipmentCard = React.memo(({ item }: { item: TransformedJob }) => {
    const router = useRouter();
    const VehicleSvg = VEHICLE_SVG_MAP[item.vehicleKey] || MotorcycleSvg;
    const badge = STATUS_BADGE[item.status] || STATUS_BADGE.bekliyor;
    const stepIdx = STATUS_STEP[item.status] ?? 0;
    const isActive = item.status !== 'tamamlandı' && item.status !== 'iptal';
    const hasCourier = item.courierName !== 'Henüz atanmadı';
    const hasDeparted = item.status === 'yolda' || item.status === 'tamamlandı';
    const showProgress = item.type === 'hemen' && isActive && hasCourier;
    const typeLabel = item.type === 'hemen' ? 'Hemen' : 'Randevulu';
    const timeOnly = item.dateTime.includes('•') ? item.dateTime.split('•')[0].trim() : item.dateTime;

    const handleMessage = () => {
        if (!item.courierConversationId) return;
        router.push({ pathname: '/messages/[id]', params: { id: item.courierConversationId, name: item.courierName } });
    };

    const handleCall = () => {
        if (!item.courierConversationId) return;
        router.push({ pathname: '/call/[id]', params: { id: item.courierConversationId, name: item.courierName } });
    };

    const handleMap = () => {
        router.push({ pathname: '/shipment/[id]', params: { id: item.id } });
    };

    return (
        <View style={s.card}>
            {/* ── Top Row ── */}
            <View style={s.topRow}>
                <View style={s.avatarGroup}>
                    <View style={s.avatarCircle}>
                        <Feather name="user" size={13} color="#9CA3AF" />
                    </View>
                    <View>
                        <Text style={s.courierName} numberOfLines={1}>{item.courierName}</Text>
                        {hasCourier && <Text style={s.ratingText}>★ 5.0</Text>}
                    </View>
                </View>

                <View style={s.typeBadge}>
                    <Text style={s.typeBadgeText}>{typeLabel}</Text>
                    <Feather name="chevron-right" size={14} color={PRIMARY} />
                </View>

                {hasCourier && (
                    <View style={s.actionIcons}>
                        <Tappable style={s.actionIconOutline} onPress={handleMessage} hitSlop={4} activeOpacity={0.7}>
                            <Feather name="message-circle" size={13} color={PRIMARY} />
                        </Tappable>
                        <Tappable style={s.actionIconOutline} onPress={handleCall} hitSlop={4} activeOpacity={0.7}>
                            <Feather name="phone" size={13} color={PRIMARY} />
                        </Tappable>
                        {hasDeparted && (
                            <Tappable style={[s.actionIconOutline, s.actionIconGreenOutline]} onPress={handleMap} hitSlop={4} activeOpacity={0.7}>
                                <Feather name="map-pin" size={13} color="#10B981" />
                            </Tappable>
                        )}
                    </View>
                )}
            </View>

            {/* ── Divider ── */}
            <View style={s.divider} />

            {/* ── Main Content ── */}
            <View style={s.mainRow}>
                <View style={s.vehicleBox}>
                    <VehicleSvg width={72} height={56} />
                </View>

                <View style={s.routeInfo}>
                    <Text style={s.vehicleLabel}>{item.vehicleType}</Text>

                    <View style={s.routeRow}>
                        <Feather name="map-pin" size={11} color={PRIMARY} style={{ marginTop: 1 }} />
                        <View style={s.routeTextGroup}>
                            <Text style={s.routeSmallLabel}>Nereden</Text>
                            <Text style={s.routeAddress} numberOfLines={1}>{item.from}</Text>
                        </View>
                    </View>

                    <View style={s.routeRow}>
                        <Feather name="map-pin" size={11} color="#10B981" style={{ marginTop: 1 }} />
                        <View style={s.routeTextGroup}>
                            <Text style={s.routeSmallLabel}>Nereye</Text>
                            <Text style={s.routeAddress} numberOfLines={1}>{item.to}</Text>
                        </View>
                    </View>

                    <View style={s.timeStatusRow}>
                        <View style={s.timeGroup}>
                            <Feather name="clock" size={11} color="#9CA3AF" style={{ marginTop: 1 }} />
                            <Text style={s.timeLabel}>Saat</Text>
                            <Text style={s.timeValue}>{timeOnly}</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: badge.color }]}>
                            <Text style={s.statusBadgeText}>{badge.label}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={s.bottomRow}>
                <Text style={s.totalAmount}>Toplam Tutar: {item.totalAmount}</Text>
            </View>

            {/* ── Progress Bar (hemen + active) ── */}
            {showProgress && (
                <>
                    <View style={s.divider} />
                    <View style={s.progressContainer}>
                        <View style={s.progressLine} />
                        <View style={s.progressStepsRow}>
                            {PROGRESS_STEPS.map((step, i) => {
                                const done = i < stepIdx;
                                return (
                                    <View key={step} style={s.progressStepItem}>
                                        <View style={[s.progressDot, done ? s.progressDotDone : s.progressDotEmpty]}>
                                            {done && <Feather name="check" size={7} color="#FFF" />}
                                        </View>
                                        <Text style={[s.progressStepLabel, done && s.progressStepLabelActive]}>
                                            {step}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </>
            )}
        </View>
    );
});

export default ShipmentCard;

const s = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },

    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
        gap: 8,
    },
    avatarGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    avatarCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    courierName: { fontSize: 12, fontWeight: '700', color: '#111827', maxWidth: 90 },
    ratingText: { fontSize: 10, color: '#F59E0B', fontWeight: '600', marginTop: 1 },

    typeBadge: { flexDirection: 'row', alignItems: 'center' },
    typeBadgeText: { fontSize: 13, fontWeight: '800', color: PRIMARY },

    actionIcons: { flexDirection: 'row', gap: 6 },
    actionIconOutline: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.3,
        borderColor: PRIMARY,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIconGreenOutline: { borderColor: '#10B981' },

    divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 14 },

    mainRow: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
    },
    vehicleBox: {
        width: 90,
        height: 84,
        backgroundColor: '#FFF0E8',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    routeInfo: { flex: 1, justifyContent: 'center', gap: 4 },
    vehicleLabel: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 2 },
    routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    routeTextGroup: { flex: 1 },
    routeSmallLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },
    routeAddress: { fontSize: 11, color: '#374151', fontWeight: '500', marginTop: 1 },
    timeStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    timeGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },
    timeValue: { fontSize: 11, color: '#374151', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
    statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

    progressContainer: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
        position: 'relative',
    },
    progressLine: {
        position: 'absolute',
        left: 34,
        right: 34,
        top: 20,
        height: 2,
        backgroundColor: PRIMARY,
    },
    progressStepsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressStepItem: { alignItems: 'center', flex: 1 },
    progressDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    progressDotDone: { backgroundColor: PRIMARY },
    progressDotEmpty: { backgroundColor: '#FFFFFF', borderWidth: 1.3, borderColor: PRIMARY },
    progressStepLabel: {
        fontSize: 8,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 4,
    },
    progressStepLabelActive: { color: PRIMARY, fontWeight: '700' },

    bottomRow: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: 'flex-end',
    },
    totalAmount: { fontSize: 13, fontWeight: '800', color: PRIMARY },
});
