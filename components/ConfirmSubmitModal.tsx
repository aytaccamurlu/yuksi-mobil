import React from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

const PRIMARY = '#FF5B04';

export default function ConfirmSubmitModal({
    visible,
    onConfirm,
    onCancel,
    loading,
}: {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={s.backdrop}>
                <Tappable style={StyleSheet.absoluteFill} onPress={onCancel} activeOpacity={1} />

                <View style={s.card}>
                    <Tappable style={s.closeBtn} onPress={onCancel} hitSlop={8}>
                        <Text style={s.closeText}>✕</Text>
                    </Tappable>

                    <Image
                        source={require('@/assets/images/truck.png')}
                        style={s.truck}
                        resizeMode="contain"
                    />

                    <Text style={s.body}>
                        Sayın Kullanıcımız, yaptığınız işlemleri kontrol ettiyseniz ve bilgilerinizin
                        doğruluğundan eminseniz, eşleşme süreci başlatılacaktır. Onaylıyor musunuz?
                    </Text>

                    <Tappable
                        haptic="medium"
                        style={[s.confirmBtn, loading && s.confirmBtnBusy]}
                        onPress={onConfirm}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={s.confirmText}>Onaylıyorum</Text>
                        )}
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
        paddingTop: 8,
        paddingHorizontal: 22,
        paddingBottom: 22,
        alignItems: 'center',
    },
    closeBtn: { alignSelf: 'flex-end', padding: 6 },
    closeText: { fontSize: 14, color: '#9CA3AF', fontWeight: '700' },
    truck: { width: 120, height: 90, marginTop: -8, marginBottom: 6 },
    body: { fontSize: 13.5, color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    confirmBtn: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    confirmBtnBusy: { backgroundColor: '#FDBA74', shadowOpacity: 0 },
    confirmText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
