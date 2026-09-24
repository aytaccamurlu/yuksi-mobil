import { Feather } from '@expo/vector-icons';
import { CameraCapturedPicture, CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import Tappable from '@/components/Tappable';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

const MAX_PHOTOS = 8;
const FLASH_CYCLE: FlashMode[] = ['off', 'on', 'auto'];
const FLASH_ICON: Record<FlashMode, keyof typeof Feather.glyphMap> = {
    off: 'zap-off',
    on: 'zap',
    auto: 'zap',
};
const STICKER_EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '❤️', '🎉', '😎', '🙌', '⭐️', '💯', '👏'];
const DRAW_COLORS = ['#FFFFFF', '#FF3B30', '#FFCC00', '#34C759', '#0A84FF', '#000000'];
const BRUSH_SIZES = [3, 6, 10];
const HD_QUALITY = 0.9;
const SD_QUALITY = 0.6;

const clamp = (v: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(v, min), max);
};

type CapturedPhoto = { uri: string; width: number; height: number; caption?: string };
type Point = { x: number; y: number };
type StickerItem = { id: string; emoji: string };
type TextAlignT = 'left' | 'center' | 'right';
type TextStyleMode = 'plain' | 'bold' | 'highlight';
type TextItemT = { id: string; text: string; color: string; align: TextAlignT; styleMode: TextStyleMode };

const TEXT_COLORS = ['#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#0A84FF', '#5E5CE6', '#AF52DE', '#000000'];
const TEXT_ALIGN_ICON: Record<TextAlignT, keyof typeof Feather.glyphMap> = {
    left: 'align-left',
    center: 'align-center',
    right: 'align-right',
};
const NEXT_ALIGN: Record<TextAlignT, TextAlignT> = { left: 'center', center: 'right', right: 'left' };
const NEXT_STYLE_MODE: Record<TextStyleMode, TextStyleMode> = { plain: 'bold', bold: 'highlight', highlight: 'plain' };

const isLightColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};
type DrawPathT = { id: string; color: string; width: number; points: Point[] };
type CropRectT = { x: number; y: number; width: number; height: number };

const pointsToStr = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

async function getImageSize(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });
}

function DraggableOverlay({
    initialX,
    initialY,
    centered,
    onTap,
    children,
}: {
    initialX: number;
    initialY: number;
    centered?: boolean;
    onTap?: () => void;
    children: React.ReactNode;
}) {
    const translateX = useSharedValue(initialX);
    const translateY = useSharedValue(initialY);
    const startX = useSharedValue(initialX);
    const startY = useSharedValue(initialY);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const savedRotation = useSharedValue(0);
    const entrance = useSharedValue(0);

    useEffect(() => {
        entrance.value = withSpring(1, { damping: 14, stiffness: 160 });
    }, []);

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = startX.value + e.translationX;
            translateY.value = startY.value + e.translationY;
        })
        .onEnd(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;
        });

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = clamp(savedScale.value * e.scale, 0.4, 5);
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const rotate = Gesture.Rotation()
        .onUpdate((e) => {
            rotation.value = savedRotation.value + e.rotation;
        })
        .onEnd(() => {
            savedRotation.value = rotation.value;
        });

    const tap = Gesture.Tap()
        .maxDuration(250)
        .maxDistance(8)
        .onEnd(() => {
            if (onTap) runOnJS(onTap)();
        });

    const composed = onTap ? Gesture.Simultaneous(pan, pinch, rotate, tap) : Gesture.Simultaneous(pan, pinch, rotate);

    const style = useAnimatedStyle(() => ({
        position: 'absolute',
        opacity: entrance.value,
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value * entrance.value },
            { rotateZ: `${rotation.value}rad` },
        ],
    }));

    const onLayout = centered
        ? (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
              const { width, height } = e.nativeEvent.layout;
              translateX.value = initialX - width / 2;
              translateY.value = initialY - height / 2;
              startX.value = translateX.value;
              startY.value = translateY.value;
          }
        : undefined;

    return (
        <GestureDetector gesture={composed}>
            <Animated.View style={style} onLayout={onLayout}>{children}</Animated.View>
        </GestureDetector>
    );
}

const MIN_CROP_SIZE = 60;
const HANDLE_VISUAL = 20;
type Corner = 'tl' | 'tr' | 'bl' | 'br';
type Edge = 'top' | 'bottom' | 'left' | 'right';
const HANDLE_HIT = 48;
const MAGNIFIER_SIZE = 68;

