import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

import CourierTrackingMap from '@/components/CourierTrackingMap';
import LoadErrorState from '@/components/LoadErrorState';
import { CAPACITY_OPTIONS_BY_VEHICLE, TYPE_OPTIONS } from '@/components/SelectionModal';
import { SHIPMENT_STEPS, STATUS_CONFIG, VEHICLE_TYPE_NAMES } from '@/constants/shipments';
import { useConfirmOrderMutation, useGetOrderByIdQuery } from '@/service/orders.service';
import * as createLoadActions from '@/store/feature/createLoad/actions';
import { parseOrderNote, transformOrder } from '@/utils/shipments';

const VEHICLE_KEY_ORDER = ['courier', 'minivan', 'panelvan', 'pickup', 'truck'];

export default function ShipmentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data, error, isLoading, isFetching, isError, refetch } = useGetOrderByIdQuery(id as string, {
        skip: !id,
        pollingInterval: 5_000,
    });
    const [confirmOrder, { isLoading: confirming }] = useConfirmOrderMutation();
    const notFound = (error as any)?.status === 404;

    const job = useMemo(() => {
        if (!data) return null;
        return transformOrder(data);
    }, [data]);

    const handleRepeatOrder = () => {
        if (!data) return;
        const parsed = parseOrderNote(data.cargoDetails?.note);
        const vehicleKey = parsed.vehicleName
            ? Object.entries(VEHICLE_TYPE_NAMES).find(([, name]) => name === parsed.vehicleName)?.[0]
            : null;

        createLoadActions.resetForm();

        if (vehicleKey) {
            const index = VEHICLE_KEY_ORDER.indexOf(vehicleKey);
            if (index >= 0) createLoadActions.setActiveVehicleIndex(index);
        }
        if (parsed.weightLabel) {
            const options = CAPACITY_OPTIONS_BY_VEHICLE[vehicleKey ?? 'courier'] ?? CAPACITY_OPTIONS_BY_VEHICLE.courier;
            const match = options.find((o) => o.label === parsed.weightLabel);
            if (match) createLoadActions.setCapacitySelection(match);
        }
        if (parsed.typeLabel) {
            const match = TYPE_OPTIONS.find((o) => o.label === parsed.typeLabel);
            if (match) createLoadActions.setTypeSelection(match);
        }
        createLoadActions.setFromLocation({
            latitude: data.pickupLatitude || 0,
            longitude: data.pickupLongitude || 0,
            address: data.pickupLocation?.addressText || '',
            addressDetails: {
                city: data.pickupLocation?.city,
                district: data.pickupLocation?.district,
                neighborhood: data.pickupLocation?.neighborhood,
                buildingNo: data.pickupLocation?.buildingNo || undefined,
            },
        });
        createLoadActions.setToLocation({
            latitude: 0,
            longitude: 0,
            address: data.dropoffLocation?.addressText || '',
            addressDetails: {
                city: data.dropoffLocation?.city,
                district: data.dropoffLocation?.district,
                neighborhood: data.dropoffLocation?.neighborhood,
                buildingNo: data.dropoffLocation?.buildingNo || undefined,
            },
        });
        if (parsed.freeform) createLoadActions.setNotesValue(parsed.freeform);

        router.push({ pathname: '/create-load', params: { fromRepeat: '1' } });
    };

    const handleConfirmDriver = () => {
        if (!id) return;
        Alert.alert('Sürücüyü Onayla', 'Atanan sürücüyü onaylayıp taşımayı başlatmak istiyor musunuz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Onayla',
                onPress: async () => {
                    try {
                        await confirmOrder(id as string).unwrap();
                    } catch {
                        Alert.alert('Hata', 'Sürücü onaylanamadı, lütfen tekrar deneyin.');
                    }
                },
            },
        ]);
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/shipments');
        }
    };

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
                    <DetailHeader onBack={handleBack} />
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#FF5B04" />
                        <Text className="text-gray-400 mt-3 text-sm">Gönderi detayı yükleniyor…</Text>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    if (isError && !notFound && !job) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
                    <DetailHeader onBack={handleBack} />
                    <LoadErrorState error={error} onRetry={refetch} retrying={isFetching} />
                </SafeAreaView>
            </>
        );
    }

    if (isError || !job) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
                    <DetailHeader onBack={handleBack} />
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-gray-700 text-lg font-bold">Gönderi bulunamadı</Text>
                        <Tappable onPress={handleBack} className="mt-4 bg-orange-500 px-6 py-2 rounded-full">
                            <Text className="text-white font-bold">Geri Dön</Text>
                        </Tappable>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.bekliyor;
    const hasDeparted = job.status === 'yolda' || job.status === 'tamamlandı';

    const courierPhoto = '';
    const plateNumber = data?.carrierInfo?.plate || '';

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <DetailHeader onBack={handleBack} />

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

                    {/* Live Tracking Map Section */}
                    {hasDeparted && (
                        <View className="bg-white mb-2 shadow-sm z-0 relative">
                            <CourierTrackingMap orderId={job.id} />
                        </View>
                    )}

                    {/* Status Header */}
                    <View className="bg-white px-5 py-6 mb-2 border-b border-gray-100 items-center drop-shadow-sm">
                        <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${statusCfg.bg}`}>
                            <Ionicons name={statusCfg.icon as any} size={32} color="#fff" />
                        </View>
                        <Text className="text-2xl font-extrabold text-gray-900">{statusCfg.label}</Text>
                        <Text className="text-sm text-gray-500 mt-1">Sipariş No: {job.id.substring(0, 8).toUpperCase()}</Text>
                    </View>

                    {/* Progress Bar */}
                    <View className="bg-white px-5 py-6 mb-2 border-y border-gray-100">
                        <Text className="text-lg font-bold text-gray-900 mb-4">Sipariş Durumu</Text>
                        <ShipmentProgressBar currentStatus={job.status} />
                    </View>

                    {/* Courier Information */}
                    {job.status !== 'bekliyor' && (
                        <View className="bg-white px-5 py-5 mb-2 border-y border-gray-100">
                            <Text className="text-lg font-bold text-gray-900 mb-4">Kurye Bilgileri</Text>
                            <View className="flex-row items-center">
                                {courierPhoto ? (
                                    <Image source={{ uri: courierPhoto }} className="w-16 h-16 rounded-full bg-gray-200" />
                                ) : (
                                    <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center">
                                        <Ionicons name="person" size={32} color="#FF5B04" />
                                    </View>
                                )}
                                <View className="ml-4 flex-1">
                                    <Text className="text-base font-bold text-gray-900">{job.courierName}</Text>
                                    <View className="flex-row items-center mt-1">
                                        <Text className="text-sm text-gray-600">{job.vehicleType}</Text>
                                        {plateNumber ? (
                                            <>
                                                <View className="w-1 h-1 bg-gray-300 rounded-full mx-2" />
                                                <View className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                    <Text className="text-xs font-bold text-gray-700">{plateNumber}</Text>
                                                </View>
                                            </>
                                        ) : null}
                                    </View>
                                </View>
                                {job.courierConversationId ? (
                                    <View className="flex-row items-center ml-2" style={{ gap: 8 }}>
                                        <Tappable
                                            className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center"
                                            onPress={() =>
                                                router.push({
                                                    pathname: '/messages/[id]',
                                                    params: { id: job.courierConversationId!, name: job.courierName },
                                                })
                                            }
                                            accessibilityLabel="Kuryeye mesaj gönder"
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="chatbubble-ellipses" size={19} color="#FF5B04" />
                                        </Tappable>
                                        <Tappable
                                            className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center"
                                            onPress={() =>
                                                router.push({
                                                    pathname: '/call/[id]',
                                                    params: { id: job.courierConversationId!, name: job.courierName },
                                                })
                                            }
                                            accessibilityLabel="Kuryeyi ara"
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="call" size={20} color="#FF5B04" />
                                        </Tappable>
                                    </View>
                                ) : null}
                            </View>

                            {data?.status === 'DriverAssigned' && (
                                <Tappable
                                    onPress={handleConfirmDriver}
                                    disabled={confirming}
                                    activeOpacity={0.85}
                                    className="bg-primary rounded-full py-3.5 items-center mt-4"
                                >
                                    {confirming ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text className="text-white font-bold text-[15px]">Sürücüyü Onayla</Text>
                                    )}
                                </Tappable>
                            )}
                        </View>
                    )}

                    {/* Locations */}
                    <View className="bg-white px-5 py-5 mb-2 border-y border-gray-100">
                        <Text className="text-lg font-bold text-gray-900 mb-4">Teslimat Adresleri</Text>
                        <View className="flex-row">
                            <View className="items-center mr-3 mt-1">
                                <View className="w-4 h-4 rounded-full bg-emerald-100 items-center justify-center">
                                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                                </View>
                                <View className="w-0.5 h-12 bg-gray-200 my-1" />
                                <View className="w-4 h-4 rounded-full bg-red-100 items-center justify-center">
                                    <View className="w-2 h-2 rounded-full bg-red-500" />
                                </View>
                            </View>
                            <View className="flex-1">
                                <View className="mb-4">
                                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Alınış Adresi</Text>
                                    <Text className="text-sm text-gray-800 leading-snug">{job.from}</Text>
                                </View>
                                <View>
                                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Teslim Adresi</Text>
                                    <Text className="text-sm text-gray-800 leading-snug">{job.to}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Details */}
                    <View className="bg-white px-5 py-5 border-t border-gray-100">
                        <Text className="text-lg font-bold text-gray-900 mb-4">Gönderi Özellikleri</Text>
                        <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
                            <Text className="text-gray-500">Teslimat Tipi</Text>
                            <View className={`flex-row items-center px-2.5 py-1 rounded-full ${job.type === 'hemen' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                                <Ionicons
                                    name={job.type === 'hemen' ? 'flash' : 'calendar-outline'}
                                    size={12}
                                    color={job.type === 'hemen' ? '#10B981' : '#3B82F6'}
                                />
                                <Text className={`text-xs font-bold ml-1 ${job.type === 'hemen' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                    {job.type === 'hemen' ? 'Hemen' : 'Randevulu'}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
                            <Text className="text-gray-500">Tarih</Text>
                            <Text className="text-gray-900 font-medium">{job.dateTime}</Text>
                        </View>
                        <View className="flex-row items-center justify-between py-3">
                            <Text className="text-gray-500">Toplam Tutar</Text>
                            <Text className="text-orange-600 font-bold text-lg">{job.totalAmount}</Text>
                        </View>
                    </View>

                    {(job.status === 'tamamlandı' || job.status === 'iptal') && (
                        <View className="px-5 pt-6">
                            <Tappable
                                onPress={handleRepeatOrder}
                                activeOpacity={0.85}
                                className="bg-primary rounded-full py-4 items-center"
                                style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                            >
                                <Text className="text-white font-bold text-[15px]">İşlemi Tekrarla</Text>
                            </Tappable>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

// ─── Sub-components ──────────────────────────────────────────

const DetailHeader = ({ onBack }: { onBack: () => void }) => (
    <View className="flex-row items-center px-4 pt-2 pb-3 bg-white border-b border-gray-100">
        <Tappable onPress={onBack} hitSlop={8} className="w-9 h-9 items-center justify-center -ml-1">
            <Ionicons name="arrow-back" size={24} color="#FF5B04" />
        </Tappable>
        <Text className="text-lg font-bold text-gray-900 ml-1">Gönderi Detayı</Text>
    </View>
);

const ShipmentProgressBar = ({ currentStatus }: { currentStatus: string }) => {
    let currentIndex = 0;

    if (currentStatus === 'tamamlandı') currentIndex = 4;
    else if (currentStatus === 'yolda') currentIndex = 3;
    else if (currentStatus === 'teslim_alındı') currentIndex = 2;
    else if (currentStatus === 'atandı') currentIndex = 1;
    else if (currentStatus === 'iptal') currentIndex = -1;

    if (currentStatus === 'iptal') {
        return (
            <View className="bg-red-50 p-4 rounded-xl border border-red-100 flex-row items-center">
                <Ionicons name="close-circle" size={24} color="#EF4444" />
                <Text className="ml-3 text-red-700 font-bold">Bu gönderi iptal edilmiştir.</Text>
            </View>
        );
    }

    return (
        <View className="relative pl-4">
            {/* The vertical tracking line */}
            <View className="absolute left-[26px] top-4 bottom-4 w-0.5 bg-gray-200" />
            <View
                className="absolute left-[26px] top-4 w-0.5 bg-orange-500"
                style={{
                    height: currentIndex > 0 ? `${(currentIndex / (SHIPMENT_STEPS.length - 1)) * 100}%` : 0
                }}
            />

            {SHIPMENT_STEPS.map((step, index) => {
                const isCompleted = index <= currentIndex;
                const isActive = index === currentIndex;

                return (
                    <View key={step.id} className="flex-row items-center bg-transparent mb-6 last:mb-0">
                        {/* Status Circle */}
                        <View className="w-8 items-center justify-center mr-4 z-10">
                            <View
                                className={`w-6 h-6 rounded-full items-center justify-center border-2 ${isActive
                                    ? 'border-orange-500 bg-white'
                                    : isCompleted
                                        ? 'border-orange-500 bg-orange-500'
                                        : 'border-gray-200 bg-white'
                                    }`}
                            >
                                {isCompleted && !isActive && (
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                )}
                                {isActive && (
                                    <View className="w-2 h-2 rounded-full bg-orange-500" />
                                )}
                            </View>
                        </View>

                        {/* Status Text */}
                        <View className="flex-1">
                            <Text className={`text-base font-semibold ${isActive ? 'text-orange-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                                }`}>
                                {step.label}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};
