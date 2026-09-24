import ChatImageViewer from '@/components/ChatImageViewer';
import { PickedImage, MAX_PICKED_IMAGES } from '@/store/feature/createLoad/slice';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

const PRIMARY = '#FF5B04';

export default function PhotoSlotsField({
    images,
    onAdd,
    onRemove,
    error = false,
}: {
    images: PickedImage[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    /** Zorunlu alan boş bırakılıp gönderilmeye çalışıldıysa kutu kırmızıya döner. */
    error?: boolean;
}) {
    const full = images.length >= MAX_PICKED_IMAGES;
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    return (
        <View style={s.wrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.row}>
                <Tappable
                    style={[s.addTile, full && s.addTileDisabled, !full && error && s.addTileError]}
                    onPress={onAdd}
                    activeOpacity={0.8}
                    disabled={full}
                >
                    <Feather name="camera" size={26} color={full ? '#9CA3AF' : PRIMARY} />
                    <Text style={[s.addText, full && s.addTextDisabled]}>
                        {full ? `${images.length}/${MAX_PICKED_IMAGES}` : 'Fotoğraf\nEkleyin'}
                    </Text>
                </Tappable>

                {images.map((pic, i) => (
                    <Tappable key={pic.image.uri ?? i} style={s.slot} onPress={() => setViewerIndex(i)} activeOpacity={0.85}>
                        <Image source={{ uri: pic.image.uri }} style={s.slotImg} contentFit="cover" />
                        <Tappable haptic="light" style={s.removeBtn} onPress={() => onRemove(i)} hitSlop={6}>
                            <Feather name="x" size={14} color="#FFFFFF" />
                        </Tappable>
                    </Tappable>
                ))}
            </ScrollView>

            <ChatImageViewer
                images={images.map((p) => p.image.uri)}
                startIndex={viewerIndex ?? 0}
                visible={viewerIndex !== null}
                onClose={() => setViewerIndex(null)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { paddingVertical: 16 },
    row: { flexDirection: 'row', gap: 8, paddingRight: 4 },
    addTile: {
        width: 92,
        height: 92,
        borderRadius: 16,
        backgroundColor: '#FFF0E8',
        borderWidth: 1,
        borderColor: '#FED7AA',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    addTileDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
    addTileError: { borderColor: '#DC2626', borderWidth: 1.5 },
    addText: { fontSize: 10.5, fontWeight: '700', color: PRIMARY, textAlign: 'center' },
    addTextDisabled: { color: '#9CA3AF' },
    slot: {
        width: 92,
        height: 92,
        borderRadius: 16,
        backgroundColor: '#F5F6FC',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    slotImg: { width: '100%', height: '100%' },
    removeBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
