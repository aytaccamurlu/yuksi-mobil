import AddressDetailFields from '@/components/AddressDetailFields';
import AppTextInput from '@/components/AppTextInput';
import CameraCaptureModal from '@/components/CameraCaptureModal';
import CargoScanLoading from '@/components/CargoScanLoading';
import ConfirmSubmitModal from '@/components/ConfirmSubmitModal';
import DateTimePickerField from '@/components/DateTimePickerField';
import FieldHint from '@/components/FieldHint';
import LocationPickerInput from '@/components/LocationPicker';
import PhotoSlotsField from '@/components/PhotoSlotsField';
import SaveRoutePromptModal from '@/components/SaveRoutePromptModal';
import SavedRoutePickerModal from '@/components/SavedRoutePickerModal';
import SelectionModal from '@/components/SelectionModal';
import { ToggleRow } from '@/components/SettingsRows';
import SlideToConfirm from '@/components/SlideToConfirm';
import SlideToScan from '@/components/SlideToScan';
import { CREATE_LOAD_HINTS, HintKey } from '@/constants/createLoadHints';
import { BORDER_AI, BORDER_ERROR, BORDER_FILLED, BORDER_IDLE, useAnimatedBorderColor } from '@/hooks/useAnimatedBorderColor';
import { useCargoScan } from '@/hooks/useCargoScan';
import { useCreateLoadForm } from '@/hooks/useCreateLoad';
import { useCreateLoadHintState } from '@/hooks/useCreateLoadHints';
import { haptic } from '@/utils/haptics';
import { useGetAddressesQuery, useSaveAddressMutation } from '@/service/createLoad.service';
import { INSURED_TRANSPORT_FEE, MAX_PICKED_IMAGES } from '@/store/feature/createLoad/slice';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Dimensions, Image, ImageSourcePropType, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import ReanimatedAnimated, {
    Extrapolation,
    interpolate,
    runOnJS,
    SharedValue,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const PRIMARY   = '#FF5B04';
const BG        = '#EDEEF2';
const HERO_H    = 290;
const HEADER_CONTENT_H = 44;

// ─── Araç tanımları (PNG görselli, aspect: kırpılmış PNG'nin en/boy oranı) ───
const VEHICLES: { key: string; name: string; desc: string; img: ImageSourcePropType; aspect: number }[] = [
    { key: 'courier',  name: 'Moto Kurye', desc: 'Küçük paket ve koli',      img: require('@/assets/images/motorcycle.png'), aspect: 285 / 291 },
    { key: 'minivan',  name: 'Minivan',     desc: 'Orta boy koli ve eşya',    img: require('@/assets/images/minivan.png'),    aspect: 352 / 289 },
    { key: 'panelvan', name: 'Panelvan',    desc: 'Büyük koli ve ev eşyası',  img: require('@/assets/images/panelvan.png'),   aspect: 798 / 710 },
    { key: 'pickup',   name: 'Kamyonet',    desc: 'Orta / büyük yük taşıma', img: require('@/assets/images/pickup.png'),     aspect: 867 / 676 },
    { key: 'truck',    name: 'Kamyon',      desc: 'Ağır ve büyük yükler',     img: require('@/assets/images/truck.png'),      aspect: 336 / 326 },
];

const LOOP_MULTIPLIER = 200;
const LOOPED_VEHICLES = Array.from(
    { length: VEHICLES.length * LOOP_MULTIPLIER },
    (_, i) => VEHICLES[i % VEHICLES.length],
);
const LOOP_START = Math.floor(LOOP_MULTIPLIER / 2) * VEHICLES.length;

const ITEM_RATIO = 0.34;
const INITIAL_ITEM_W = Math.round(W * ITEM_RATIO);
const SIDE_SCALE = 0.48;
const VEHICLE_H_RATIO = 0.42;
const SIDE_LIFT_RATIO = 0.18;
// komşu aracı, kaydırma mesafesini etkilemeden ekran kenarına iter.
const EDGE_PUSH_FACTOR = 1 / (2 * ITEM_RATIO) - 1;

const VEHICLE_BASE   = [80, 160, 260, 380, 520];
const VEHICLE_PER_KM = [7, 11, 15, 20, 26];

const distanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
};

// cssInterop stili düşürdüğü için çerçeve dışta, dokunma katmanı içeride.
function BorderedTappable({
    tone,
    style,
    innerStyle,
    children,
    ...rest
}: {
    tone: string;
    style?: any;
    innerStyle?: any;
    children: React.ReactNode;
} & React.ComponentProps<typeof Tappable>) {
    const border = useAnimatedBorderColor(tone);
    return (
        <ReanimatedAnimated.View style={[style, border]}>
            <Tappable style={innerStyle} {...rest}>
                {children}
            </Tappable>
        </ReanimatedAnimated.View>
    );
}

function HeroVehiclePage({
    item,
    index,
    scrollX,
    itemW,
    pageH,
    vehicleH,
    sideLift,
}: {
    item: typeof VEHICLES[0];
    index: number;
    scrollX: SharedValue<number>;
    itemW: number;
    pageH: number;
    vehicleH: number;
    sideLift: number;
}) {
    const edgePushMax = itemW * EDGE_PUSH_FACTOR;
    const style = useAnimatedStyle(() => {
        // signed: +1 komşu sağda, -1 komşu solda (index sağa doğru artar).
        const signed = index - scrollX.value / itemW;
        const distance = Math.abs(signed);
        const scale = interpolate(distance, [0, 1], [1, SIDE_SCALE], Extrapolation.CLAMP);
        const lift = interpolate(distance, [0, 1], [0, -sideLift], Extrapolation.CLAMP);
        const opacity = interpolate(distance, [0, 1, 1.6], [1, 1, 0], Extrapolation.CLAMP);
        const edgePush = interpolate(signed, [-1, 0, 1], [-edgePushMax, 0, edgePushMax], Extrapolation.CLAMP);
        return { opacity, transform: [{ translateX: edgePush }, { translateY: lift }, { scale }] };
    });
    return (
        <View style={[s.carouselPage, { width: itemW, height: pageH }]}>
            <ReanimatedAnimated.Image
                source={item.img}
                style={[s.mainVehicleImg, { height: vehicleH, aspectRatio: item.aspect }, style]}
                resizeMode="contain"
            />
        </View>
    );
}

