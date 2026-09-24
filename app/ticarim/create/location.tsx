import { patchTicarimDraft } from '@/store/feature/ticarim/actions';
import {
    autocompletePlaces,
    PlacePrediction,
    ResolvedPlace,
    resolvePlaceId,
    reverseGeocode,
    toTicarimLocation,
} from '@/utils/places';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#FF5B04';
const ISTANBUL = { latitude: 41.0082, longitude: 28.9784, latitudeDelta: 0.1, longitudeDelta: 0.1 };
const FIXED_PLACE: ResolvedPlace = {
    latitude: 40.9909,
    longitude: 29.0304,
    address: 'Caferağa, Moda Cd., Kadıköy/İstanbul',
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: 'Caferağa',
};

function PredictionRow({ item, onPress }: { item: PlacePrediction; onPress: () => void }) {
    return (
        <Tappable onPress={onPress} className="flex-row items-center py-3.5 border-b border-gray-50" activeOpacity={0.6}>
            <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mr-3">
                <Ionicons name="location-sharp" size={15} color={PRIMARY} />
            </View>
            <View className="flex-1">
                <Text className="text-gray-800 text-[14px]" numberOfLines={1}>
                    {item.structured_formatting?.main_text || item.description}
                </Text>
                {!!item.structured_formatting?.secondary_text && (
                    <Text className="text-gray-400 text-[12px]" numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                    </Text>
                )}
            </View>
        </Tappable>
    );
}