function CropOverlay({
    photo,
    frameW,
    frameH,
    initialRect,
    onCancel,
    onConfirm,
}: {
    photo: CapturedPhoto;
    frameW: number;
    frameH: number;
    initialRect?: CropRectT | null;
    onCancel: () => void;
    onConfirm: (rect: CropRectT) => void;
}) {
    const baseScale = Math.min(frameW / photo.width, frameH / photo.height) * 0.72;
    const dispW = photo.width * baseScale;
    const dispH = photo.height * baseScale;
    const imgLeft = (frameW - dispW) / 2;
    const imgTop = (frameH - dispH) / 2;

    const initX = initialRect ? initialRect.x * baseScale : 0;
    const initY = initialRect ? initialRect.y * baseScale : 0;
    const initW = initialRect ? initialRect.width * baseScale : dispW;
    const initH = initialRect ? initialRect.height * baseScale : dispH;

    const rectX = useSharedValue(initX);
    const rectY = useSharedValue(initY);
    const rectW = useSharedValue(initW);
    const rectH = useSharedValue(initH);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const startW = useSharedValue(dispW);
    const startH = useSharedValue(dispH);

    const moveGesture = Gesture.Pan()
        .onBegin(() => {
            startX.value = rectX.value;
            startY.value = rectY.value;
        })
        .onUpdate((e) => {
            rectX.value = clamp(startX.value + e.translationX, 0, dispW - rectW.value);
            rectY.value = clamp(startY.value + e.translationY, 0, dispH - rectH.value);
        });

    const makeCornerGesture = (corner: Corner) =>
        Gesture.Pan()
            .onBegin(() => {
                startX.value = rectX.value;
                startY.value = rectY.value;
                startW.value = rectW.value;
                startH.value = rectH.value;
            })
            .onUpdate((e) => {
                const e0 = e.translationX;
                const e1 = e.translationY;
                if (corner === 'tl') {
                    const dx = clamp(e0, -startX.value, startW.value - MIN_CROP_SIZE);
                    const dy = clamp(e1, -startY.value, startH.value - MIN_CROP_SIZE);
                    rectX.value = startX.value + dx;
                    rectY.value = startY.value + dy;
                    rectW.value = startW.value - dx;
                    rectH.value = startH.value - dy;
                } else if (corner === 'tr') {
                    const dx = clamp(e0, MIN_CROP_SIZE - startW.value, dispW - (startX.value + startW.value));
                    const dy = clamp(e1, -startY.value, startH.value - MIN_CROP_SIZE);
                    rectY.value = startY.value + dy;
                    rectW.value = startW.value + dx;
                    rectH.value = startH.value - dy;
                } else if (corner === 'bl') {
                    const dx = clamp(e0, -startX.value, startW.value - MIN_CROP_SIZE);
                    const dy = clamp(e1, MIN_CROP_SIZE - startH.value, dispH - (startY.value + startH.value));
                    rectX.value = startX.value + dx;
                    rectW.value = startW.value - dx;
                    rectH.value = startH.value + dy;
                } else {
                    const dx = clamp(e0, MIN_CROP_SIZE - startW.value, dispW - (startX.value + startW.value));
                    const dy = clamp(e1, MIN_CROP_SIZE - startH.value, dispH - (startY.value + startH.value));
                    rectW.value = startW.value + dx;
                    rectH.value = startH.value + dy;
                }
            });

    const tlGesture = makeCornerGesture('tl');
    const trGesture = makeCornerGesture('tr');
    const blGesture = makeCornerGesture('bl');
    const brGesture = makeCornerGesture('br');

    const makeEdgeGesture = (edge: Edge) =>
        Gesture.Pan()
            .onBegin(() => {
                startX.value = rectX.value;
                startY.value = rectY.value;
                startW.value = rectW.value;
                startH.value = rectH.value;
            })
            .onUpdate((e) => {
                const e0 = e.translationX;
                const e1 = e.translationY;
                if (edge === 'top') {
                    const dy = clamp(e1, -startY.value, startH.value - MIN_CROP_SIZE);
                    rectY.value = startY.value + dy;
                    rectH.value = startH.value - dy;
                } else if (edge === 'bottom') {
                    const dy = clamp(e1, MIN_CROP_SIZE - startH.value, dispH - (startY.value + startH.value));
                    rectH.value = startH.value + dy;
                } else if (edge === 'left') {
                    const dx = clamp(e0, -startX.value, startW.value - MIN_CROP_SIZE);
                    rectX.value = startX.value + dx;
                    rectW.value = startW.value - dx;
                } else {
                    const dx = clamp(e0, MIN_CROP_SIZE - startW.value, dispW - (startX.value + startW.value));
                    rectW.value = startW.value + dx;
                }
            });

    const topEdgeGesture = makeEdgeGesture('top');
    const bottomEdgeGesture = makeEdgeGesture('bottom');
    const leftEdgeGesture = makeEdgeGesture('left');
    const rightEdgeGesture = makeEdgeGesture('right');

    const rectStyle = useAnimatedStyle(() => ({
        left: rectX.value,
        top: rectY.value,
        width: rectW.value,
        height: rectH.value,
    }));
    const topMaskStyle = useAnimatedStyle(() => ({ left: 0, top: 0, width: dispW, height: rectY.value }));
    const bottomMaskStyle = useAnimatedStyle(() => ({
        left: 0,
        top: rectY.value + rectH.value,
        width: dispW,
        height: dispH - (rectY.value + rectH.value),
    }));
    const leftMaskStyle = useAnimatedStyle(() => ({ left: 0, top: rectY.value, width: rectX.value, height: rectH.value }));
    const rightMaskStyle = useAnimatedStyle(() => ({
        left: rectX.value + rectW.value,
        top: rectY.value,
        width: dispW - (rectX.value + rectW.value),
        height: rectH.value,
    }));
    const vLine1Style = useAnimatedStyle(() => ({ left: rectX.value + rectW.value / 3, top: rectY.value, height: rectH.value }));
    const vLine2Style = useAnimatedStyle(() => ({ left: rectX.value + (rectW.value * 2) / 3, top: rectY.value, height: rectH.value }));
    const hLine1Style = useAnimatedStyle(() => ({ left: rectX.value, top: rectY.value + rectH.value / 3, width: rectW.value }));
    const hLine2Style = useAnimatedStyle(() => ({ left: rectX.value, top: rectY.value + (rectH.value * 2) / 3, width: rectW.value }));
    const tlHandleStyle = useAnimatedStyle(() => ({ left: rectX.value - HANDLE_HIT / 2, top: rectY.value - HANDLE_HIT / 2 }));
    const trHandleStyle = useAnimatedStyle(() => ({
        left: rectX.value + rectW.value - HANDLE_HIT / 2,
        top: rectY.value - HANDLE_HIT / 2,
    }));
    const blHandleStyle = useAnimatedStyle(() => ({
        left: rectX.value - HANDLE_HIT / 2,
        top: rectY.value + rectH.value - HANDLE_HIT / 2,
    }));
    const brHandleStyle = useAnimatedStyle(() => ({
        left: rectX.value + rectW.value - HANDLE_HIT / 2,
        top: rectY.value + rectH.value - HANDLE_HIT / 2,
    }));
    const topEdgeStyle = useAnimatedStyle(() => ({
        left: rectX.value + rectW.value / 2 - HANDLE_HIT / 2,
        top: rectY.value - HANDLE_HIT / 2,
    }));
    const bottomEdgeStyle = useAnimatedStyle(() => ({
        left: rectX.value + rectW.value / 2 - HANDLE_HIT / 2,
        top: rectY.value + rectH.value - HANDLE_HIT / 2,
    }));
    const leftEdgeStyle = useAnimatedStyle(() => ({
        left: rectX.value - HANDLE_HIT / 2,
        top: rectY.value + rectH.value / 2 - HANDLE_HIT / 2,
    }));
    const rightEdgeStyle = useAnimatedStyle(() => ({
        left: rectX.value + rectW.value - HANDLE_HIT / 2,
        top: rectY.value + rectH.value / 2 - HANDLE_HIT / 2,
    }));

    const confirm = () => {
        const toOriginal = 1 / baseScale;
        onConfirm({
            x: Math.max(0, Math.round(rectX.value * toOriginal)),
            y: Math.max(0, Math.round(rectY.value * toOriginal)),
            width: Math.round(rectW.value * toOriginal),
            height: Math.round(rectH.value * toOriginal),
        });
    };

    return (
        <View style={s.cropOverlayRoot}>
            <SafeAreaView edges={['top']} style={s.textEditHeader}>
                <Tappable onPress={onCancel} style={s.iconBtnDark} hitSlop={10}>
                    <Feather name="x" size={20} color="#fff" />
                </Tappable>
                <Tappable haptic="medium" onPress={confirm} style={s.textEditCheck} hitSlop={10}>
                    <Feather name="check" size={20} color="#fff" />
                </Tappable>
            </SafeAreaView>

            <View style={s.cropCenter}>
                <View style={[s.cropImageBox, { width: frameW, height: frameH }]}>
                    <View style={{ position: 'absolute', left: imgLeft, top: imgTop, width: dispW, height: dispH }}>
                        <Image source={{ uri: photo.uri }} style={{ width: dispW, height: dispH }} />

                        <Animated.View style={[s.cropMask, topMaskStyle]} pointerEvents="none" />
                        <Animated.View style={[s.cropMask, bottomMaskStyle]} pointerEvents="none" />
                        <Animated.View style={[s.cropMask, leftMaskStyle]} pointerEvents="none" />
                        <Animated.View style={[s.cropMask, rightMaskStyle]} pointerEvents="none" />

                        <GestureDetector gesture={moveGesture}>
                            <Animated.View style={[s.cropRect, rectStyle]} />
                        </GestureDetector>

                        <Animated.View style={[s.cropGridLineV, vLine1Style]} pointerEvents="none" />
                        <Animated.View style={[s.cropGridLineV, vLine2Style]} pointerEvents="none" />
                        <Animated.View style={[s.cropGridLineH, hLine1Style]} pointerEvents="none" />
                        <Animated.View style={[s.cropGridLineH, hLine2Style]} pointerEvents="none" />

                        <GestureDetector gesture={topEdgeGesture}>
                            <Animated.View style={[s.cropHandleHit, topEdgeStyle]}>
                                <View style={s.cropEdgeBarH} />
                            </Animated.View>
                        </GestureDetector>
                        <GestureDetector gesture={bottomEdgeGesture}>
                            <Animated.View style={[s.cropHandleHit, bottomEdgeStyle]}>
                                <View style={s.cropEdgeBarH} />
                            </Animated.View>
                        </GestureDetector>
                        <GestureDetector gesture={leftEdgeGesture}>
                            <Animated.View style={[s.cropHandleHit, leftEdgeStyle]}>
                                <View style={s.cropEdgeBarV} />
                            </Animated.View>
                        </GestureDetector>
                        <GestureDetector gesture={rightEdgeGesture}>
                            <Animated.View style={[s.cropHandleHit, rightEdgeStyle]}>
                                <View style={s.cropEdgeBarV} />
                            </Animated.View>
                        </GestureDetector>

                        <GestureDetector gesture={tlGesture}>
                            <Animated.View style={[s.cropHandleHit, tlHandleStyle]}>
                                <View style={[s.cropHandle, s.cropHandleTL]} />
                            </Animated.View>
                        </GestureDetector>
                        <GestureDetector gesture={trGesture}>
                            <Animated.View style={[s.cropHandleHit, trHandleStyle]}>
                                <View style={[s.cropHandle, s.cropHandleTR]} />
                            </Animated.View>
                        </GestureDetector>
                        <GestureDetector gesture={blGesture}>
                            <Animated.View style={[s.cropHandleHit, blHandleStyle]}>
                                <View style={[s.cropHandle, s.cropHandleBL]} />
                            </Animated.View>
                        </GestureDetector>
                        <GestureDetector gesture={brGesture}>
                            <Animated.View style={[s.cropHandleHit, brHandleStyle]}>
                                <View style={[s.cropHandle, s.cropHandleBR]} />
                            </Animated.View>
                        </GestureDetector>
                    </View>
                </View>
            </View>
        </View>
    );
}