export default function CreateLoadScreen() {
    const router = useRouter();
    const { fromRepeat } = useLocalSearchParams<{ fromRepeat?: string }>();
    const isRepeatFlow = fromRepeat === '1';
    const insets = useSafeAreaInsets();
    const headerH = insets.top + HEADER_CONTENT_H;
    const heroH = HERO_H + 30 + headerH;
    const carouselRef = useRef<any>(null);
    const scrollRef = useRef<any>(null);
    const notesWrapRef = useRef<View>(null);
    const fromRef = useRef<View>(null);
    const toRef = useRef<View>(null);
    const capacityTypeRef = useRef<View>(null);
    const photosRef = useRef<View>(null);
    const fieldRefs: Partial<Record<HintKey, React.RefObject<View | null>>> = {
        from: fromRef,
        to: toRef,
        capacityType: capacityTypeRef,
        photos: photosRef,
    };
    const notesInputRef = useRef<TextInput>(null);

    const pageScrollY = useSharedValue(0);
    const onPageScroll = useAnimatedScrollHandler({
        onScroll: (e) => { pageScrollY.value = e.contentOffset.y; },
    });
    const headerFade: [number, number] = [HERO_H - 12, HERO_H + 38];
    const headerBgStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pageScrollY.value, headerFade, [0, 1], Extrapolation.CLAMP),
    }));
    const headerOnDomeStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pageScrollY.value, headerFade, [1, 0], Extrapolation.CLAMP),
    }));
    const headerOnPageStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pageScrollY.value, headerFade, [0, 1], Extrapolation.CLAMP),
    }));

    // Header açık zemine dönünce status bar ikonları da koyulaşmalı.
    const [headerLight, setHeaderLight] = useState(false);
    useAnimatedReaction(
        () => pageScrollY.value > (headerFade[0] + headerFade[1]) / 2,
        (past, prev) => {
            if (past !== prev) runOnJS(setHeaderLight)(past);
        },
    );

    const carouselScrollX = useSharedValue(LOOP_START * INITIAL_ITEM_W);
    const [heroW, setHeroW] = useState(W);
    const itemW = Math.round(heroW * ITEM_RATIO);
    const sidePad = (heroW - itemW) / 2;
    const vehicleH = Math.round(heroW * VEHICLE_H_RATIO);
    const sideLift = Math.round(heroW * SIDE_LIFT_RATIO);
    const centerIndexRef = useRef(LOOP_START);
    // ortadaki aracı CellRendererComponentStyle ile öne alıyoruz, komşu üstüne binmesin diye.
    const [activeAbsoluteIndex, setActiveAbsoluteIndex] = useState(LOOP_START);

    useEffect(() => {
        const t = setTimeout(() => {
            const offset = centerIndexRef.current * itemW;
            carouselScrollX.value = offset;
            carouselRef.current?.scrollToOffset({ offset, animated: false });
        }, 0);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemW]);

    const focusNotes = useCallback(() => {
        setTimeout(() => {
            if (scrollRef.current && notesWrapRef.current) {
                notesWrapRef.current.measureLayout(
                    scrollRef.current as unknown as React.ElementRef<typeof View>,
                    (_x: number, y: number) => {
                        scrollRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true });
                        notesInputRef.current?.focus();
                    },
                    () => {},
                );
            }
        }, 260);
    }, []);

    const onCarouselScroll = useAnimatedScrollHandler({
        onScroll: (e) => { carouselScrollX.value = e.contentOffset.x; },
    });

    const {
        state, actions,
        canSubmit,
        handleSubmit,
        fetchPriceEstimate,
        submitting, isUploadingImage,
        couponApplying, couponApplied, couponError, handleApplyCoupon,
    } = useCreateLoadForm();

    const [openModalType, setOpenModalType] = React.useState<'capacity' | 'type' | null>(null);
    const [routePickerOpen, setRoutePickerOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [extraServicesOpen, setExtraServicesOpen] = useState(false);

    useEffect(() => {
        if (!isRepeatFlow) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            actions.resetForm();
            return false;
        });
        return () => sub.remove();
    }, [isRepeatFlow, actions]);

    // ── İpucu (FieldHint) mandallama ─────────────────────────
    const [touched, setTouched] = useState<Set<HintKey>>(new Set());
    const markTouched = useCallback((key: HintKey) => {
        setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    }, []);

    // ── Eksik alan uyarısı ───────────────────────────────────
    const [missingKeys, setMissingKeys] = useState<HintKey[]>([]);
    const fieldTone = useCallback(
        (key: HintKey, filled: boolean, fromAI = false) => {
            if (filled) return fromAI ? BORDER_AI : BORDER_FILLED;
            if (missingKeys.includes(key)) return BORDER_ERROR;
            return BORDER_IDLE;
        },
        [missingKeys],
    );

    const vehicleFieldBorder = useAnimatedBorderColor(state.vehicleFromAI ? BORDER_AI : 'transparent');

    const settleCarousel = useCallback((offsetX: number) => {
        const idx = Math.round(offsetX / itemW);
        centerIndexRef.current = idx;
        setActiveAbsoluteIndex(idx);
        const target = idx * itemW;
        if (Math.abs(offsetX - target) > 0.5) {
            carouselRef.current?.scrollToOffset({ offset: target, animated: true });
        }
        const normalized = ((idx % VEHICLES.length) + VEHICLES.length) % VEHICLES.length;
        if (normalized !== state.activeVehicleIndex) haptic('light');
        actions.setActiveVehicleIndex(normalized);
        markTouched('carrierType');
    }, [itemW, markTouched, state.activeVehicleIndex]);

    useEffect(() => {
        const current = ((centerIndexRef.current % VEHICLES.length) + VEHICLES.length) % VEHICLES.length;
        if (current === state.activeVehicleIndex) return;

        let delta = state.activeVehicleIndex - current;
        if (delta > VEHICLES.length / 2) delta -= VEHICLES.length;
        if (delta < -VEHICLES.length / 2) delta += VEHICLES.length;

        const target = centerIndexRef.current + delta;
        centerIndexRef.current = target;
        setActiveAbsoluteIndex(target);
        carouselRef.current?.scrollToOffset({ offset: target * itemW, animated: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.activeVehicleIndex]);

    const liveHints = useCreateLoadHintState(state, touched, couponApplied);
    const skipAutoLatchRef = useRef(false);
    useEffect(() => {
        if (skipAutoLatchRef.current) {
            skipAutoLatchRef.current = false;
            return;
        }
        const contentKeys: HintKey[] = ['appointment', 'from', 'to', 'capacityType', 'photos', 'notes', 'coupon', 'amount', 'submit'];
        setTouched((prev) => {
            let changed = false;
            const next = new Set(prev);
            contentKeys.forEach((key) => {
                if (liveHints[key] && !next.has(key)) {
                    next.add(key);
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveHints.appointment, liveHints.from, liveHints.to, liveHints.capacityType, liveHints.photos, liveHints.notes, liveHints.coupon, liveHints.amount, liveHints.submit]);

    const hints = useMemo(() => {
        const rec = {} as Record<HintKey, boolean>;
        (Object.keys(CREATE_LOAD_HINTS) as HintKey[]).forEach((k) => { rec[k] = touched.has(k); });
        return rec;
    }, [touched]);

    const resetHints = useCallback(() => {
        skipAutoLatchRef.current = true;
        setTouched(new Set());
    }, []);

    // ── Yeni adres → kayıt önerisi ───────────────────────────
    const { data: addressesData } = useGetAddressesQuery();
    const [saveAddress, { isLoading: savingAddress }] = useSaveAddressMutation();
    const savedAddresses: any[] = addressesData?.data?.addresses || addressesData?.data || addressesData || [];
    const [savePromptVisible, setSavePromptVisible] = useState(false);
    const [dismissedRouteKey, setDismissedRouteKey] = useState<string | null>(null);

    const routeKey = state.fromLocation && state.toLocation
        ? `${state.fromLocation.address}|${state.toLocation.address}`
        : null;
    const isRouteSaved = !!routeKey && savedAddresses.some(
        (a) => `${a.from?.address}|${a.to?.address}` === routeKey,
    );

    useEffect(() => {
        if (canSubmit && routeKey && !isRouteSaved && dismissedRouteKey !== routeKey) {
            setSavePromptVisible(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canSubmit]);

    const defaultRouteTitle = state.fromLocation && state.toLocation
        ? `${state.fromLocation.address.split(',')[0]} - ${state.toLocation.address.split(',')[0]}`
        : '';

    const handleSaveRoute = async (title: string) => {
        if (!state.fromLocation || !state.toLocation) return;
        try {
            await saveAddress({ title, from: state.fromLocation, to: state.toLocation }).unwrap();
            setSavePromptVisible(false);
            Alert.alert('Kaydedildi', 'Rota, Kayıtlı Rotalarım listenize eklendi.');
        } catch (e: any) {
            Alert.alert('Hata', e?.data?.message || 'Rota kaydedilemedi.');
        }
    };

    const handleDismissSavePrompt = () => {
        if (routeKey) setDismissedRouteKey(routeKey);
        setSavePromptVisible(false);
    };

    const activeVehicle  = VEHICLES[state.activeVehicleIndex] ?? VEHICLES[0];

    // ── Görsel seç ──────────────────────────────────────────
    const [cameraOpen, setCameraOpen] = useState(false);

    const handlePickFromGallery = async () => {
        const remaining = MAX_PICKED_IMAGES - state.pickedImages.length;
        if (remaining <= 0) return;
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                allowsMultipleSelection: true,
                selectionLimit: remaining,
                quality: 0.8,
            });
            if (!res.canceled) {
                res.assets.slice(0, remaining).forEach((asset) => {
                    const name = asset.fileName || asset.uri.split('/').pop() || 'Fotoğraf';
                    actions.addPickedImage({ image: asset, name });
                });
            }
        } catch { /* izin reddedildi */ }
    };

    const handlePickImage = () => {
        if (state.pickedImages.length >= MAX_PICKED_IMAGES) return;
        Alert.alert('Fotoğraf Seç', undefined, [
            { text: 'Kameradan Çek', onPress: () => setCameraOpen(true) },
            { text: 'Galeriden Seç', onPress: handlePickFromGallery },
            { text: 'İptal', style: 'cancel' },
        ]);
    };

    const handleCameraCapture = (photos: { uri: string }[]) => {
        setCameraOpen(false);
        photos.forEach((p, i) => {
            if (state.pickedImages.length + i >= MAX_PICKED_IMAGES) return;
            actions.addPickedImage({ image: { uri: p.uri }, name: `fotograf_${Date.now()}_${i + 1}.jpg` });
        });
    };

    // ── Yük tarat ───────────────────────────────────────────
    const [scanCameraOpen, setScanCameraOpen] = useState(false);
    const { scanning, runScan } = useCargoScan();

    const handleScanCapture = (photos: { uri: string }[]) => {
        setScanCameraOpen(false);
        runScan(photos.map((p) => p.uri));
    };

    // Eksik alanlar sırayla; ilki hem kaydırma hedefi hem uyarı metni olur.
    const MISSING_LABELS: Record<string, string> = {
        from: 'çıkış adresini',
        to: 'varış adresini',
        capacityType: 'kapasite ve tür seçimini',
        photos: 'en az bir fotoğrafı',
    };

    const collectMissing = (): HintKey[] => {
        const missing: HintKey[] = [];
        if (!state.fromValue.trim()) missing.push('from');
        if (!state.toValue.trim()) missing.push('to');
        if (!state.capacitySelection || !state.typeSelection) missing.push('capacityType');
        if (state.pickedImages.length === 0) missing.push('photos');
        return missing;
    };

    const scrollToField = (key: HintKey) => {
        const ref = fieldRefs[key];
        if (!ref?.current || !scrollRef.current) return;
        ref.current.measureLayout(
            scrollRef.current,
            (_x: number, y: number) => scrollRef.current?.scrollTo({ y: Math.max(y - 90, 0), animated: true }),
            () => {},
        );
    };

    const handleSubmitPress = () => {
        const missing = collectMissing();
        setMissingKeys(missing);
        if (missing.length) {
            haptic('warning');
            scrollToField(missing[0]);
            return;
        }
        haptic('medium');
        setConfirmOpen(true);
    };

    const handleSlideSubmit = () => {
        const missing = collectMissing();
        setMissingKeys(missing);
        if (missing.length) {
            haptic('warning');
            scrollToField(missing[0]);
            return;
        }
        onSubmit();
    };

    const [backendTransportPrice, setBackendTransportPrice] = useState<number | null>(null);

    useEffect(() => {
        if (!state.fromLocation || !state.toLocation) {
            setBackendTransportPrice(null);
            return;
        }
        let cancelled = false;
        const t = setTimeout(async () => {
            const price = await fetchPriceEstimate();
            if (!cancelled) setBackendTransportPrice(price);
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [state.fromLocation, state.toLocation, state.activeVehicleIndex, fetchPriceEstimate]);

    const estimatedPrice = useMemo(() => {
        const i = state.activeVehicleIndex;
        const transport = backendTransportPrice ?? (() => {
            const base = VEHICLE_BASE[i] ?? VEHICLE_BASE[0];
            const perKm = VEHICLE_PER_KM[i] ?? VEHICLE_PER_KM[0];
            const km = state.fromLocation && state.toLocation
                ? distanceKm(state.fromLocation, state.toLocation)
                : 0;
            return base + perKm * km;
        })();
        const photoLoad = state.pickedImages.length * 25;
        const capacityLoad = (state.capacitySelection?.id ?? 0) * 30;
        const extras = state.insuredTransport ? INSURED_TRANSPORT_FEE : 0;
        return Math.round(transport + photoLoad + capacityLoad + extras);
    }, [
        backendTransportPrice,
        state.activeVehicleIndex,
        state.fromLocation,
        state.toLocation,
        state.pickedImages.length,
        state.capacitySelection,
        state.insuredTransport,
    ]);

    useEffect(() => {
        const next = String(estimatedPrice);
        if (state.amountValue !== next) actions.setAmountValue(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estimatedPrice]);

    // Eksik işaretlenen alan doldurulunca kırmızı çerçeve kendiliğinden kalkar.
    useEffect(() => {
        if (!missingKeys.length) return;
        const stillMissing = collectMissing();
        if (stillMissing.length !== missingKeys.length) setMissingKeys(stillMissing);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.fromValue, state.toValue, state.capacitySelection, state.typeSelection, state.pickedImages.length]);

    // ── Form gönder ──────────────────────────────────────────
    const onSubmit = async () => {
        setConfirmOpen(false);
        const res = await handleSubmit();
        if (res.success) {
            const orderId = res.data?.id;
            // form burada sıfırlanmıyor, sipariş onaylanınca (confirm) sıfırlanır.
            if (orderId) {
                router.push({ pathname: '/job-matching/[id]', params: { id: String(orderId) } });
            } else {
                router.push('/(tabs)');
            }
        } else {
            Alert.alert('Hata', res.error);
        }
    };

    // ── Carousel item ────────────────────────────────────────
    const renderVehiclePage = useCallback(({ item, index }: { item: typeof VEHICLES[0]; index: number }) => (
        <HeroVehiclePage
            item={item}
            index={index}
            scrollX={carouselScrollX}
            itemW={itemW}
            pageH={heroH}
            vehicleH={vehicleH}
            sideLift={sideLift}
        />
    ), [carouselScrollX, itemW, heroH, vehicleH, sideLift]);

    const cellRendererComponentStyle = useCallback(
        ({ index }: { index: number }) => ({ zIndex: index === activeAbsoluteIndex ? 10 : 1 }),
        [activeAbsoluteIndex],
    );

    return (
        <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
            {/* Native stack header'ı headerBackground'ı desteklemiyor (bkz.
                HEADER_CONTENT_H yorumu) — header'ı tamamen kapatıp kendi
                overlay'imizi render ediyoruz. */}
            <Stack.Screen options={{ headerShown: false, statusBarStyle: headerLight ? 'dark' : 'light' }} />

            {/* ── Başlık (kendi render'ımız) ──────────────────── */}
            <View
                pointerEvents="box-none"
                style={[s.customHeader, { height: headerH, paddingTop: insets.top }]}
            >
                <ReanimatedAnimated.View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { backgroundColor: BG }, headerBgStyle]}
                />
                <View style={s.customHeaderRow}>
                    <Tappable
                        onPress={() => { actions.resetForm(); router.back(); }}
                        style={s.headerBtn}
                    >
                        <ReanimatedAnimated.View style={[s.headerIconLayer, headerOnDomeStyle]}>
                            <Feather name="chevron-left" size={26} color="#FFFFFF" />
                        </ReanimatedAnimated.View>
                        <ReanimatedAnimated.View style={[s.headerIconLayer, headerOnPageStyle]}>
                            <Feather name="chevron-left" size={26} color={PRIMARY} />
                        </ReanimatedAnimated.View>
                    </Tappable>

                    <View style={s.headerTitleWrap}>
                        <ReanimatedAnimated.Text
                            style={[s.customHeaderTitle, s.headerTitleLayer, headerOnDomeStyle, { color: '#FFFFFF' }]}
                            numberOfLines={1}
                        >
                            {activeVehicle.name}
                        </ReanimatedAnimated.Text>
                        <ReanimatedAnimated.Text
                            style={[s.customHeaderTitle, s.headerTitleLayer, headerOnPageStyle, { color: PRIMARY }]}
                            numberOfLines={1}
                        >
                            {activeVehicle.name}
                        </ReanimatedAnimated.Text>
                    </View>

                    <Tappable onPress={resetHints} style={s.headerBtn}>
                        <ReanimatedAnimated.View style={[s.headerIconLayer, headerOnDomeStyle]}>
                            <Feather name="help-circle" size={22} color="#FFFFFF" />
                        </ReanimatedAnimated.View>
                        <ReanimatedAnimated.View style={[s.headerIconLayer, headerOnPageStyle]}>
                            <Feather name="help-circle" size={22} color={PRIMARY} />
                        </ReanimatedAnimated.View>
                    </Tappable>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ReanimatedAnimated.ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    onScroll={onPageScroll}
                    scrollEventThrottle={16}
                >
                    {/* ── HERO ─────────────────────────────── */}
                    <View style={[s.hero, { height: heroH }]}>
                        {/* Turuncu dome arka plan */}
                        <Image
                            source={require('@/assets/images/yuk-arkaplan.png')}
                            style={[s.dome, { width: heroW, height: HERO_H + headerH }]}
                            resizeMode="stretch"
                        />

                        {/* Elips (araç altı gölge) */}
                        <Image
                            source={require('@/assets/images/elipse-yer.png')}
                            style={[s.ellipse, { left: (heroW - 360) / 2 }]}
                            resizeMode="contain"
                        />

                        {/* Araç carousel (sonsuz kaydırma) */}
                        <ReanimatedAnimated.FlatList
                            ref={carouselRef}
                            data={LOOPED_VEHICLES}
                            keyExtractor={(item, index) => `${item.key}-${index}`}
                            renderItem={renderVehiclePage}
                            CellRendererComponentStyle={cellRendererComponentStyle}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={s.carouselList}
                            onLayout={(e) => setHeroW(e.nativeEvent.layout.width)}
                            contentContainerStyle={{ paddingHorizontal: sidePad }}
                            snapToInterval={itemW}
                            disableIntervalMomentum
                            decelerationRate="normal"
                            initialScrollIndex={LOOP_START}
                            removeClippedSubviews={false}
                            windowSize={5}
                            getItemLayout={(_, index) => ({ length: itemW, offset: itemW * index, index })}
                            onScroll={onCarouselScroll}
                            scrollEventThrottle={16}
                            onScrollEndDrag={(e) => {
                                if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.05) {
                                    settleCarousel(e.nativeEvent.contentOffset.x);
                                }
                            }}
                            onMomentumScrollEnd={(e) => settleCarousel(e.nativeEvent.contentOffset.x)}
                        />
                    </View>

                    {/* ── YÜK TARAT ────────────────────────── */}
                    <View style={s.scanRow}>
                        <SlideToScan onActivate={() => setScanCameraOpen(true)} />
                    </View>

                    {/* ── FORM ─────────────────────────────── */}
                    <View style={s.form}>

                        {/* Hemen / Randevulu */}
                        <View style={s.deliveryRow}>
                            {(['1', '2'] as const).map((val) => {
                                const active = state.deliveryType === val;
                                const label  = val === '1' ? 'Hemen' : 'Randevulu';
                                return (
                                    <Tappable
                                        key={val}
                                        style={[s.deliveryBtn, active && s.deliveryBtnActive]}
                                        onPress={() => {
                                            actions.setDeliveryType(val);
                                            markTouched('deliveryType');
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[s.radio, active ? s.radioOn : s.radioOff]} />
                                        <Text style={[s.deliveryLabel, active && s.deliveryLabelActive]}>
                                            {label}
                                        </Text>
                                    </Tappable>
                                );
                            })}
                        </View>
                        <FieldHint text={CREATE_LOAD_HINTS.deliveryType} satisfied={hints.deliveryType} />

                        {/* Tarih / Saat (randevulu) */}
                        {state.deliveryType === '2' && (
                            <>
                                <View style={s.dateRow}>
                                    <DateTimePickerField
                                        label="Tarih*"
                                        placeholder="Tarih Seç"
                                        icon={<Feather name="calendar" size={16} color="#6B7280" />}
                                        mode="date"
                                        value={state.appointmentDate}
                                        onChange={(d) => actions.setAppointmentDate(d.toISOString())}
                                    />
                                    <DateTimePickerField
                                        label="Saat*"
                                        placeholder="Saat Seç"
                                        icon={<Feather name="clock" size={16} color="#6B7280" />}
                                        mode="time"
                                        value={state.appointmentTime}
                                        onChange={(d) => actions.setAppointmentTime(d.toISOString())}
                                    />
                                </View>
                                <FieldHint text={CREATE_LOAD_HINTS.appointment} satisfied={hints.appointment} />
                            </>
                        )}

                        {/* Taşıyıcı Türü — çerçeve yalnızca yük taramadan (AI) geldiğinde yeşil */}
                        <ReanimatedAnimated.View style={[s.vehicleField, vehicleFieldBorder]}>
                            <Feather name="user" size={17} color="#9CA3AF" />
                            <Text style={s.vehicleFieldText}>
                                Taşıyıcı Türü:{' '}
                                <Text style={s.vehicleFieldBold}>{activeVehicle.name}</Text>
                            </Text>
                        </ReanimatedAnimated.View>
                        <FieldHint text={CREATE_LOAD_HINTS.carrierType} satisfied={hints.carrierType} />

                        {/* Kayıtlı Rotalarım */}
                        <Tappable
                            style={s.savedRouteRow}
                            onPress={() => {
                                setRoutePickerOpen(true);
                                markTouched('savedRoute');
                            }}
                            activeOpacity={0.85}
                        >
                            <Feather name="bookmark" size={16} color={PRIMARY} />
                            <Text style={s.savedRouteText}>Kayıtlı Rotalarım</Text>
                            <Feather name="chevron-right" size={16} color="#9CA3AF" />
                        </Tappable>
                        <FieldHint text={CREATE_LOAD_HINTS.savedRoute} satisfied={hints.savedRoute} />

                        {/* Alış Noktası */}
                        <View ref={fromRef} style={s.locationBlock}>
                            <Text style={s.fieldLabel}>Alış Noktası:</Text>
                            <LocationPickerInput
                                placeholder="Nereden alınacak?"
                                value={state.fromValue}
                                locationType="from"
                                onLocationSelect={(loc) => actions.setFromLocation(loc)}
                                onTextChange={(text) => actions.setFromValue(text)}
                                error={missingKeys.includes('from')}
                            />
                            {state.fromLocation && (
                                <View style={{ marginTop: 8 }}>
                                    <AddressDetailFields
                                        label="Çıkış"
                                        details={state.fromLocation.addressDetails}
                                        onChangeField={(f, v) => actions.setFromAddressDetailField(f, v)}
                                    />
                                </View>
                            )}
                            <FieldHint text={CREATE_LOAD_HINTS.from} satisfied={hints.from} />
                        </View>

                        {/* Varış Noktası */}
                        <View ref={toRef} style={s.locationBlock}>
                            <Text style={s.fieldLabel}>Varış Noktası:</Text>
                            <LocationPickerInput
                                placeholder="Nereye gidecek?"
                                value={state.toValue}
                                locationType="to"
                                onLocationSelect={(loc) => actions.setToLocation(loc)}
                                onTextChange={(text) => actions.setToValue(text)}
                                error={missingKeys.includes('to')}
                            />
                            {state.toLocation && (
                                <View style={{ marginTop: 8 }}>
                                    <AddressDetailFields
                                        label="Varış"
                                        details={state.toLocation.addressDetails}
                                        onChangeField={(f, v) => actions.setToAddressDetailField(f, v)}
                                    />
                                </View>
                            )}
                            <FieldHint text={CREATE_LOAD_HINTS.to} satisfied={hints.to} />
                        </View>

                        {/* Kapasite & Tür seçimi */}
                        <View ref={capacityTypeRef} style={s.selectorsRow}>
                            <BorderedTappable
                                tone={fieldTone('capacityType', !!state.capacitySelection, state.capacityFromAI)}
                                style={s.selectorBtn}
                                innerStyle={s.selectorInner}
                                onPress={() => setOpenModalType('capacity')}
                                activeOpacity={0.8}
                            >
                                <Text style={s.selectorText} numberOfLines={1}>
                                    {state.capacitySelection?.label ?? 'Kapasite Seç'}
                                </Text>
                                <Feather name="chevron-down" size={14} color="#374151" />
                            </BorderedTappable>

                            <BorderedTappable
                                tone={fieldTone('capacityType', !!state.typeSelection, state.typeFromAI)}
                                style={s.selectorBtn}
                                innerStyle={s.selectorInner}
                                onPress={() => setOpenModalType('type')}
                                activeOpacity={0.8}
                            >
                                <Text style={s.selectorText} numberOfLines={1}>
                                    {state.typeSelection?.label ?? 'Tür Seç'}
                                </Text>
                                <Feather name="chevron-down" size={14} color="#374151" />
                            </BorderedTappable>
                        </View>
                        <FieldHint text={CREATE_LOAD_HINTS.capacityType} satisfied={hints.capacityType} />

                        {/* Fotoğraf */}
                        <View ref={photosRef} style={{ marginBottom: 4 }}>
                            <PhotoSlotsField
                                images={state.pickedImages}
                                onAdd={handlePickImage}
                                onRemove={(i) => actions.removePickedImage(i)}
                                error={missingKeys.includes('photos')}
                            />
                        </View>
                        <FieldHint text={CREATE_LOAD_HINTS.photos} satisfied={hints.photos} />

                        {/* Notlar */}
                        <View ref={notesWrapRef}>
                            <View style={s.notesLabelRow}>
                                <Text style={s.notesLabel}>Notlar & Talepler</Text>
                                {state.notesFromAI && (
                                    <Tappable onPress={() => actions.setNotesValue('')} hitSlop={8}>
                                        <Text style={s.notesClearText}>Temizle</Text>
                                    </Tappable>
                                )}
                            </View>
                            <AppTextInput
                                ref={notesInputRef}
                                placeholder="Eklemek İstedikleriniz (İsteğe Bağlı)"
                                value={state.notesValue}
                                onChangeText={(t) => actions.setNotesValue(t)}
                                multiline
                                numberOfLines={3}
                                style={state.notesFromAI ? s.aiField : undefined}
                            />
                        </View>
                        <FieldHint
                            text={state.notesFromAI ? 'Bu metin yapay zeka tarafından önerildi. Düzenleyebilir ya da "Temizle" ile kaldırabilirsiniz.' : CREATE_LOAD_HINTS.notes}
                            satisfied={hints.notes && !state.notesFromAI}
                        />

                        {/* Kampanya Kodu */}
                        <View style={s.couponRow}>
                            <View style={{ flex: 1 }}>
                                <AppTextInput
                                    placeholder="Kampanya Kodunu Yazın"
                                    value={state.couponValue}
                                    onChangeText={(t) => actions.setCouponValue(t)}
                                    autoCapitalize="characters"
                                    editable={!couponApplied}
                                    style={{ marginBottom: 0 }}
                                />
                            </View>
                            <Tappable
                                style={[s.couponBtn, (couponApplying || !state.couponValue.trim()) && s.couponBtnDisabled]}
                                onPress={handleApplyCoupon}
                                disabled={couponApplying || !state.couponValue.trim() || couponApplied}
                                activeOpacity={0.85}
                            >
                                {couponApplying ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={s.couponBtnText}>{couponApplied ? 'Uygulandı' : 'Uygula'}</Text>
                                )}
                            </Tappable>
                        </View>
                        {!!couponError && <Text style={s.couponErrorText}>{couponError}</Text>}
                        <FieldHint text={CREATE_LOAD_HINTS.coupon} satisfied={hints.coupon} />

                        {/* Ek Hizmetler */}
                        <View style={s.extraServicesCard}>
                            <Tappable
                                style={s.extraServicesHeader}
                                onPress={() => setExtraServicesOpen((v) => !v)}
                                activeOpacity={0.7}
                            >
                                <Text style={s.extraServicesTitle}>Ek Hizmetler</Text>
                                <Feather name={extraServicesOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
                            </Tappable>
                            {extraServicesOpen && (
                                <ToggleRow
                                    title="Sigortalı Taşıma"
                                    subtitle="Taşıma sırasında oluşabilecek hasarlara karşı +₺30"
                                    value={state.insuredTransport}
                                    onValueChange={(v) => {
                                        actions.setInsuredTransport(v);
                                        markTouched('insuredTransport');
                                    }}
                                    isLast
                                />
                            )}
                        </View>
                        <FieldHint text={CREATE_LOAD_HINTS.insuredTransport} satisfied={hints.insuredTransport} />

                        {/* Toplam Tutar */}
                        <View style={s.amountRow}>
                            <View style={s.amountLabelWrap}>
                                <Feather name="tag" size={16} color={PRIMARY} />
                                <Text style={s.amountLabelText}>Toplam Tutar</Text>
                            </View>
                            <View style={s.amountInputBox}>
                                <Text style={s.amountCurrency}>₺</Text>
                                <Text style={s.amountValueText}>{estimatedPrice.toLocaleString('tr-TR')}</Text>
                            </View>
                        </View>
                        <FieldHint text={CREATE_LOAD_HINTS.amount} satisfied={hints.amount} />

                        {/* ── Yük Oluştur ──────────────────── */}
                        <View style={s.bottomBar}>
                            <FieldHint
                                text={missingKeys.length
                                    ? `Devam etmek için ${missingKeys.map((k) => MISSING_LABELS[k]).filter(Boolean).join(', ')} doldurun. Eksik alanların çerçevesi kırmızı işaretlendi.`
                                    : CREATE_LOAD_HINTS.submit}
                                satisfied={hints.submit && !missingKeys.length}
                            />
                            {isRepeatFlow ? (
                                <SlideToConfirm
                                    label={submitting || isUploadingImage ? (isUploadingImage ? 'Fotoğraf Yükleniyor...' : 'Talep Oluşturuluyor...') : 'Kaydırarak Yük Oluştur'}
                                    onActivate={handleSlideSubmit}
                                    disabled={submitting || isUploadingImage}
                                />
                            ) : (
                                <Tappable
                                    haptic="none"
                                    style={[s.submitBtn, (submitting || isUploadingImage) && s.submitBtnBusy]}
                                    onPress={handleSubmitPress}
                                    disabled={submitting || isUploadingImage}
                                    activeOpacity={0.85}
                                >
                                    {submitting || isUploadingImage ? (
                                        <View style={s.submitRow}>
                                            <ActivityIndicator color="#FFFFFF" />
                                            <Text style={s.submitBtnText}>
                                                {isUploadingImage ? 'Fotoğraf Yükleniyor...' : 'Talep Oluşturuluyor...'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={s.submitRow}>
                                            <Text style={s.submitBtnText}>Yük Oluştur</Text>
                                            <Feather name="arrow-right" size={20} color="#FFFFFF" />
                                        </View>
                                    )}
                                </Tappable>
                            )}
                        </View>
                    </View>
                </ReanimatedAnimated.ScrollView>
            </KeyboardAvoidingView>

            <SelectionModal
                visible={openModalType !== null}
                type={openModalType}
                vehicleKey={activeVehicle.key}
                selectedValue={openModalType === 'capacity' ? state.capacitySelection : state.typeSelection}
                onSelect={(val) => {
                    if (openModalType === 'capacity') {
                        actions.setCapacitySelection(val);
                        setOpenModalType('type');
                    } else if (openModalType === 'type') {
                        actions.setTypeSelection(val);
                        setOpenModalType(null);
                        focusNotes();
                    }
                }}
                onClose={() => setOpenModalType(null)}
            />

            <SavedRoutePickerModal
                visible={routePickerOpen}
                onClose={() => setRoutePickerOpen(false)}
                onSelect={(route) => {
                    actions.applySavedRoute(route);
                    setRoutePickerOpen(false);
                }}
            />

            <ConfirmSubmitModal
                visible={confirmOpen}
                onCancel={() => setConfirmOpen(false)}
                onConfirm={onSubmit}
                loading={submitting || isUploadingImage}
            />

            <SaveRoutePromptModal
                visible={savePromptVisible}
                defaultTitle={defaultRouteTitle}
                loading={savingAddress}
                onSave={handleSaveRoute}
                onDismiss={handleDismissSavePrompt}
            />

            <CameraCaptureModal
                visible={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={handleCameraCapture}
            />

            <CameraCaptureModal
                visible={scanCameraOpen}
                onClose={() => setScanCameraOpen(false)}
                onCapture={handleScanCapture}
            />

            <CargoScanLoading visible={scanning} />
        </SafeAreaView>
    );
}

// ─── Stiller ─────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    scrollContent: { paddingBottom: 16 },

    notesLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    notesLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: PRIMARY,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginLeft: 2,
    },
    notesClearText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
    },

    customHeader: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        overflow: 'hidden',
    },
    customHeaderRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    headerTitleWrap: { flex: 1, height: '100%', justifyContent: 'center' },
    headerTitleLayer: { position: 'absolute', left: 0, right: 0 },
    headerIconLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    customHeaderTitle: {
        textAlign: 'center',
        fontWeight: '800',
        fontSize: 22,
    },
    headerBtn: {
        width: 38, height: 38,
        alignItems: 'center', justifyContent: 'center',
    },

    /* ── Hero ── */
    hero: {
        backgroundColor: BG,
    },
    dome: {
        position: 'absolute',
        top: -12,           // hafif yukarı → alt çizgi elips merkezi ile hizalı
        left: 0,
        zIndex: 1,
    },
    ellipse: {
        position: 'absolute',
        width: 360,
        height: 90,
        bottom: -3,         // merkez ≈ 42px → dome alt çizgisiyle hizalı
        zIndex: 3,
    },
    carouselList: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 4,
        backgroundColor: 'transparent',
    },
    carouselPage: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 0,       // araç elipsin tam ortasına oturur
        backgroundColor: 'transparent',
        overflow: 'visible',
    },
    mainVehicleImg: {
        // width yok, VEHICLES.aspectRatio genişliği kendi belirliyor.
    },

    aiField: {
        borderColor: BORDER_AI,
        borderWidth: 1.5,
    },

    /* ── Yük Tarat ── */
    scanRow: {
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 18,
        backgroundColor: BG,
    },
    /* ── Form ── */
    form: {
        paddingHorizontal: 20,
        paddingTop: 4,
    },

    deliveryRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 4,
    },
    deliveryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    deliveryBtnActive: {
        borderColor: PRIMARY,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    radioOn: {
        backgroundColor: PRIMARY,
    },
    radioOff: {
        borderWidth: 2,
        borderColor: PRIMARY,
        backgroundColor: 'transparent',
    },
    deliveryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    deliveryLabelActive: {
        color: '#111827',
        fontWeight: '700',
    },

    dateRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 4,
    },

    vehicleField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginTop: 12,
        marginBottom: 4,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    vehicleFieldText: { fontSize: 14, color: '#6B7280' },
    vehicleFieldBold: { fontWeight: '700', color: '#111827' },

    savedRouteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFF0E8',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginTop: 12,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    savedRouteText: { flex: 1, fontSize: 14, fontWeight: '700', color: PRIMARY },

    locationBlock: { marginTop: 12 },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 6,
        marginLeft: 2,
    },

    selectorsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 4,
    },
    selectorBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    selectorInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 13,
    },
    selectorText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },

    couponRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 12,
    },
    couponBtn: {
        height: 48,
        paddingHorizontal: 18,
        borderRadius: 16,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    couponBtnDisabled: { backgroundColor: '#FDBA74' },
    couponBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    couponErrorText: { color: '#DC2626', fontSize: 12, marginTop: 4, marginLeft: 2 },

    extraServicesCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    extraServicesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    extraServicesTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },

    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    amountLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    amountLabelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    amountInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minWidth: 120,
        borderWidth: 1.5,
        borderColor: PRIMARY,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    amountCurrency: { fontSize: 15, fontWeight: '700', color: '#111827' },
    amountValueText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'right' },

    bottomBar: {
        marginTop: 16,
    },
    submitBtn: {
        height: 56,
        borderRadius: 16,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    submitBtnBusy: { backgroundColor: '#FDBA74', shadowOpacity: 0 },
    submitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    submitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
