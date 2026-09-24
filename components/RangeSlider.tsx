import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, View } from 'react-native';
import { haptic } from '@/utils/haptics';

const HANDLE_SIZE = 22;
const TRACK_HEIGHT = 3;
const PRIMARY = '#FF5B04';

type Props = {
    min: number;
    max: number;
    step?: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
};

export default function RangeSlider({ min, max, step = 1, value, onChange }: Props) {
    const [travel, setTravel] = useState(0);
    const valueRef = useRef(value);
    valueRef.current = value;
    const travelRef = useRef(0);

    const onLayout = (e: LayoutChangeEvent) => {
        const t = Math.max(0, e.nativeEvent.layout.width - HANDLE_SIZE);
        travelRef.current = t;
        setTravel(t);
    };

    const clampValue = (v: number) => Math.min(max, Math.max(min, v));
    const roundValue = (v: number) => Math.round(v / step) * step;
    const valueToX = (v: number) => {
        const t = travelRef.current;
        if (t <= 0 || max === min) return 0;
        return ((v - min) / (max - min)) * t;
    };
    const xToValue = (x: number) => {
        const t = travelRef.current;
        if (t <= 0) return min;
        const ratio = Math.min(1, Math.max(0, x / t));
        return roundValue(min + ratio * (max - min));
    };

    const makeResponder = (which: 'low' | 'high') => {
        let startX = 0;
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                haptic('light');
                const current = which === 'low' ? valueRef.current[0] : valueRef.current[1];
                startX = valueToX(current);
            },
            onPanResponderMove: (_evt, gesture) => {
                const nextX = Math.min(travelRef.current, Math.max(0, startX + gesture.dx));
                let nextValue = xToValue(nextX);
                const [low, high] = valueRef.current;
                if (which === 'low') {
                    nextValue = clampValue(Math.min(nextValue, high));
                    onChange([nextValue, high]);
                } else {
                    nextValue = clampValue(Math.max(nextValue, low));
                    onChange([low, nextValue]);
                }
            },
        });
    };

    const lowResponder = useRef(makeResponder('low')).current;
    const highResponder = useRef(makeResponder('high')).current;

    const lowX = valueToX(value[0]);
    const highX = valueToX(value[1]);
    const half = HANDLE_SIZE / 2;

    return (
        <View onLayout={onLayout} style={{ height: HANDLE_SIZE, justifyContent: 'center' }}>
            {travel > 0 && (
                <>
                    <View
                        style={{
                            position: 'absolute',
                            left: half,
                            right: half,
                            height: TRACK_HEIGHT,
                            borderRadius: TRACK_HEIGHT / 2,
                            backgroundColor: '#E5E7EB',
                        }}
                    />
                    <View
                        style={{
                            position: 'absolute',
                            left: lowX + half,
                            width: Math.max(0, highX - lowX),
                            height: TRACK_HEIGHT,
                            borderRadius: TRACK_HEIGHT / 2,
                            backgroundColor: PRIMARY,
                        }}
                    />
                    <View
                        {...lowResponder.panHandlers}
                        style={{
                            position: 'absolute',
                            left: lowX,
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            borderRadius: half,
                            backgroundColor: '#fff',
                            borderWidth: 2,
                            borderColor: PRIMARY,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                            elevation: 3,
                        }}
                    />
                    <View
                        {...highResponder.panHandlers}
                        style={{
                            position: 'absolute',
                            left: highX,
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            borderRadius: half,
                            backgroundColor: '#fff',
                            borderWidth: 2,
                            borderColor: PRIMARY,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                            elevation: 3,
                        }}
                    />
                </>
            )}
        </View>
    );
}
