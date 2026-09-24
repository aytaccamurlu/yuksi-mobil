import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import MotorcycleSvg from '@/assets/images/vehicles/motorcycle.svg';
import { VEHICLE_SVG_MAP } from '@/constants/shipments';
import RateReviewModal from '@/components/RateReviewModal';
import Tappable from '@/components/Tappable';
import type { TransformedJob } from '@/types/shipment';

const PRIMARY = '#FF5B04';
const RED = '#EF4444';

const ShipmentHistoryCard = React.memo(({ item }: { item: TransformedJob }) => {
    const VehicleSvg = VEHICLE_SVG_MAP[item.vehicleKey] || MotorcycleSvg;
    const isFailed = item.status === 'iptal';
    const statusLabel = isFailed ? 'Başarısız' : 'Tamamlandı';
    const statusColor = isFailed ? RED : PRIMARY;
    const typeLabel = item.type === 'hemen' ? 'Hemen' : 'Randevulu';
    const [reviewOpen, setReviewOpen] = useState(false);

    return (
        <View style={s.card}>
            <View style={s.topRow}>
                <View style={s.avatarGroup}>
                    <View style={s.avatarCircle}>
                        <Feather name="user" size={13} color="#9CA3AF" />
                    </View>
                    <View>
                        <Text style={s.courierName} numberOfLines={1}>{item.courierName}</Text>
                        <Text style={s.ratingText}>★ 5.0</Text>
                    </View>
                </View>

                <View style={s.typeBadge}>
                    <Text style={s.typeBadgeText}>{typeLabel}</Text>
                    <Feather name="chevron-right" size={14} color={PRIMARY} />
                </View>

                <View style={{ flex: 1 }} />

                {!isFailed && (
                    <Tappable style={s.rateBtn} onPress={() => setReviewOpen(true)} activeOpacity={0.8} hitSlop={4}>
                        <Text style={s.rateBtnText}>Değerlendir</Text>
                    </Tappable>
                )}

                <View style={isFailed ? s.failIndicator : s.successIndicator}>
                    <Feather name={isFailed ? 'x' : 'check'} size={14} color={isFailed ? RED : '#10B981'} />
                </View>
            </View>

            <View style={s.divider} />

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
                            <Text style={s.routeAddress} numberOfLines={2}>{item.from}</Text>
                        </View>
                    </View>

                    <View style={s.routeRow}>
                        <Feather name="map-pin" size={11} color={PRIMARY} style={{ marginTop: 1 }} />
                        <View style={s.routeTextGroup}>
                            <Text style={s.routeSmallLabel}>Nereye</Text>
                            <Text style={s.routeAddress} numberOfLines={2}>{item.to}</Text>
                        </View>
                    </View>

                    <View style={s.tarihStatusRow}>
                        <View style={s.tarihGroup}>
                            <Feather name="calendar" size={11} color="#9CA3AF" style={{ marginTop: 1 }} />
                            <Text style={s.tarihLabel}>Tarih</Text>
                            <Text style={s.tarihValue} numberOfLines={1}>{item.dateTime}</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: statusColor }]}>
                            <Text style={s.statusBadgeText}>{statusLabel}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {!isFailed && (
                <View style={s.bottomRow}>
                    <Text style={s.totalAmount}>Toplam Tutar: {item.totalAmount}</Text>
                </View>
            )}

            <RateReviewModal
                visible={reviewOpen}
                courierName={item.courierName}
                onClose={() => setReviewOpen(false)}
                onSubmit={() => {}}
            />
        </View>
    );
});

export default ShipmentHistoryCard;

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
    avatarGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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

    typeBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
    typeBadgeText: { fontSize: 13, fontWeight: '800', color: PRIMARY },

    rateBtn: {
        backgroundColor: PRIMARY,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        marginRight: 8,
    },
    rateBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

    successIndicator: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1.3,
        borderColor: '#10B981',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    failIndicator: {
        width: 26,
        height: 26,
        borderRadius: 7,
        borderWidth: 1.3,
        borderColor: RED,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },

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

    tarihStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    tarihGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tarihLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },
    tarihValue: { fontSize: 11, color: '#374151', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
    statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

    bottomRow: {
        paddingHorizontal: 14,
        paddingBottom: 12,
        alignItems: 'flex-end',
    },
    totalAmount: { fontSize: 13, fontWeight: '800', color: PRIMARY },
});
