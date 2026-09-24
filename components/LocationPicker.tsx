import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { BORDER_ERROR, BORDER_FILLED, BORDER_IDLE, useAnimatedBorderColor } from '@/hooks/useAnimatedBorderColor';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const GOOGLE_API_KEY =
  Constants.expoConfig?.extra?.googleMapsApiKey ??
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey ??
  '';
const PRIMARY = '#FF5B04';

// Konum seçilince harita ikonu yerini çarpıya bırakır; iki ikon üst üste
// durup opaklıkla geçiş yapar, böylece değişim yumuşak olur.
function MapClearIcon({ cleared }: { cleared: boolean }) {
  const p = useSharedValue(cleared ? 1 : 0);
  React.useEffect(() => {
    p.value = withTiming(cleared ? 1 : 0, { duration: 200 });
  }, [cleared]);
  const mapStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: 1 - p.value * 0.3 }] }));
  const xStyle = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.7 + p.value * 0.3 }] }));
  return (
    <View style={ss.iconStack}>
      <Animated.View style={[ss.iconLayer, mapStyle]}>
        <Feather name="map" size={15} color="#FFFFFF" />
      </Animated.View>
      <Animated.View style={[ss.iconLayer, xStyle]}>
        <Feather name="x" size={17} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

// ─── Utils ───────────────────────────────────────────────────

const fetchGoogle = async (endpoint: string) => {
  try {
    const res = await fetch(`${endpoint}&key=${GOOGLE_API_KEY}&language=tr`);
    return await res.json();
  } catch {
    return null;
  }
};

const parseAddress = (components: any[]) => {
  const get = (types: string[]) =>
    components?.find(c => types.some(t => c.types.includes(t)))?.long_name || '';
  return {
    city: get(['administrative_area_level_1', 'locality']),
    district: get(['administrative_area_level_2']),
    neighborhood: get(['sublocality_level_1', 'neighborhood']),
    street: get(['route']),
    buildingNo: get(['street_number']),
    doorNo: '',
  };
};

// Denizli ve yakın illerde rastgele konum — geliştirici kısayolu.
const DENIZLI_AREA_CITIES = [
  { city: 'Denizli', latitude: 37.7765, longitude: 29.0864 },
  { city: 'Aydın', latitude: 37.8560, longitude: 27.8416 },
  { city: 'Muğla', latitude: 37.2153, longitude: 28.3636 },
  { city: 'Uşak', latitude: 38.6823, longitude: 29.4082 },
  { city: 'Manisa', latitude: 38.6191, longitude: 27.4289 },
  { city: 'Isparta', latitude: 37.7648, longitude: 30.5566 },
  { city: 'Burdur', latitude: 37.7203, longitude: 30.2908 },
];

const randomDenizliAreaLocation = () => {
  const base = DENIZLI_AREA_CITIES[Math.floor(Math.random() * DENIZLI_AREA_CITIES.length)];
  const jitter = () => (Math.random() - 0.5) * 0.1;
  return { city: base.city, latitude: base.latitude + jitter(), longitude: base.longitude + jitter() };
};

const buildLocationFromGeocode = (result: any) => ({
  latitude: result.geometry.location.lat,
  longitude: result.geometry.location.lng,
  address: result.formatted_address,
  addressDetails: parseAddress(result.address_components),
});

// ─── Suggestion Item ─────────────────────────────────────────

const SuggestionItem = React.memo(({ item, onSelect }: { item: any; onSelect: () => void }) => (
  <Tappable style={ss.suggestionItem} onPress={onSelect} activeOpacity={0.7}>
    <View style={ss.suggestionIcon}>
      <Ionicons name="location-sharp" size={16} color={PRIMARY} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={ss.suggestionMain} numberOfLines={1}>
        {item.structured_formatting?.main_text || item.description}
      </Text>
      <Text style={ss.suggestionSub} numberOfLines={1}>
        {item.structured_formatting?.secondary_text || ''}
      </Text>
    </View>
  </Tappable>
));

// ─── Main Component ──────────────────────────────────────────

interface LocationPickerInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  locationType?: 'from' | 'to';
  onLocationSelect?: (loc: any) => void;
  onTextChange?: (text: string) => void;
  containerStyle?: string;
  /** Zorunlu alan boş bırakılıp gönderilmeye çalışıldıysa çerçeve kırmızıya döner. */
  error?: boolean;
}

