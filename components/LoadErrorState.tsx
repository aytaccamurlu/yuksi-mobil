import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

const CONNECTIVITY_STATUSES = new Set(['FETCH_ERROR', 'TIMEOUT_ERROR']);

export const isConnectivityError = (error: unknown) =>
    CONNECTIVITY_STATUSES.has(String((error as any)?.status ?? ''));

export default function LoadErrorState({
    error,
    onRetry,
    retrying = false,
}: {
    error?: unknown;
    onRetry: () => void;
    retrying?: boolean;
}) {
    const offline = isConnectivityError(error);

    return (
        <View style={s.container}>
            <View style={s.iconWrap}>
                <Feather name={offline ? 'wifi-off' : 'alert-triangle'} size={30} color="#FF5B04" />
            </View>
            <Text style={s.title}>{offline ? 'Bağlantı kurulamadı' : 'Veriler yüklenemedi'}</Text>
            <Text style={s.subtitle}>
                {offline
                    ? 'İnternet bağlantınızı kontrol edip tekrar deneyin.'
                    : 'Sunucuya ulaşırken bir sorun oluştu. Birazdan tekrar deneyin.'}
            </Text>
            <Tappable style={[s.button, retrying && s.buttonDisabled]} onPress={onRetry} disabled={retrying} activeOpacity={0.85}>
                <Text style={s.buttonText}>{retrying ? 'Deneniyor...' : 'Tekrar Dene'}</Text>
            </Tappable>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 40 },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: '#FFF1EA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    title: { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' },
    subtitle: { fontSize: 13.5, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    button: { marginTop: 22, backgroundColor: '#FF5B04', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 30 },
    buttonDisabled: { backgroundColor: '#F0B79A' },
    buttonText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
});
