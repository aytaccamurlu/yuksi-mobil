import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Tappable from '@/components/Tappable';
import AppBottomSheet from '@/components/AppBottomSheet';

const PRIMARY = '#FF5B04';

export default function WebViewModal({
    visible,
    url,
    title,
    onClose,
}: {
    visible: boolean;
    url: string | null;
    title?: string;
    onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const host = url ? url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';

    return (
        <AppBottomSheet
            visible={visible && !!url}
            onClose={onClose}
            snapPoints={['100%']}
            topInset={insets.top + 34}
            backgroundStyle={s.background}
        >
            <View style={[s.sheet, { paddingBottom: insets.bottom }]}>
                <View style={s.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle} numberOfLines={1}>{title || host}</Text>
                        {!!title && <Text style={s.headerHost} numberOfLines={1}>{host}</Text>}
                    </View>
                    <Tappable style={s.closeBtn} onPress={onClose} hitSlop={8}>
                        <Feather name="x" size={18} color="#6B7280" />
                    </Tappable>
                </View>

                {url && !failed ? (
                    <WebView
                        source={{ uri: url }}
                        style={s.web}
                        onLoadStart={() => { setLoading(true); setFailed(false); }}
                        onLoadEnd={() => setLoading(false)}
                        onError={() => { setLoading(false); setFailed(true); }}
                        startInLoadingState={false}
                        setSupportMultipleWindows={false}
                        allowsBackForwardNavigationGestures
                    />
                ) : (
                    <View style={s.failed}>
                        <Feather name="wifi-off" size={30} color={PRIMARY} />
                        <Text style={s.failedTitle}>Sayfa yüklenemedi</Text>
                        <Text style={s.failedText}>Bağlantınızı kontrol edip tekrar deneyin.</Text>
                        <Tappable style={s.retryBtn} onPress={() => setFailed(false)} activeOpacity={0.85}>
                            <Text style={s.retryBtnText}>Tekrar Dene</Text>
                        </Tappable>
                    </View>
                )}

                {loading && !failed && (
                    <View style={s.loading} pointerEvents="none">
                        <ActivityIndicator size="large" color={PRIMARY} />
                    </View>
                )}
            </View>
        </AppBottomSheet>
    );
}

const s = StyleSheet.create({
    background: { borderTopLeftRadius: 26, borderTopRightRadius: 26 },
    sheet: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 12,
        paddingTop: 10,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F1F1',
        gap: 10,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
    headerHost: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    web: { flex: 1, backgroundColor: '#fff' },
    loading: { ...StyleSheet.absoluteFillObject, top: 80, alignItems: 'center', justifyContent: 'center' },
    failed: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    failedTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 16 },
    failedText: { fontSize: 13.5, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    retryBtn: { marginTop: 22, backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 30 },
    retryBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
});
