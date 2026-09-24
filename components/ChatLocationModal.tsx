import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const GOOGLE_API_KEY =
    Constants.expoConfig?.extra?.googleMapsApiKey ??
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ??
    '';
const PRIMARY = '#FF5B04';

const fetchGoogle = async (endpoint: string) => {
    try {
        const res = await fetch(`${endpoint}&key=${GOOGLE_API_KEY}&language=tr`);
        return await res.json();
    } catch {
        return null;
    }
};

export type ChatLocation = { address: string; latitude: number; longitude: number };

export default function ChatLocationModal({
    visible,
    onClose,
    onSend,
}: {
    visible: boolean;
    onClose: () => void;
    onSend: (loc: ChatLocation) => void;
}) {
    const mapRef = useRef<MapView>(null);
    const debounceMap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [mapLocation, setMapLocation] = useState<ChatLocation | null>(null);
    const [searchText, setSearchText] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleMapTap = useCallback(async (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        const data = await fetchGoogle(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}`,
        );
        const address = data?.results?.[0]?.formatted_address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setMapLocation({ address, latitude, longitude });
        mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
    }, []);

    const handleGps = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Reddedildi', 'Konum izni gerekli.');
                return;
            }
            setIsSearching(true);
            const pos = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = pos.coords;
            const data = await fetchGoogle(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}`,
            );
            const address = data?.results?.[0]?.formatted_address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            setMapLocation({ address, latitude, longitude });
            mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
        } catch {
            Alert.alert('Hata', 'Konum alınamadı.');
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSearch = useCallback((text: string) => {
        setSearchText(text);
        clearTimeout(debounceMap.current);
        if (text.length < 2) {
            setSuggestions([]);
            return;
        }
        debounceMap.current = setTimeout(async () => {
            const data = await fetchGoogle(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&components=country:tr`,
            );
            if (data?.status === 'OK') setSuggestions(data.predictions);
        }, 350);
    }, []);

    const selectSuggestion = useCallback(async (item: any) => {
        setIsSearching(true);
        Keyboard.dismiss();
        setSuggestions([]);
        const data = await fetchGoogle(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}`,
        );
        if (data?.status === 'OK') {
            const { lat, lng } = data.result.geometry.location;
            const loc = { address: data.result.formatted_address, latitude: lat, longitude: lng };
            setMapLocation(loc);
            setSearchText(loc.address);
            mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
        }
        setIsSearching(false);
    }, []);

    const handleConfirm = () => {
        if (!mapLocation) return;
        onSend(mapLocation);
        setMapLocation(null);
        setSearchText('');
        setSuggestions([]);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#F5F6FC' }}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    initialRegion={{ latitude: 41.0082, longitude: 28.9784, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
                    onPress={handleMapTap}
                >
                    {mapLocation && (
                        <Marker coordinate={{ latitude: mapLocation.latitude, longitude: mapLocation.longitude }}>
                            <View style={s.markerPin}>
                                <Ionicons name="location-sharp" size={28} color="#FFFFFF" />
                            </View>
                        </Marker>
                    )}
                </MapView>

                <SafeAreaView style={s.overlay} pointerEvents="box-none">
                    <View style={s.searchRow}>
                        <Tappable onPress={onClose} style={{ padding: 6 }}>
                            <Feather name="arrow-left" size={20} color="#111827" />
                        </Tappable>
                        <TextInput
                            style={s.searchInput}
                            placeholder="Haritada ara..."
                            placeholderTextColor="#9CA3AF"
                            value={searchText}
                            onChangeText={handleSearch}
                        />
                        <Tappable style={s.gpsBtn} onPress={handleGps}>
                            {isSearching ? (
                                <ActivityIndicator size="small" color={PRIMARY} />
                            ) : (
                                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={PRIMARY} />
                            )}
                        </Tappable>
                    </View>

                    {suggestions.length > 0 && (
                        <View style={s.suggestionsCard}>
                            {suggestions.map((item: any) => (
                                <Tappable
                                    key={item.place_id}
                                    style={s.suggestionItem}
                                    onPress={() => selectSuggestion(item)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="location-sharp" size={16} color={PRIMARY} />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={s.suggestionMain} numberOfLines={1}>
                                            {item.structured_formatting?.main_text || item.description}
                                        </Text>
                                        <Text style={s.suggestionSub} numberOfLines={1}>
                                            {item.structured_formatting?.secondary_text || ''}
                                        </Text>
                                    </View>
                                </Tappable>
                            ))}
                        </View>
                    )}
                </SafeAreaView>

                <View style={s.bottomCard}>
                    <View style={s.bottomInfo}>
                        <View style={s.bottomIcon}>
                            <Ionicons name="navigate" size={22} color={PRIMARY} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.bottomHint}>Gönderilecek Konum</Text>
                            <Text style={s.bottomAddress} numberOfLines={2}>
                                {mapLocation?.address || 'Haritaya dokunarak konum seçin'}
                            </Text>
                        </View>
                    </View>
                    <Tappable haptic="light"
                        style={[s.confirmBtn, !mapLocation && s.confirmBtnDisabled]}
                        onPress={handleConfirm}
                        disabled={!mapLocation}
                        activeOpacity={0.85}
                    >
                        <Text style={s.confirmBtnText}>Konumu Gönder</Text>
                    </Tappable>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    markerPin: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12 },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 8,
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111827', height: '100%', marginLeft: 4 },
    gpsBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF0E8', alignItems: 'center', justifyContent: 'center' },
    suggestionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        maxHeight: 240,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    suggestionMain: { fontSize: 13, fontWeight: '600', color: '#111827' },
    suggestionSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
    bottomCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 36,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 10,
    },
    bottomInfo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, gap: 12 },
    bottomIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0E8', alignItems: 'center', justifyContent: 'center' },
    bottomHint: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
    bottomAddress: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20 },
    confirmBtn: { height: 54, borderRadius: 16, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
    confirmBtnDisabled: { backgroundColor: '#E5E7EB' },
    confirmBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
