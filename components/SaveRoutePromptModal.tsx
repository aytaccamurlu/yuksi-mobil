import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';

const PRIMARY = '#FF5B04';

export default function SaveRoutePromptModal({
    visible,
    defaultTitle,
    loading,
    onSave,
    onDismiss,
}: {
    visible: boolean;
    defaultTitle: string;
    loading?: boolean;
    onSave: (title: string) => void;
    onDismiss: () => void;
}) {
    const [title, setTitle] = useState(defaultTitle);

    useEffect(() => {
        if (visible) setTitle(defaultTitle);
    }, [visible, defaultTitle]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={s.backdrop}>
                <Tappable style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />

                <View style={s.card}>
                    <View style={s.iconCircle}>
                        <Feather name="map-pin" size={22} color={PRIMARY} />
                    </View>
                    <Text style={s.title}>Bu Rotayı Kaydetmek İster misiniz?</Text>
                    <Text style={s.body}>
                        Kaydederseniz bu adresi sonraki gönderilerinizde Kayıtlı Rotalarım'dan tek dokunuşla kullanabilirsiniz.
                    </Text>

                    <TextInput
                        style={s.input}
                        placeholder="Rota başlığı"
                        placeholderTextColor="#9CA3AF"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Tappable
                        haptic="medium"
                        style={[s.saveBtn, (loading || !title.trim()) && s.saveBtnDisabled]}
                        onPress={() => onSave(title.trim())}
                        disabled={loading || !title.trim()}
                        activeOpacity={0.85}
                    >
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveBtnText}>Kaydet</Text>}
                    </Tappable>
                    <Tappable style={s.dismissBtn} onPress={onDismiss} activeOpacity={0.7} disabled={loading}>
                        <Text style={s.dismissBtnText}>Hayır, Teşekkürler</Text>
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
        maxWidth: 340,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 22,
        alignItems: 'center',
    },
    iconCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#FFF0E8',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    title: { fontSize: 16.5, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
    body: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19, marginBottom: 16 },
    input: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 14,
        fontSize: 14,
        color: '#111827',
        marginBottom: 14,
    },
    saveBtn: {
        width: '100%', height: 50, borderRadius: 14,
        backgroundColor: PRIMARY,
        alignItems: 'center', justifyContent: 'center',
    },
    saveBtnDisabled: { backgroundColor: '#FDBA74' },
    saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
    dismissBtn: { marginTop: 10, paddingVertical: 6 },
    dismissBtnText: { color: '#9CA3AF', fontWeight: '700', fontSize: 13 },
});
