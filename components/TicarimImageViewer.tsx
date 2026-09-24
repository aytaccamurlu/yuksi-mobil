import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Modal, Pressable, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');

function ViewerImage({ uri, onZoom }: { uri: string; onZoom: (z: boolean) => void }) {
    const scale = useRef(new Animated.Value(1)).current;
    const zoomed = useRef(false);
    const lastTap = useRef(0);

    const handleTap = () => {
        const now = Date.now();
        if (now - lastTap.current < 280) {
            zoomed.current = !zoomed.current;
            onZoom(zoomed.current);
            Animated.spring(scale, { toValue: zoomed.current ? 2.4 : 1, friction: 7, useNativeDriver: true }).start();
            lastTap.current = 0;
        } else {
            lastTap.current = now;
        }
    };

    return (
        <Pressable style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }} onPress={handleTap}>
            <Animated.Image
                source={{ uri }}
                style={{ width: W, height: H * 0.78, transform: [{ scale }] }}
                resizeMode="contain"
            />
        </Pressable>
    );
}

export default function TicarimImageViewer({
    images,
    startIndex = 0,
    visible,
    onClose,
}: {
    images: string[];
    startIndex?: number;
    visible: boolean;
    onClose: () => void;
}) {
    const [index, setIndex] = useState(startIndex);
    const [zoomed, setZoomed] = useState(false);

    useEffect(() => {
        if (visible) {
            setIndex(startIndex);
            setZoomed(false);
        }
    }, [visible, startIndex]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                {visible && (
                    <FlatList
                        data={images}
                        horizontal
                        pagingEnabled
                        scrollEnabled={!zoomed}
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={startIndex}
                        getItemLayout={(_d, i) => ({ length: W, offset: W * i, index: i })}
                        keyExtractor={(uri, i) => `${uri}-${i}`}
                        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
                        renderItem={({ item }) => <ViewerImage uri={item} onZoom={setZoomed} />}
                    />
                )}

                <SafeAreaView
                    edges={['top']}
                    pointerEvents="box-none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                    }}
                >
                    <Tappable onPress={onClose} hitSlop={10} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="x" size={24} color="#FFFFFF" />
                    </Tappable>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                        {images.length > 1 ? `${index + 1} / ${images.length}` : ''}
                    </Text>
                    <View style={{ width: 40, height: 40 }} />
                </SafeAreaView>
            </View>
        </Modal>
    );
}
