import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, ImageSourcePropType, Modal, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

const PRIMARY = '#FF5B04';

export default function VehicleInfoModal({
    visible,
    onClose,
    name,
    icon,
    info,
}: {
    visible: boolean;
    onClose: () => void;
    name?: string;
    icon?: ImageSourcePropType;
    info?: string;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={s.backdrop}>
                <Tappable style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

                <View style={s.card}>
                    <Tappable style={s.closeBtn} onPress={onClose} hitSlop={8}>
                        <Feather name="x" size={16} color="#9CA3AF" />
                    </Tappable>

                    {icon && <Image source={icon} style={s.icon} resizeMode="contain" />}
                    <Text style={s.name}>{name}</Text>
                    <Text style={s.info}>{info}</Text>

                    <Tappable style={s.okBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={s.okBtnText}>Anladım</Text>
                    </Tappable>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingTop: 8,
        paddingHorizontal: 22,
        paddingBottom: 22,
        alignItems: 'center',
    },
    closeBtn: { alignSelf: 'flex-end', padding: 6 },
    icon: { width: 84, height: 84, marginTop: -4, marginBottom: 6 },
    name: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 8 },
    info: { fontSize: 13.5, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    okBtn: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    okBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