function TextEditOverlay({
    photo,
    initial,
    onCancel,
    onConfirm,
}: {
    photo: CapturedPhoto;
    initial?: TextItemT | null;
    onCancel: () => void;
    onConfirm: (item: TextItemT) => void;
}) {
    const { width: winW, height: winH } = useWindowDimensions();
    const [text, setText] = useState(initial?.text ?? '');
    const [color, setColor] = useState(initial?.color ?? TEXT_COLORS[0]);
    const [align, setAlign] = useState<TextAlignT>(initial?.align ?? 'center');
    const [styleMode, setStyleMode] = useState<TextStyleMode>(initial?.styleMode ?? 'plain');
    const [pickingColor, setPickingColor] = useState(false);
    const [pickerY, setPickerY] = useState(0);

    const aspect = photo.width / photo.height;
    let bgW = winW;
    let bgH = bgW / aspect;
    if (bgH < winH) {
        bgH = winH;
        bgW = bgH * aspect;
    }

    const sliderHeight = Math.max(180, Math.min(260, winH * 0.32));
    const sliderTop = winH * 0.22;

    const pickColorAt = (y: number) => {
        const clamped = clamp(y, 0, sliderHeight);
        const ratio = clamp(clamped / sliderHeight, 0, 1);
        const idx = Math.min(TEXT_COLORS.length - 1, Math.floor(ratio * TEXT_COLORS.length));
        setColor(TEXT_COLORS[idx]);
        setPickerY(clamped);
    };

    const sliderPan = useMemo(
        () =>
            Gesture.Pan()
                .onBegin((e) => {
                    runOnJS(setPickingColor)(true);
                    runOnJS(pickColorAt)(e.y);
                })
                .onUpdate((e) => runOnJS(pickColorAt)(e.y))
                .onEnd(() => runOnJS(setPickingColor)(false)),
        [sliderHeight],
    );

    const confirm = () => {
        const trimmed = text.trim();
        if (trimmed) {
            onConfirm({ id: initial?.id ?? `text-${Date.now()}`, text: trimmed, color, align, styleMode });
        } else {
            onCancel();
        }
    };

    const highlightTextColor = isLightColor(color) ? '#000' : '#fff';
    const alignItemsFor: Record<TextAlignT, 'flex-start' | 'center' | 'flex-end'> = {
        left: 'flex-start',
        center: 'center',
        right: 'flex-end',
    };

    return (
        <View style={s.textEditRoot}>
            <Image source={{ uri: photo.uri }} style={[StyleSheet.absoluteFill, { width: bgW, height: bgH, left: (winW - bgW) / 2, top: (winH - bgH) / 2 }]} />
            <View style={[StyleSheet.absoluteFill, s.textEditDim]} />

            <SafeAreaView edges={['top']} style={s.textEditHeader}>
                <Tappable onPress={onCancel} style={s.iconBtnDark} hitSlop={10}>
                    <Feather name="x" size={20} color="#fff" />
                </Tappable>
                <View style={s.textEditHeaderRight}>
                    <Tappable onPress={() => setAlign(NEXT_ALIGN[align])} style={s.iconBtnDark} hitSlop={10}>
                        <Feather name={TEXT_ALIGN_ICON[align]} size={18} color="#fff" />
                    </Tappable>
                    <Tappable onPress={() => setStyleMode(NEXT_STYLE_MODE[styleMode])} style={s.iconBtnDark} hitSlop={10}>
                        <Text style={s.textEditStyleIcon}>A+</Text>
                    </Tappable>
                    <Tappable onPress={confirm} style={s.textEditCheck} hitSlop={10}>
                        <Feather name="check" size={20} color="#fff" />
                    </Tappable>
                </View>
            </SafeAreaView>

            <View style={[s.textEditCenter, { alignItems: alignItemsFor[align] }]} pointerEvents="box-none">
                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Metin ekle"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={[
                        s.textEditInput,
                        { textAlign: align, color: styleMode === 'highlight' ? highlightTextColor : color },
                        styleMode === 'bold' && s.textEditBold,
                        styleMode === 'highlight' && {
                            backgroundColor: color,
                            alignSelf: alignItemsFor[align],
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                        },
                    ]}
                    autoFocus
                    multiline
                />
            </View>

            {pickingColor && (
                <View style={[s.colorMagnifier, { top: sliderTop + pickerY - MAGNIFIER_SIZE / 2 }]}>
                    <View style={[s.colorMagnifierSwatch, { backgroundColor: color }]} />
                </View>
            )}

            <GestureDetector gesture={sliderPan}>
                <View style={[s.textEditSliderTrack, { height: sliderHeight, top: sliderTop }]}>
                    <LinearGradient colors={TEXT_COLORS as unknown as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
                </View>
            </GestureDetector>
        </View>
    );
}

