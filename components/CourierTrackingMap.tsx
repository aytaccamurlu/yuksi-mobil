import { FOREGROUND_POLL_INTERVAL_MS } from '@/constants/polling';
import { useGetCourierRouteQuery } from '@/service/tracking.service';
import Tappable from '@/components/Tappable';
import { Feather, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import MapView, { LatLng, Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOOGLE_API_KEY =
    Constants.expoConfig?.extra?.googleMapsApiKey ??
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ??
    '';

interface CourierTrackingMapProps {
    orderId: string;
}

type LatLng2 = { lat: number; lng: number };

function decodePolyline(encoded: string): LatLng[] {
    if (!encoded) return [];
    const poly: LatLng[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return poly;
}

async function fetchRoadPath(from: LatLng2, to: LatLng2): Promise<LatLng[]> {
    const straight = [{ latitude: from.lat, longitude: from.lng }, { latitude: to.lat, longitude: to.lng }];
    if (!GOOGLE_API_KEY) return straight;
    try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        const points = json?.routes?.[0]?.overview_polyline?.points;
        const decoded = points ? decodePolyline(points) : [];
        return decoded.length > 1 ? decoded : straight;
    } catch {
        return straight;
    }
}

function MapBody({
    driver,
    pickup,
    dropoff,
    distance,
    traveled,
    remaining,
    zoomDelta = 0.05,
}: {
    driver: LatLng2;
    pickup?: LatLng2;
    dropoff?: LatLng2;
    distance?: number;
    traveled: LatLng[];
    remaining: LatLng[];
    zoomDelta?: number;
}) {
    const initialRegion = {
        latitude: driver.lat,
        longitude: driver.lng,
        latitudeDelta: zoomDelta,
        longitudeDelta: zoomDelta,
    };

    return (
        <View style={{ flex: 1 }}>
            <MapView style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation={false}>
                {remaining.length > 1 && (
                    <Polyline coordinates={remaining} strokeColor="#D1D5DB" strokeWidth={4} lineDashPattern={[8, 6]} />
                )}

                {traveled.length > 1 && (
                    <Polyline coordinates={traveled} strokeColor="#FF5B04" strokeWidth={5} />
                )}

                {pickup && (
                    <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Alınış Noktası">
                        <View className="bg-emerald-500 rounded-full w-4 h-4 border-2 border-white drop-shadow-sm" />
                    </Marker>
                )}

                {dropoff && (
                    <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} title="Teslimat Noktası">
                        <View className="bg-red-500 rounded-full w-4 h-4 border-2 border-white drop-shadow-sm" />
                    </Marker>
                )}

                <Marker coordinate={{ latitude: driver.lat, longitude: driver.lng }} title="Kurye">
                    <View className="bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                        <View className="bg-orange-500 rounded-full w-6 h-6 items-center justify-center">
                            <Ionicons name="bicycle" size={14} color="#fff" />
                        </View>
                    </View>
                </Marker>
            </MapView>

            <View style={s.speedPill}>
                <Text style={s.speedValue}>{distance ? (distance / 1000).toFixed(1) : '--'}</Text>
                <Text style={s.speedUnit}>km</Text>
            </View>
        </View>
    );
}

export default function CourierTrackingMap({ orderId }: CourierTrackingMapProps) {
    const { data, isLoading, isError } = useGetCourierRouteQuery(orderId, {
        pollingInterval: FOREGROUND_POLL_INTERVAL_MS,
        skip: !orderId,
    });

    const insets = useSafeAreaInsets();
    const [fullscreen, setFullscreen] = useState(false);
    const [traveled, setTraveled] = useState<LatLng[]>([]);
    const [remaining, setRemaining] = useState<LatLng[]>([]);

    const routeData = data?.data ?? data;
    const driver: LatLng2 | undefined = routeData?.driver;
    const pickup: LatLng2 | undefined = routeData?.pickup;
    const dropoff: LatLng2 | undefined = routeData?.dropoff;

    useEffect(() => {
        if (!driver) return;
        let cancelled = false;
        (async () => {
            if (pickup) {
                const path = await fetchRoadPath(pickup, driver);
                if (!cancelled) setTraveled(path);
            }
            if (dropoff) {
                const path = await fetchRoadPath(driver, dropoff);
                if (!cancelled) setRemaining(path);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driver?.lat, driver?.lng, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

    if (isLoading) {
        return (
            <View className="h-64 bg-gray-100 items-center justify-center">
                <ActivityIndicator size="small" color="#FF5B04" />
                <Text className="text-xs text-gray-500 mt-2">Harita Yükleniyor...</Text>
            </View>
        );
    }

    if (isError || !driver) {
        return null;
    }

    return (
        <View style={s.embedWrap}>
            <MapBody driver={driver} pickup={pickup} dropoff={dropoff} distance={routeData?.distance} traveled={traveled} remaining={remaining} zoomDelta={0.05} />

            <Tappable onPress={() => setFullscreen(true)} style={s.toggleBtn} hitSlop={10} activeOpacity={0.8}>
                <Feather name="maximize-2" size={16} color="#FFFFFF" />
            </Tappable>

            <Modal visible={fullscreen} animationType="fade" statusBarTranslucent onRequestClose={() => setFullscreen(false)}>
                <View style={[s.fullscreenSafe, { paddingBottom: insets.bottom }]}>
                    <MapBody driver={driver} pickup={pickup} dropoff={dropoff} distance={routeData?.distance} traveled={traveled} remaining={remaining} zoomDelta={0.015} />

                    <Tappable
                        onPress={() => setFullscreen(false)}
                        style={[s.toggleBtn, { top: insets.top + 16 }]}
                        hitSlop={10}
                        activeOpacity={0.8}
                    >
                        <Feather name="minimize-2" size={16} color="#FFFFFF" />
                    </Tappable>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    embedWrap: { position: 'relative', height: 288, backgroundColor: '#E5E7EB' },
    fullscreenSafe: { flex: 1, backgroundColor: '#E5E7EB' },
    toggleBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FF5B04',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    speedPill: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(229,231,235,0.5)',
    },
    speedValue: { fontSize: 20, fontWeight: '900', color: '#EA580C' },
    speedUnit: { marginLeft: 4, fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 4 },
});
