import TicarimStepIndicator from '@/components/TicarimStepIndicator';
import { patchTicarimDraft } from '@/store/feature/ticarim/actions';
import { useTicarimDraft } from '@/store/feature/ticarim/hooks';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, LayoutAnimation, LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { fillRandomTicarimDraft } from '@/utils/ticarimTestFill';
import Tappable from '@/components/Tappable';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const MIN_SLOTS = 3;
const MAX_PHOTOS = 9;
const GAP = 10;
const COLUMNS = 3;
const SPRING = { damping: 22, stiffness: 200, mass: 0.6 };
const LONG_PRESS_MS = 150;

type Positions = Record<string, number>;

function DraggablePhotoTile({
    uri,
    isCover,
    initialIndex,
    positions,
    tileSize,
    count,
    activeUri,
    setActiveUri,
    onDragStart,
    commit,
    onRemove,
}: {
    uri: string;
    isCover: boolean;
    initialIndex: number;
    positions: SharedValue<Positions>;
    tileSize: number;
    count: number;
    activeUri: string | null;
    setActiveUri: (uri: string | null) => void;
    onDragStart: () => void;
    commit: (positions: Positions) => void;
    onRemove: () => void;
}) {
    const slot = tileSize + GAP;
    const posToXY = (i: number) => {
        'worklet';
        return { x: (i % COLUMNS) * slot, y: Math.floor(i / COLUMNS) * slot };
    };

    const start = posToXY(initialIndex);
    const translateX = useSharedValue(start.x);
    const translateY = useSharedValue(start.y);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const dragging = useSharedValue(false);

    useAnimatedReaction(
        () => positions.value[uri],
        (pos, prevPos) => {
            if (pos !== prevPos && pos !== undefined && !dragging.value) {
                const { x, y } = posToXY(pos);
                translateX.value = withSpring(x, SPRING);
                translateY.value = withSpring(y, SPRING);
            }
        },
    );

    const pan = Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
            dragging.value = true;
            startX.value = translateX.value;
            startY.value = translateY.value;
            runOnJS(setActiveUri)(uri);
            runOnJS(onDragStart)();
        })
        .onUpdate((e) => {
            translateX.value = startX.value + e.translationX;
            translateY.value = startY.value + e.translationY;

            const col = Math.min(COLUMNS - 1, Math.max(0, Math.round(translateX.value / slot)));
            const row = Math.max(0, Math.round(translateY.value / slot));
            const newIndex = Math.min(count - 1, Math.max(0, row * COLUMNS + col));
            const oldIndex = positions.value[uri];
            if (newIndex !== oldIndex) {
                const next: Positions = { ...positions.value };
                for (const key in next) {
                    if (next[key] === newIndex) next[key] = oldIndex;
                }
                next[uri] = newIndex;
                positions.value = next;
            }
        })
        .onEnd(() => {
            dragging.value = false;
            const { x, y } = posToXY(positions.value[uri]);
            translateX.value = withSpring(x, SPRING);
            translateY.value = withSpring(y, SPRING);
            runOnJS(setActiveUri)(null);
            runOnJS(commit)(positions.value);
        });

    const isActive = activeUri === uri;

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: withSpring(dragging.value ? 1.05 : 1, SPRING) },
        ],
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                style={[
                    { position: 'absolute', left: 0, top: 0, width: tileSize, height: tileSize },
                    { zIndex: isActive ? 20 : 1, elevation: isActive ? 20 : 1 },
                    animStyle,
                ]}
            >
                <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 18 }} resizeMode="cover" />
                {isCover && (
                    <View className="absolute bottom-1.5 left-1.5 bg-primary rounded-full px-2 py-0.5">
                        <Text className="text-white text-[10px] font-bold">Kapak</Text>
                    </View>
                )}
                <Tappable haptic="light"
                    onPress={onRemove}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/55 rounded-full items-center justify-center"
                >
                    <Feather name="x" size={13} color="#fff" />
                </Tappable>
            </Animated.View>
        </GestureDetector>
    );
}