function PhotoEditStep({
    photo,
    onDiscard,
    onConfirm,
    onAddMore,
    queuedCount = 0,
    sendMode,
}: {
    photo: CameraCapturedPicture;
    onDiscard: () => void;
    onConfirm: (photo: CapturedPhoto) => void;
    onAddMore?: (photo: CapturedPhoto) => void;
    queuedCount?: number;
    sendMode?: { onSend: (photo: CapturedPhoto) => void; placeholder?: string };
}) {
    const { width: winW, height: winH } = useWindowDimensions();
    const previewRef = useRef<View>(null);

    const [cropRect, setCropRect] = useState<CropRectT | null>(null);
    const [caption, setCaption] = useState('');
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [quality, setQuality] = useState<'hd' | 'sd'>('hd');
    const [cropOpen, setCropOpen] = useState(false);
    const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
    const [textPromptOpen, setTextPromptOpen] = useState(false);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [drawMode, setDrawMode] = useState(false);
    const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
    const [brushWidth, setBrushWidth] = useState(BRUSH_SIZES[1]);
    const drawSnapshotRef = useRef<DrawPathT[]>([]);

    const [stickers, setStickers] = useState<StickerItem[]>([]);
    const [texts, setTexts] = useState<TextItemT[]>([]);
    const [paths, setPaths] = useState<DrawPathT[]>([]);
    const [currentPathPts, setCurrentPathPts] = useState<Point[]>([]);

    const effectiveW = cropRect?.width ?? photo.width;
    const effectiveH = cropRect?.height ?? photo.height;
    const aspect = effectiveW / effectiveH;
    let dispW = winW;
    let dispH = dispW / aspect;
    if (dispH > winH) {
        dispH = winH;
        dispW = dispH * aspect;
    }
    const cropViewScale = cropRect ? dispW / cropRect.width : dispW / photo.width;
    const fullImgW = photo.width * cropViewScale;
    const fullImgH = photo.height * cropViewScale;
    const imgOffsetX = cropRect ? -cropRect.x * cropViewScale : 0;
    const imgOffsetY = cropRect ? -cropRect.y * cropViewScale : 0;

    const fullAspect = photo.width / photo.height;
    let cropFrameW = winW;
    let cropFrameH = cropFrameW / fullAspect;
    if (cropFrameH > winH) {
        cropFrameH = winH;
        cropFrameW = cropFrameH * fullAspect;
    }

    const beginPath = (x: number, y: number) => setCurrentPathPts([{ x, y }]);
    const addPoint = (x: number, y: number) => setCurrentPathPts((prev) => [...prev, { x, y }]);
    const commitPath = () => {
        setCurrentPathPts((prev) => {
            if (prev.length > 1) {
                setPaths((all) => [...all, { id: `path-${Date.now()}`, color: drawColor, width: brushWidth, points: prev }]);
            }
            return [];
        });
    };

    const drawGesture = useMemo(
        () =>
            Gesture.Pan()
                .enabled(drawMode)
                .onBegin((e) => {
                    runOnJS(beginPath)(e.x, e.y);
                })
                .onUpdate((e) => {
                    runOnJS(addPoint)(e.x, e.y);
                })
                .onEnd(() => {
                    runOnJS(commitPath)();
                }),
        [drawMode, drawColor, brushWidth],
    );

    const enterDrawMode = () => {
        drawSnapshotRef.current = paths;
        setDrawMode(true);
    };

    const cancelDrawMode = () => {
        setPaths(drawSnapshotRef.current);
        setCurrentPathPts([]);
        setDrawMode(false);
    };

    const confirmDrawMode = () => setDrawMode(false);

    const addSticker = (emoji: string) => {
        setStickers((prev) => [...prev, { id: `sticker-${Date.now()}`, emoji }]);
        setStickerPickerOpen(false);
    };


    const undoDraw = () => setPaths((prev) => prev.slice(0, -1));

    const hasEdits =
        stickers.length > 0 ||
        texts.length > 0 ||
        paths.length > 0 ||
        cropRect !== null ||
        caption.trim().length > 0 ||
        queuedCount > 0;

    const requestDiscard = () => {
        if (!hasEdits) {
            onDiscard();
            return;
        }
        Alert.alert('Emin misin?', 'Eklediğin sticker, metin, çizim veya kırpma kaybolacak.', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: onDiscard },
        ]);
    };

    const flatten = async (): Promise<CapturedPhoto> => {
        const uri = await captureRef(previewRef, {
            format: 'jpg',
            quality: quality === 'hd' ? HD_QUALITY : SD_QUALITY,
            result: 'tmpfile',
        });
        const size = await getImageSize(uri);
        return { uri, ...size };
    };

    const confirm = async () => {
        setSaving(true);
        try {
            const flattened = await flatten();
            const trimmedCaption = caption.trim();
            if (sendMode) {
                sendMode.onSend({ ...flattened, caption: trimmedCaption || undefined });
            } else {
                onConfirm(flattened);
            }
        } catch {
            Alert.alert('Fotoğraf İşlenemedi', 'Lütfen tekrar deneyin.');
        } finally {
            setSaving(false);
        }
    };

    const addAnother = async () => {
        if (!onAddMore) return;
        setSaving(true);
        try {
            const flattened = await flatten();
            const trimmedCaption = caption.trim();
            onAddMore({ ...flattened, caption: trimmedCaption || undefined });
        } catch {
            Alert.alert('Fotoğraf İşlenemedi', 'Lütfen tekrar deneyin.');
        } finally {
            setSaving(false);
        }
    };

    const download = async () => {
        setDownloading(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Galeriye kaydedebilmek için izin vermelisiniz.');
                return;
            }
            const flattened = await flatten();
            await MediaLibrary.saveToLibraryAsync(flattened.uri);
            Alert.alert('Kaydedildi', 'Fotoğraf galerinize kaydedildi.');
        } catch {
            Alert.alert('Kaydedilemedi', 'Lütfen tekrar deneyin.');
        } finally {
            setDownloading(false);
        }
    };

    if (cropOpen) {
        return (
            <CropOverlay
                photo={photo}
                frameW={cropFrameW}
                frameH={cropFrameH}
                initialRect={cropRect}
                onCancel={() => setCropOpen(false)}
                onConfirm={(rect) => {
                    setCropRect(rect);
                    setCropOpen(false);
                }}
            />
        );
    }

    if (textPromptOpen) {
        const editingItem = editingTextId ? texts.find((t) => t.id === editingTextId) ?? null : null;
        return (
            <TextEditOverlay
                photo={photo}
                initial={editingItem}
                onCancel={() => {
                    setTextPromptOpen(false);
                    setEditingTextId(null);
                }}
                onConfirm={(item) => {
                    if (editingTextId) {
                        setTexts((prev) => prev.map((t) => (t.id === editingTextId ? item : t)));
                    } else {
                        setTexts((prev) => [...prev, item]);
                    }
                    setTextPromptOpen(false);
                    setEditingTextId(null);
                }}
            />
        );
    }

    const focusMode = stickerPickerOpen || drawMode;

    return (
        <View style={s.root}>
            <View
                collapsable={false}
                ref={previewRef}
                style={[s.previewBoxFull, { width: dispW, height: dispH, left: (winW - dispW) / 2, top: (winH - dispH) / 2 }]}
            >
                {loadFailed ? (
                    <Text style={s.cropLoadError}>Fotoğraf yüklenemedi</Text>
                ) : (
                    <>
                        <Pressable onPress={() => Keyboard.dismiss()} style={StyleSheet.absoluteFill}>
                            <Image
                                source={{ uri: photo.uri }}
                                style={{ position: 'absolute', left: imgOffsetX, top: imgOffsetY, width: fullImgW, height: fullImgH }}
                                onError={() => setLoadFailed(true)}
                            />
                        </Pressable>
                        {paths.map((p) => (
                            <Svg key={p.id} style={StyleSheet.absoluteFill} pointerEvents="none">
                                <Polyline
                                    points={pointsToStr(p.points)}
                                    fill="none"
                                    stroke={p.color}
                                    strokeWidth={p.width}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        ))}
                        {currentPathPts.length > 1 && (
                            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                                <Polyline
                                    points={pointsToStr(currentPathPts)}
                                    fill="none"
                                    stroke={drawColor}
                                    strokeWidth={brushWidth}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        )}
                        {stickers.map((st, i) => (
                            <DraggableOverlay key={st.id} initialX={dispW / 2 - 22} initialY={dispH / 2 - 22 + i * 8}>
                                <Text style={s.stickerText}>{st.emoji}</Text>
                            </DraggableOverlay>
                        ))}
                        {texts.map((t, i) => (
                            <DraggableOverlay
                                key={t.id}
                                centered
                                initialX={dispW / 2}
                                initialY={dispH / 2 + i * 8}
                                onTap={() => {
                                    setEditingTextId(t.id);
                                    setTextPromptOpen(true);
                                }}
                            >
                                <Text
                                    style={[
                                        s.overlayText,
                                        { color: t.styleMode === 'highlight' ? (isLightColor(t.color) ? '#000' : '#fff') : t.color, textAlign: t.align },
                                        t.styleMode === 'bold' && s.textEditBold,
                                        t.styleMode === 'highlight' && { backgroundColor: t.color, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
                                    ]}
                                >
                                    {t.text}
                                </Text>
                            </DraggableOverlay>
                        ))}
                        {drawMode && (
                            <GestureDetector gesture={drawGesture}>
                                <View style={StyleSheet.absoluteFill} />
                            </GestureDetector>
                        )}
                    </>
                )}
            </View>

            {!focusMode && (
                <SafeAreaView edges={['top']} style={[s.editHeader, s.floatingTop]}>
                    <Tappable onPress={requestDiscard} style={s.iconBtn} hitSlop={10} disabled={saving || downloading}>
                        <Feather name="x" size={20} color="#fff" />
                    </Tappable>
                    <View style={s.editHeaderRight}>
                        <Tappable onPress={download} style={s.iconBtn} hitSlop={8} disabled={saving || downloading}>
                            {downloading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="download" size={18} color="#fff" />}
                        </Tappable>
                        <Tappable
                            onPress={() => setQuality((q) => (q === 'hd' ? 'sd' : 'hd'))}
                            style={[s.hdBadge, quality === 'hd' && s.hdBadgeActive]}
                            hitSlop={8}
                        >
                            <Text style={[s.hdBadgeText, quality === 'hd' && s.hdBadgeTextActive]}>HD</Text>
                        </Tappable>
                        <Tappable onPress={() => setCropOpen(true)} style={s.iconBtn} hitSlop={8} disabled={saving || downloading}>
                            <Feather name="crop" size={18} color="#fff" />
                        </Tappable>
                        <Tappable onPress={() => setStickerPickerOpen(true)} style={s.iconBtn} hitSlop={8} disabled={saving || downloading}>
                            <Feather name="smile" size={18} color="#fff" />
                        </Tappable>
                        <Tappable onPress={() => { setEditingTextId(null); setTextPromptOpen(true); }} style={s.iconBtn} hitSlop={8} disabled={saving || downloading}>
                            <Feather name="type" size={18} color="#fff" />
                        </Tappable>
                        <Tappable
                            onPress={enterDrawMode}
                            style={s.iconBtn}
                            hitSlop={8}
                            disabled={saving || downloading}
                        >
                            <Feather name="edit-2" size={18} color="#fff" />
                        </Tappable>
                    </View>
                </SafeAreaView>
            )}

            {drawMode && (
                <SafeAreaView edges={['top']} style={s.floatingTop}>
                    <View style={s.editHeader}>
                        <Tappable onPress={cancelDrawMode} style={s.iconBtnDark} hitSlop={10}>
                            <Feather name="x" size={20} color="#fff" />
                        </Tappable>
                        <Tappable onPress={confirmDrawMode} style={s.doneBtn}>
                            <Text style={s.doneBtnText}>Bitti</Text>
                        </Tappable>
                    </View>
                    <View style={s.drawPalette}>
                        {DRAW_COLORS.map((c) => (
                            <Tappable
                                key={c}
                                onPress={() => setDrawColor(c)}
                                style={[s.colorDot, { backgroundColor: c }, drawColor === c && s.colorDotActive]}
                            />
                        ))}
                        <Tappable onPress={undoDraw} style={s.undoBtn} disabled={!paths.length}>
                            <Feather name="rotate-ccw" size={16} color="#fff" />
                        </Tappable>
                    </View>
                </SafeAreaView>
            )}

            {drawMode && (
                <SafeAreaView edges={['bottom']} style={[s.brushSizeRow, s.floatingBottom]} pointerEvents="box-none">
                    {BRUSH_SIZES.map((size) => (
                        <Tappable
                            key={size}
                            onPress={() => setBrushWidth(size)}
                            style={[s.brushSizeBtn, brushWidth === size && s.brushSizeBtnActive]}
                        >
                            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff' }} />
                        </Tappable>
                    ))}
                </SafeAreaView>
            )}

            {stickerPickerOpen && (
                <SafeAreaView edges={['top']} style={[s.editHeader, s.floatingTop]}>
                    <Tappable onPress={() => setStickerPickerOpen(false)} style={s.iconBtnDark} hitSlop={10}>
                        <Feather name="x" size={20} color="#fff" />
                    </Tappable>
                </SafeAreaView>
            )}

            {stickerPickerOpen && (
                <SafeAreaView edges={['bottom']} style={[s.stickerPicker, s.floatingBottom]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.stickerPickerContent}>
                        {STICKER_EMOJIS.map((emoji) => (
                            <Tappable key={emoji} onPress={() => addSticker(emoji)} style={s.stickerOption}>
                                <Text style={s.stickerOptionText}>{emoji}</Text>
                            </Tappable>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            )}

            {!focusMode && (
                <KeyboardAvoidingView
                    style={StyleSheet.absoluteFill}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    pointerEvents="box-none"
                >
                    <View style={{ flex: 1 }} pointerEvents="none" />
                    <SafeAreaView edges={['bottom']} style={s.sendBar}>
                        {sendMode ? (
                            <>
                                <Tappable onPress={addAnother} style={s.plusBtn} hitSlop={8} disabled={saving || downloading || !onAddMore}>
                                    <Feather name="plus" size={20} color="#fff" />
                                    {queuedCount > 0 && (
                                        <View style={s.plusBadge}>
                                            <Text style={s.plusBadgeText}>{queuedCount}</Text>
                                        </View>
                                    )}
                                </Tappable>
                                <TextInput
                                    value={caption}
                                    onChangeText={setCaption}
                                    placeholder={sendMode.placeholder || 'Mesaj yazın...'}
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    style={s.sendBarInput}
                                    multiline
                                />
                            </>
                        ) : (
                            <View style={s.sendBarField}>
                                <Text style={s.sendBarFieldText} numberOfLines={1}>
                                    Fotoğrafı gönder
                                </Text>
                            </View>
                        )}
                        <Tappable haptic="medium" onPress={confirm} style={s.sendBtnCircle} disabled={saving || downloading || loadFailed}>
                            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="arrow-right" size={22} color="#fff" />}
                        </Tappable>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            )}

        </View>
    );
}

type SendMode = {
    onSend: (photos: CapturedPhoto[]) => void;
    placeholder?: string;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    onCapture: (photos: CapturedPhoto[]) => void;
    sendMode?: SendMode;
};

export default function CameraCaptureModal({ visible, onClose, onCapture, sendMode }: Props) {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [cameraReady, setCameraReady] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [pendingPhoto, setPendingPhoto] = useState<CameraCapturedPicture | null>(null);
    const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
    const cameraRef = useRef<CameraView>(null);
    const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (visible && !permission?.granted) requestPermission();
    }, [visible]);

    useEffect(() => {
        if (!visible) {
            setPhotos([]);
            setPendingPhoto(null);
            setCameraReady(false);
        }
    }, [visible]);

    useEffect(() => {
        setCameraReady(false);
        if (readyTimer.current) clearTimeout(readyTimer.current);
    }, [facing]);

    if (!visible) return null;

    const handleClose = () => {
        setPhotos([]);
        setPendingPhoto(null);
        onClose();
    };

    const handleCameraReady = () => {
        readyTimer.current = setTimeout(() => setCameraReady(true), 500);
    };

    const takePicture = async () => {
        if (!cameraRef.current || capturing || !cameraReady) return;
        setCapturing(true);
        try {
            const uri = await captureRef(cameraRef, {
                format: 'jpg',
                quality: 0.9,
                result: 'tmpfile',
                handleGLSurfaceViewOnAndroid: true,
            });
            const { width, height } = await getImageSize(uri);
            if (!width || !height) throw new Error('Fotoğraf alınamadı');
            setPendingPhoto({ uri, width, height, format: 'jpg' });
        } catch {
            Alert.alert('Fotoğraf Çekilemedi', 'Lütfen tekrar deneyin.');
        } finally {
            setCapturing(false);
        }
    };

    const discardPending = () => {
        setCameraReady(false);
        if (readyTimer.current) clearTimeout(readyTimer.current);
        setPendingPhoto(null);
    };

    const confirmPending = (photo: CapturedPhoto) => {
        setCameraReady(false);
        if (readyTimer.current) clearTimeout(readyTimer.current);
        setPendingPhoto(null);
        setPhotos((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, photo]));
    };

    const sendPending = (photo: CapturedPhoto) => {
        sendMode?.onSend([...photos, photo]);
        handleClose();
    };

    const removePhoto = (uri: string) => setPhotos((prev) => prev.filter((p) => p.uri !== uri));

    const finish = () => {
        if (!photos.length) return;
        const result = photos;
        setPhotos([]);
        onCapture(result);
    };

    const cycleFlash = () => {
        setFlash((prev) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(prev) + 1) % FLASH_CYCLE.length]);
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
            <GestureHandlerRootView style={s.root}>
                {permission?.granted ? (
                    pendingPhoto ? (
                        <View style={StyleSheet.absoluteFill}>
                            <PhotoEditStep
                                photo={pendingPhoto}
                                onDiscard={discardPending}
                                onConfirm={confirmPending}
                                onAddMore={confirmPending}
                                queuedCount={photos.length}
                                sendMode={sendMode ? { onSend: sendPending, placeholder: sendMode.placeholder } : undefined}
                            />
                        </View>
                    ) : (
                    <>
                        <CameraView
                            ref={cameraRef}
                            style={s.preview}
                            facing={facing}
                            flash={flash}
                            onCameraReady={handleCameraReady}
                        />
                        {!cameraReady && (
                            <View style={s.readyOverlay}>
                                <ActivityIndicator color="#fff" size="large" />
                                <Text style={s.readyText}>Kamera hazırlanıyor…</Text>
                            </View>
                        )}

                        <SafeAreaView edges={['top']} style={s.header}>
                            <View style={s.headerSide}>
                                <Tappable onPress={handleClose} style={s.iconBtn} hitSlop={12}>
                                    <Feather name="x" size={22} color="#fff" />
                                </Tappable>
                            </View>
                            <Text style={s.headerTitle}>Fotoğraf Çek</Text>
                            <View style={[s.headerSide, s.headerRight]}>
                                <Tappable onPress={cycleFlash} style={s.iconBtn} hitSlop={10}>
                                    <Feather name={FLASH_ICON[flash]} size={18} color={flash === 'off' ? '#fff' : '#FFD34D'} />
                                    {flash === 'auto' && <Text style={s.flashAutoBadge}>A</Text>}
                                </Tappable>
                                <Tappable
                                    onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                                    style={s.iconBtn}
                                    hitSlop={10}
                                >
                                    <Feather name="refresh-cw" size={18} color="#fff" />
                                </Tappable>
                            </View>
                        </SafeAreaView>

                        <SafeAreaView edges={['bottom']} style={s.bottomBar}>
                            {photos.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                    contentContainerStyle={s.thumbStrip}
                                >
                                    {photos.map((p) => (
                                        <View key={p.uri} style={s.thumbWrap}>
                                            <Image source={{ uri: p.uri }} style={s.thumb} />
                                            <Tappable haptic="light" style={s.thumbRemove} onPress={() => removePhoto(p.uri)} hitSlop={6}>
                                                <Feather name="x" size={11} color="#fff" />
                                            </Tappable>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                            <View style={s.shutterRow}>
                                <View style={s.sideSlot}>
                                    {photos.length > 0 && (
                                        <Text style={s.countText}>{photos.length}/{MAX_PHOTOS}</Text>
                                    )}
                                </View>
                                <Tappable
                                    onPress={takePicture}
                                    haptic="medium"
                                    disabled={capturing || !cameraReady || photos.length >= MAX_PHOTOS}
                                    style={[s.shutterOuter, (!cameraReady || photos.length >= MAX_PHOTOS) && s.shutterDisabled]}
                                >
                                    {capturing ? <ActivityIndicator color="#fff" /> : <View style={s.shutterInner} />}
                                </Tappable>
                                <View style={s.sideSlot}>
                                    {photos.length > 0 && (
                                        <Tappable onPress={finish} style={s.sendBtn}>
                                            <Text style={s.sendBtnText}>Gönder</Text>
                                            <Feather name="arrow-right" size={14} color="#fff" />
                                        </Tappable>
                                    )}
                                </View>
                            </View>
                        </SafeAreaView>
                    </>
                    )
                ) : (
                    <SafeAreaView style={s.permissionWrap} edges={['top']}>
                        <Tappable onPress={handleClose} style={s.iconBtn} hitSlop={12}>
                            <Feather name="x" size={24} color="#fff" />
                        </Tappable>
                        <View style={s.permissionCenter}>
                            <Text style={s.permissionText}>Fotoğraf çekebilmek için kamera erişimine izin vermelisiniz.</Text>
                        </View>
                    </SafeAreaView>
                )}
            </GestureHandlerRootView>
        </Modal>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    preview: { flex: 1 },
    readyOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    readyText: { color: '#fff', fontSize: 13 },

    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    headerSide: { width: 88, flexDirection: 'row' },
    headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
    headerRight: { justifyContent: 'flex-end', gap: 8 },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBtnActive: { backgroundColor: '#FF5B04' },
    iconBtnDark: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flashAutoBadge: {
        position: 'absolute',
        top: 4,
        right: 6,
        color: '#FFD34D',
        fontSize: 9,
        fontWeight: '800',
    },

    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingTop: 12,
    },
    thumbStrip: { paddingHorizontal: 16, gap: 10, paddingBottom: 10 },
    thumbWrap: { width: 52, height: 52 },
    thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#333' },
    thumbRemove: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#DC2626',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    sideSlot: { width: 84, alignItems: 'center' },
    countText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    shutterOuter: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterDisabled: { opacity: 0.4 },
    shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FF5B04',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 22,
    },
    sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    previewBoxFull: { position: 'absolute', overflow: 'hidden', backgroundColor: '#111' },

    floatingTop: { position: 'absolute', top: 0, left: 0, right: 0 },
    floatingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },

    editHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: 8,
    },
    editHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    hdBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hdBadgeActive: { backgroundColor: '#fff' },
    hdBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    hdBadgeTextActive: { color: '#000' },

    stickerText: { fontSize: 44 },
    overlayText: { fontSize: 22, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },

    drawPalette: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    colorDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
    colorDotActive: { borderColor: '#fff' },
    brushSizeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        marginHorizontal: 40,
        marginBottom: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    brushSizeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    brushSizeBtnActive: { borderColor: '#FF5B04' },
    undoBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    doneBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: '#FF5B04',
    },
    doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    stickerPicker: { backgroundColor: 'rgba(0,0,0,0.55)', paddingTop: 8 },
    stickerPickerContent: { paddingHorizontal: 16, gap: 14, alignItems: 'center', paddingBottom: 14 },
    stickerOption: { padding: 4 },
    stickerOptionText: { fontSize: 32 },

    sendBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 12,
    },
    plusBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FF5B04',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    plusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    sendBarField: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    sendBarFieldText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    sendBarInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.45)',
        color: '#fff',
        fontSize: 14,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
    },
    sendBtnCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FF5B04',
        alignItems: 'center',
        justifyContent: 'center',
    },

    cropOverlayRoot: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
    cropCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cropImageBox: { alignItems: 'center', justifyContent: 'center' },
    cropLoadError: { color: '#fff', fontSize: 13 },
    cropMask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
    cropRect: { position: 'absolute', borderWidth: 2, borderColor: '#fff' },
    cropGridLineV: { position: 'absolute', width: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
    cropGridLineH: { position: 'absolute', height: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
    cropHandleHit: {
        position: 'absolute',
        width: HANDLE_HIT,
        height: HANDLE_HIT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cropHandle: {
        width: HANDLE_VISUAL,
        height: HANDLE_VISUAL,
        borderColor: '#fff',
    },
    cropHandleTL: { borderTopWidth: 3, borderLeftWidth: 3 },
    cropHandleTR: { borderTopWidth: 3, borderRightWidth: 3 },
    cropHandleBL: { borderBottomWidth: 3, borderLeftWidth: 3 },
    cropHandleBR: { borderBottomWidth: 3, borderRightWidth: 3 },
    cropEdgeBarH: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#fff' },
    cropEdgeBarV: { width: 4, height: 28, borderRadius: 2, backgroundColor: '#fff' },

    reviewBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 16,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    reviewBtnSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#fff',
    },
    reviewBtnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 24,
        backgroundColor: '#FF5B04',
    },
    reviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    textEditRoot: { flex: 1, backgroundColor: '#000' },
    textEditDim: { backgroundColor: 'rgba(0,0,0,0.35)' },
    textEditHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 6,
    },
    textEditHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    textEditCheck: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF5B04',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textEditStyleIcon: { color: '#fff', fontWeight: '800', fontSize: 13 },
    textEditCenter: { flex: 1, justifyContent: 'flex-start', paddingTop: '26%', paddingHorizontal: 40 },
    textEditInput: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 6,
    },
    textEditBold: { fontWeight: '900' },
    textEditSliderTrack: {
        position: 'absolute',
        right: 14,
        width: 14,
        borderRadius: 7,
        overflow: 'hidden',
    },
    colorMagnifier: {
        position: 'absolute',
        right: 26,
        width: MAGNIFIER_SIZE,
        height: MAGNIFIER_SIZE,
        borderRadius: MAGNIFIER_SIZE / 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    colorMagnifierSwatch: {
        width: MAGNIFIER_SIZE - 16,
        height: MAGNIFIER_SIZE - 16,
        borderRadius: (MAGNIFIER_SIZE - 16) / 2,
        borderWidth: 2,
        borderColor: '#fff',
    },

    permissionWrap: { flex: 1 },
    permissionCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    permissionText: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
