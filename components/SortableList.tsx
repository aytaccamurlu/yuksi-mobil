import React, { useCallback, useEffect, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { haptic } from '@/utils/haptics';

const GAP = 16;
const SPRING = { damping: 22, stiffness: 200, mass: 0.6 };
const LONG_PRESS_MS = 180;

type Positions = Record<string, number>;

type Props<T> = {
    items: T[];
    keyOf: (item: T) => string;
    renderRow: (item: T, isActive: boolean) => React.ReactNode;
    onOrderChange: (ids: string[]) => void;
    onDragStart?: () => void;
};

const clamp = (value: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
};

function Row({
    id,
    initialIndex,
    positions,
    rowHeight,
    count,
    activeId,
    setActiveId,
    onDragStart,
    commit,
    children,
}: {
    id: string;
    initialIndex: number;
    positions: SharedValue<Positions>;
    rowHeight: number;
    count: number;
    activeId: string | null;
    setActiveId: (id: string | null) => void;
    onDragStart?: () => void;
    commit: (positions: Positions) => void;
    children: React.ReactNode;
}) {
    const slot = rowHeight + GAP;
    const translateY = useSharedValue(initialIndex * slot);
    const startY = useSharedValue(0);
    const dragging = useSharedValue(false);

    // Başka bir kart sürüklenirken bu kartın sırası değişirse yeni yerine kayar.
    useAnimatedReaction(
        () => positions.value[id],
        (index, prevIndex) => {
            if (index !== prevIndex && index !== undefined && !dragging.value) {
                translateY.value = withSpring(index * slot, SPRING);
            }
        },
    );

    const pan = Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
            dragging.value = true;
            startY.value = translateY.value;
            runOnJS(setActiveId)(id);
            runOnJS(haptic)('light');
            if (onDragStart) runOnJS(onDragStart)();
        })
        .onUpdate((e) => {
            translateY.value = startY.value + e.translationY;

            const newIndex = clamp(Math.round(translateY.value / slot), 0, count - 1);
            const oldIndex = positions.value[id];
            if (newIndex !== oldIndex) {
                const next: Positions = { ...positions.value };
                for (const key in next) {
                    if (next[key] === newIndex) next[key] = oldIndex;
                }
                next[id] = newIndex;
                positions.value = next;
            }
        })
        .onEnd(() => {
            dragging.value = false;
            translateY.value = withSpring(positions.value[id] * slot, SPRING);
            runOnJS(setActiveId)(null);
            runOnJS(commit)(positions.value);
        });

    const isActive = activeId === id;

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { scale: withSpring(dragging.value ? 1.03 : 1, SPRING) }],
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                style={[
                    { position: 'absolute', left: 0, right: 0, height: rowHeight },
                    { zIndex: isActive ? 20 : 0, elevation: isActive ? 20 : 0 },
                    animStyle,
                ]}
            >
                {children}
            </Animated.View>
        </GestureDetector>
    );
}

export default function SortableList<T>({
    items,
    keyOf,
    renderRow,
    onOrderChange,
    onDragStart,
}: Props<T>) {
    const [rowHeight, setRowHeight] = useState<number | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const ids = items.map(keyOf);
    const positions = useSharedValue<Positions>(
        Object.fromEntries(ids.map((id, index) => [id, index])),
    );

    // items dışarıdan değişirse (ekleme/silme) konumları yeniden kur.
    const idsKey = ids.join('|');
    useEffect(() => {
        positions.value = Object.fromEntries(ids.map((id, index) => [id, index]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey]);

    const commit = useCallback(
        (finalPositions: Positions) => {
            const ordered = Object.keys(finalPositions).sort(
                (a, b) => finalPositions[a] - finalPositions[b],
            );
            onOrderChange(ordered);
        },
        [onOrderChange],
    );

    const onMeasure = useCallback((e: LayoutChangeEvent) => {
        const { height } = e.nativeEvent.layout;
        if (height > 0) setRowHeight((prev) => (prev === null ? height : prev));
    }, []);

    // İlk render: kart yüksekliğini ölçmek için normal akışta çiziyoruz.
    if (rowHeight === null) {
        return (
            <View>
                {items.map((item, index) => (
                    <View
                        key={keyOf(item)}
                        onLayout={index === 0 ? onMeasure : undefined}
                        style={{ marginBottom: index === items.length - 1 ? 0 : GAP }}
                    >
                        {renderRow(item, false)}
                    </View>
                ))}
            </View>
        );
    }

    const containerHeight = items.length * (rowHeight + GAP) - GAP;

    return (
        <View style={{ height: containerHeight }}>
            {items.map((item, index) => {
                const id = keyOf(item);
                return (
                    <Row
                        key={id}
                        id={id}
                        initialIndex={index}
                        positions={positions}
                        rowHeight={rowHeight}
                        count={items.length}
                        activeId={activeId}
                        setActiveId={setActiveId}
                        onDragStart={onDragStart}
                        commit={commit}
                    >
                        {renderRow(item, activeId === id)}
                    </Row>
                );
            })}
        </View>
    );
}