export default function TicarimAddPhotosScreen() {
    const router = useRouter();
    const draft = useTicarimDraft();
    const [photos, setPhotos] = useState<string[]>(draft.photos.slice(0, MAX_PHOTOS));
    const [hasDragged, setHasDragged] = useState(false);
    const [activeUri, setActiveUri] = useState<string | null>(null);
    const [gridWidth, setGridWidth] = useState(0);

    const slotCount = Math.min(MAX_PHOTOS, Math.max(MIN_SLOTS, photos.length + 2));
    const tileSize = gridWidth > 0 ? (gridWidth - GAP * (COLUMNS - 1)) / COLUMNS : 0;
    const rows = Math.ceil(slotCount / COLUMNS);
    const gridHeight = tileSize > 0 ? rows * tileSize + (rows - 1) * GAP : 0;

    const positions = useSharedValue<Positions>(Object.fromEntries(photos.map((uri, i) => [uri, i])));
    const photosKey = photos.join('|');
    useEffect(() => {
        positions.value = Object.fromEntries(photos.map((uri, i) => [uri, i]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photosKey]);

    const posFor = (i: number) => ({
        x: (i % COLUMNS) * (tileSize + GAP),
        y: Math.floor(i / COLUMNS) * (tileSize + GAP),
    });

    const onGridLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);

    const addPhoto = (uri: string) => {
        setPhotos((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, uri]));
    };

    const pickFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
            return;
        }
        const remaining = MAX_PHOTOS - photos.length;
        if (remaining <= 0) return;
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
        });
        if (!res.canceled) res.assets.slice(0, remaining).forEach((asset) => addPhoto(asset.uri));
    };

    const pickFromCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermeniz gerekiyor.');
            return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
        if (!res.canceled && res.assets[0]) addPhoto(res.assets[0].uri);
    };

    const handleTitleLongPress = async () => {
        const filled = await fillRandomTicarimDraft();
        if (filled?.photos) setPhotos(filled.photos);
    };

    const handleAddSlotPress = () => {
        Alert.alert('Fotoğraf Seç', undefined, [
            { text: 'Kameradan Çek', onPress: pickFromCamera },
            { text: 'Galeriden Seç', onPress: pickFromGallery },
            { text: 'İptal', style: 'cancel' },
        ]);
    };

    const removePhoto = (uri: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPhotos((prev) => prev.filter((p) => p !== uri));
    };

    const handleDragStart = useCallback(() => {
        if (!hasDragged) setHasDragged(true);
    }, [hasDragged]);

    const commit = useCallback((finalPositions: Positions) => {
        const ordered = Object.keys(finalPositions).sort((a, b) => finalPositions[a] - finalPositions[b]);
        setPhotos(ordered);
    }, []);

    const handleConfirm = () => {
        if (!photos.length) {
            Alert.alert('Fotoğraf Gerekli', 'Devam etmek için en az bir kapak fotoğrafı ekleyin.');
            return;
        }
        patchTicarimDraft({ photos });
        router.push('/ticarim/create/details');
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
                <Pressable style={{ flex: 1, marginRight: 36 }} onLongPress={handleTitleLongPress} delayLongPress={10000}>
                    <Text className="text-white text-lg font-bold text-center">Araç Görsellerini Ekle</Text>
                </Pressable>
            </View>

            <View className="flex-1 bg-white">
                <TicarimStepIndicator step={1} />

                <View className="px-5 flex-1">
                    <Text className="text-gray-900 text-[16px] font-bold mb-1">Fotoğrafları ekle</Text>
                    <Text className="text-gray-400 text-[13px]">
                        İlk eklenen fotoğraf kapak olarak kullanılacaktır.
                    </Text>
                    {photos.length >= 2 && !hasDragged && (
                        <Text className="text-gray-400 text-[12px] mt-1.5">
                            Sırasını değiştirmek için fotoğrafları sürükleyebilirsiniz.
                        </Text>
                    )}

                    <View
                        onLayout={onGridLayout}
                        style={{ marginTop: 20, height: gridHeight, width: '100%' }}
                    >
                        {tileSize > 0 &&
                            Array.from({ length: slotCount }).map((_, i) => {
                                if (i < photos.length) {
                                    const uri = photos[i];
                                    return (
                                        <DraggablePhotoTile
                                            key={uri}
                                            uri={uri}
                                            isCover={i === 0}
                                            initialIndex={i}
                                            positions={positions}
                                            tileSize={tileSize}
                                            count={photos.length}
                                            activeUri={activeUri}
                                            setActiveUri={setActiveUri}
                                            onDragStart={handleDragStart}
                                            commit={commit}
                                            onRemove={() => removePhoto(uri)}
                                        />
                                    );
                                }
                                const pos = posFor(i);
                                return (
                                    <Tappable
                                        key={`empty-${i}`}
                                        onPress={handleAddSlotPress}
                                        activeOpacity={0.7}
                                        style={{
                                            position: 'absolute',
                                            left: pos.x,
                                            top: pos.y,
                                            width: tileSize,
                                            height: tileSize,
                                        }}
                                        className="rounded-2xl border-2 border-dashed border-gray-200 items-center justify-center bg-gray-50"
                                    >
                                        <Feather name={i === 0 ? 'camera' : 'plus'} size={26} color="#9CA3AF" />
                                    </Tappable>
                                );
                            })}
                    </View>
                </View>

                <View className="px-5 pb-6">
                    <Tappable
                        onPress={handleConfirm}
                        activeOpacity={0.85}
                        className="bg-primary rounded-full py-4 items-center"
                        style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    >
                        <Text className="text-white font-bold text-[15px]">Onayla</Text>
                    </Tappable>
                </View>
            </View>
        </SafeAreaView>
    );
}