export default function TicarimLocationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
    const [resolving, setResolving] = useState(false);

    const [mapVisible, setMapVisible] = useState(false);
    const [mapPlace, setMapPlace] = useState<ResolvedPlace | null>(null);
    const [mapQuery, setMapQuery] = useState('');
    const [mapPredictions, setMapPredictions] = useState<PlacePrediction[]>([]);
    const [mapBusy, setMapBusy] = useState(false);

    const mapRef = useRef<MapView>(null);
    const inlineDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
    const mapDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(
        () => () => {
            clearTimeout(inlineDebounce.current);
            clearTimeout(mapDebounce.current);
        },
        [],
    );

    const commit = useCallback(
        (place: ResolvedPlace) => {
            patchTicarimDraft({ location: toTicarimLocation(place) });
            router.back();
        },
        [router],
    );

    const onQueryChange = (text: string) => {
        setQuery(text);
        clearTimeout(inlineDebounce.current);
        if (text.trim().length < 2) {
            setPredictions([]);
            return;
        }
        inlineDebounce.current = setTimeout(async () => {
            setPredictions(await autocompletePlaces(text));
        }, 300);
    };

    const pickPrediction = async (item: PlacePrediction) => {
        Keyboard.dismiss();
        setPredictions([]);
        setResolving(true);
        const place = await resolvePlaceId(item.place_id);
        setResolving(false);
        if (place) commit(place);
        else Alert.alert('Hata', 'Konum bilgisi alınamadı, lütfen tekrar deneyin.');
    };

    const useCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Mevcut konumu kullanmak için konum izni vermelisiniz.');
                return;
            }
            setResolving(true);
            const pos = await Location.getCurrentPositionAsync({});
            const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setResolving(false);
            if (place) commit(place);
            else Alert.alert('Hata', 'Konum çözümlenemedi.');
        } catch {
            setResolving(false);
            Alert.alert('Hata', 'Konum alınamadı.');
        }
    };

    // ── Harita ──
    const openMap = () => {
        setMapPlace(null);
        setMapQuery('');
        setMapPredictions([]);
        setMapVisible(true);
    };

    const onMapPress = async (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setMapBusy(true);
        const place = await reverseGeocode(latitude, longitude);
        setMapBusy(false);
        if (place) {
            setMapPlace(place);
            mapRef.current?.animateToRegion(
                { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
                350,
            );
        }
    };

    const mapGps = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Konum izni gerekli.');
                return;
            }
            setMapBusy(true);
            const pos = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = pos.coords;
            const place = await reverseGeocode(latitude, longitude);
            setMapBusy(false);
            if (place) {
                setMapPlace(place);
                mapRef.current?.animateToRegion(
                    { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
                    350,
                );
            }
        } catch {
            setMapBusy(false);
            Alert.alert('Hata', 'Konum alınamadı.');
        }
    };

    const onMapQueryChange = (text: string) => {
        setMapQuery(text);
        clearTimeout(mapDebounce.current);
        if (text.trim().length < 2) {
            setMapPredictions([]);
            return;
        }
        mapDebounce.current = setTimeout(async () => {
            setMapPredictions(await autocompletePlaces(text));
        }, 300);
    };

    const pickMapPrediction = async (item: PlacePrediction) => {
        Keyboard.dismiss();
        setMapPredictions([]);
        setMapBusy(true);
        const place = await resolvePlaceId(item.place_id);
        setMapBusy(false);
        if (place) {
            setMapPlace(place);
            setMapQuery(place.address);
            mapRef.current?.animateToRegion(
                { latitude: place.latitude, longitude: place.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
                350,
            );
        }
    };

    const confirmMap = () => {
        if (!mapPlace) return;
        setMapVisible(false);
        commit(mapPlace);
    };

    return (
        <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
            <View className="bg-primary px-5 pt-4 pb-5 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center mr-3"
                >
                    <Feather name="chevron-left" size={22} color="#fff" />
                </Tappable>
                <Pressable style={{ flex: 1 }} onLongPress={() => commit(FIXED_PLACE)} delayLongPress={6000}>
                    <Text className="text-white text-lg font-bold text-center">Konum</Text>
                </Pressable>
                <Tappable
                    onPress={openMap}
                    className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center ml-3"
                >
                    <Feather name="map" size={18} color="#fff" />
                </Tappable>
            </View>

            <View className="flex-1 bg-white">
                <View className="px-5 pt-4">
                    <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 h-12">
                        <Feather name="search" size={16} color="#9CA3AF" />
                        <TextInput
                            value={query}
                            onChangeText={onQueryChange}
                            placeholder="İl, ilçe veya mahalle ara..."
                            placeholderTextColor="#9CA3AF"
                            autoFocus
                            className="flex-1 ml-2 text-[14px] text-gray-800"
                        />
                        {resolving ? (
                            <ActivityIndicator size="small" color={PRIMARY} />
                        ) : query ? (
                            <Tappable onPress={() => { setQuery(''); setPredictions([]); }}>
                                <Feather name="x" size={16} color="#9CA3AF" />
                            </Tappable>
                        ) : null}
                    </View>
                </View>

                <ScrollView className="flex-1 px-5 pt-2" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Tappable
                        onPress={useCurrentLocation}
                        className="flex-row items-center py-3.5 border-b border-gray-50"
                        activeOpacity={0.6}
                    >
                        <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mr-3">
                            <MaterialCommunityIcons name="crosshairs-gps" size={16} color={PRIMARY} />
                        </View>
                        <Text className="text-gray-800 text-[14px]">Mevcut konumumu kullan</Text>
                    </Tappable>

                    {predictions.map((item) => (
                        <PredictionRow key={item.place_id} item={item} onPress={() => pickPrediction(item)} />
                    ))}

                    {query.trim().length >= 2 && predictions.length === 0 && !resolving && (
                        <Text className="text-gray-400 text-[13px] text-center py-6">Sonuç bulunamadı</Text>
                    )}

                    {query.trim().length < 2 && (
                        <Tappable
                            onPress={openMap}
                            className="flex-row items-center py-3.5"
                            activeOpacity={0.6}
                        >
                            <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mr-3">
                                <Feather name="map" size={15} color={PRIMARY} />
                            </View>
                            <Text className="text-gray-800 text-[14px]">Haritadan seç</Text>
                        </Tappable>
                    )}
                </ScrollView>
            </View>

            <Modal visible={mapVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setMapVisible(false)}>
                <View className="flex-1 bg-gray-100">
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={{ flex: 1 }}
                        initialRegion={ISTANBUL}
                        onPress={onMapPress}
                    >
                        {mapPlace && (
                            <Marker coordinate={{ latitude: mapPlace.latitude, longitude: mapPlace.longitude }}>
                                <View
                                    className="w-11 h-11 rounded-full items-center justify-center border-[3px] border-white"
                                    style={{ backgroundColor: PRIMARY }}
                                >
                                    <Ionicons name="location-sharp" size={26} color="#fff" />
                                </View>
                            </Marker>
                        )}
                    </MapView>

                    <SafeAreaView className="absolute top-0 left-0 right-0 px-4 pt-3" pointerEvents="box-none">
                        <View
                            className="flex-row items-center bg-white rounded-2xl px-2.5 border border-gray-100"
                            style={{ height: 52, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }}
                        >
                            <Tappable onPress={mapGps} className="w-9 h-9 rounded-xl bg-orange-50 items-center justify-center mr-2">
                                {mapBusy ? (
                                    <ActivityIndicator size="small" color={PRIMARY} />
                                ) : (
                                    <MaterialCommunityIcons name="crosshairs-gps" size={19} color={PRIMARY} />
                                )}
                            </Tappable>
                            <TextInput
                                value={mapQuery}
                                onChangeText={onMapQueryChange}
                                placeholder="Haritada ara..."
                                placeholderTextColor="#9CA3AF"
                                className="flex-1 text-[14px] text-gray-900 h-full"
                            />
                            <Tappable onPress={() => setMapVisible(false)} className="p-1">
                                <Ionicons name="close-circle" size={24} color="#D1D5DB" />
                            </Tappable>
                        </View>

                        {mapPredictions.length > 0 && (
                            <View
                                className="bg-white rounded-2xl mt-2 px-2 border border-gray-100 overflow-hidden"
                                style={{ maxHeight: 260, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 }}
                            >
                                {mapPredictions.map((item) => (
                                    <PredictionRow key={item.place_id} item={item} onPress={() => pickMapPrediction(item)} />
                                ))}
                            </View>
                        )}
                    </SafeAreaView>

                    <View
                        className="bg-white rounded-t-3xl px-6 pt-5"
                        style={{
                            paddingBottom: Math.max(insets.bottom + 16, 36),
                            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 10,
                        }}
                    >
                        <View className="flex-row items-start mb-4">
                            <View className="w-11 h-11 rounded-2xl bg-orange-50 items-center justify-center mr-3">
                                <Ionicons name="navigate" size={20} color={PRIMARY} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Seçilen konum</Text>
                                <Text className="text-[14px] font-semibold text-gray-900 leading-5" numberOfLines={2}>
                                    {mapPlace?.address || 'Haritaya dokunarak konum seçin'}
                                </Text>
                            </View>
                        </View>
                        <Tappable
                            onPress={confirmMap}
                            disabled={!mapPlace}
                            activeOpacity={0.85}
                            className={`rounded-2xl items-center justify-center ${mapPlace ? 'bg-primary' : 'bg-gray-200'}`}
                            style={{ height: 52 }}
                        >
                            <Text className="text-white font-bold text-[15px]">Konumu Onayla</Text>
                        </Tappable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