const LocationPickerInput = ({
  label,
  placeholder,
  value,
  locationType = 'from',
  onLocationSelect,
  onTextChange,
  error = false,
}: LocationPickerInputProps) => {
  const [inputText, setInputText] = useState(value || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // value prop'u dışarıdan değişirse input'u güncelle
  React.useEffect(() => {
    if (value !== undefined && value !== inputText) {
      setInputText(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const [isFetching, setIsFetching] = useState(false);

  // Map modal state
  const [mapVisible, setMapVisible] = useState(false);
  const [mapLocation, setMapLocation] = useState<any>(null);
  const [mapSearchText, setMapSearchText] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const [isMapSearching, setIsMapSearching] = useState(false);

  const mapRef = useRef<MapView>(null);
  const debounceInline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debounceMap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    return () => {
      if (debounceInline.current) clearTimeout(debounceInline.current);
      if (debounceMap.current) clearTimeout(debounceMap.current);
    };
  }, []);

  // ── Inline autocomplete ────────────────────────────────────

  const handleTextChange = (text: string) => {
    setInputText(text);
    onTextChange?.(text);
    clearTimeout(debounceInline.current);
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceInline.current = setTimeout(async () => {
      const data = await fetchGoogle(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&components=country:tr`,
      );
      if (data?.status === 'OK') setSuggestions(data.predictions);
    }, 350);
  };

  const selectInlineSuggestion = useCallback(async (item: any) => {
    setIsFetching(true);
    Keyboard.dismiss();
    setSuggestions([]);
    const data = await fetchGoogle(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}`,
    );
    if (data?.status === 'OK') {
      const loc = buildLocationFromGeocode(data.result);
      setInputText(loc.address);
      onLocationSelect?.(loc);
    }
    setIsFetching(false);
  }, [onLocationSelect]);

  // ── Map modal helpers ──────────────────────────────────────

  const handleMapTap = useCallback(async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const data = await fetchGoogle(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}`,
    );
    if (data?.results?.[0]) {
      const loc = buildLocationFromGeocode(data.results[0]);
      setMapLocation(loc);
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
        400,
      );
    }
  }, []);

  const handleGps = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Reddedildi', 'Konum izni gerekli.');
        return;
      }
      setIsMapSearching(true);
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;
      const data = await fetchGoogle(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}`,
      );
      if (data?.results?.[0]) {
        const loc = buildLocationFromGeocode(data.results[0]);
        setMapLocation(loc);
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
          400,
        );
      }
    } catch {
      Alert.alert('Hata', 'Konum alınamadı.');
    } finally {
      setIsMapSearching(false);
    }
  }, []);

  const handleRandomDenizliArea = useCallback(async () => {
    const { city, latitude, longitude } = randomDenizliAreaLocation();
    setIsMapSearching(true);
    const data = await fetchGoogle(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}`,
    );
    const loc = data?.results?.[0]
      ? buildLocationFromGeocode(data.results[0])
      : { latitude, longitude, address: city, addressDetails: { city, district: '', neighborhood: '', street: '', buildingNo: '', doorNo: '' } };
    setMapLocation(loc);
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 },
      400,
    );
    setIsMapSearching(false);
  }, []);

  const handleMapSearch = useCallback((text: string) => {
    setMapSearchText(text);
    clearTimeout(debounceMap.current);
    if (text.length < 2) { setMapSuggestions([]); return; }
    debounceMap.current = setTimeout(async () => {
      const data = await fetchGoogle(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&components=country:tr`,
      );
      if (data?.status === 'OK') setMapSuggestions(data.predictions);
    }, 350);
  }, []);

  const selectMapSuggestion = useCallback(async (item: any) => {
    setIsMapSearching(true);
    Keyboard.dismiss();
    setMapSuggestions([]);
    const data = await fetchGoogle(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}`,
    );
    if (data?.status === 'OK') {
      const loc = buildLocationFromGeocode(data.result);
      setMapLocation(loc);
      mapRef.current?.animateToRegion(
        { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
        400,
      );
      setMapSearchText(loc.address);
    }
    setIsMapSearching(false);
  }, []);

  const confirmMapLocation = useCallback(() => {
    if (!mapLocation) return;
    setInputText(mapLocation.address);
    onLocationSelect?.(mapLocation);
    setMapVisible(false);
    setMapSearchText('');
    setMapSuggestions([]);
    setMapLocation(null);
  }, [mapLocation, onLocationSelect]);

  const openMap = useCallback(() => {
    setMapLocation(null);
    setMapSearchText('');
    setMapSuggestions([]);
    setMapVisible(true);
  }, []);

  const clearInput = useCallback(() => {
    setInputText('');
    setSuggestions([]);
    onTextChange?.('');
  }, [onTextChange]);

  const hasValue = !!inputText.trim();
  const borderStyle = useAnimatedBorderColor(
    error ? BORDER_ERROR : hasValue ? BORDER_FILLED : BORDER_IDLE,
  );

  // ── Render ─────────────────────────────────────────────────

  return (
    <View style={ss.wrapper}>
      {label && <Text style={ss.label}>{label}</Text>}

      {/* Input Row */}
      <Animated.View style={[ss.inputRow, borderStyle]}>
        <Ionicons name="location-outline" size={18} color="#A1A1AA" style={{ marginLeft: 14 }} />
        <TextInput
          style={ss.textInput}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={handleTextChange}
          returnKeyType="search"
          onSubmitEditing={() => {
            setSuggestions([]);
            Keyboard.dismiss();
          }}
        />
        {isFetching
          ? <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 10 }} />
          : null
        }
        <Tappable style={ss.mapBtn} onPress={hasValue ? clearInput : openMap} activeOpacity={0.8}>
          <MapClearIcon cleared={hasValue} />
        </Tappable>
      </Animated.View>

      {/* Inline Autocomplete Suggestions */}
      {suggestions.length > 0 && (
        <View style={ss.suggestionsCard}>
          {suggestions.map((item: any) => (
            <SuggestionItem
              key={item.place_id}
              item={item}
              onSelect={() => selectInlineSuggestion(item)}
            />
          ))}
        </View>
      )}

      {/* Map Modal */}
      <Modal visible={mapVisible} animationType="slide" presentationStyle="fullScreen">
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
                <View style={ss.markerPin}>
                  <Ionicons name="location-sharp" size={28} color="#FFFFFF" />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Map Search Bar */}
          <SafeAreaView style={ss.mapOverlay} pointerEvents="box-none">
            <View style={ss.mapSearchRow}>
              <Tappable style={ss.gpsBtn} onPress={handleGps}>
                {isMapSearching
                  ? <ActivityIndicator size="small" color={PRIMARY} />
                  : <MaterialCommunityIcons name="crosshairs-gps" size={20} color={PRIMARY} />
                }
              </Tappable>
              <TextInput
                style={ss.mapSearchInput}
                placeholder="Haritada ara..."
                placeholderTextColor="#9CA3AF"
                value={mapSearchText}
                onChangeText={handleMapSearch}
              />
              <Tappable onPress={() => setMapVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color="#D4D4D8" />
              </Tappable>
            </View>

            {mapSuggestions.length > 0 && (
              <View style={ss.mapSuggestionsCard}>
                {mapSuggestions.map((item: any) => (
                  <SuggestionItem
                    key={item.place_id}
                    item={item}
                    onSelect={() => selectMapSuggestion(item)}
                  />
                ))}
              </View>
            )}
          </SafeAreaView>

          {/* Bottom confirm card */}
          <View style={ss.mapBottomCard}>
            <View style={ss.mapBottomInfo}>
              <View style={ss.mapBottomIcon}>
                <Ionicons name="navigate" size={22} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ss.mapBottomHint}>
                  {locationType === 'from' ? 'Nereden alınacak?' : 'Nereye gidilecek?'}
                </Text>
                <Pressable onLongPress={handleRandomDenizliArea} delayLongPress={10000}>
                  <Text style={ss.mapBottomAddress} numberOfLines={2}>
                    {mapLocation?.address || 'Haritaya dokunarak konum seçin'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <Tappable
              style={[ss.confirmBtn, !mapLocation && ss.confirmBtnDisabled]}
              onPress={confirmMapLocation}
              disabled={!mapLocation}
              activeOpacity={0.85}
            >
              <Text style={ss.confirmBtnText}>Konumu Onayla</Text>
            </Tappable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LocationPickerInput;

// ─── Styles ──────────────────────────────────────────────────

const ss = StyleSheet.create({
  wrapper: { width: '100%' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF5B04',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 2,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingHorizontal: 10,
    height: '100%',
  },
  iconStack: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  iconLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  mapBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  suggestionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionMain: { fontSize: 13, fontWeight: '600', color: '#111827' },
  suggestionSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  markerPin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  mapSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  gpsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    height: '100%',
  },
  mapSuggestionsCard: {
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

  mapBottomCard: {
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
  mapBottomInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  mapBottomIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBottomHint: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  mapBottomAddress: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20 },

  confirmBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#E5E7EB' },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
