import React from 'react';
import { Alert, Image, ImageSourcePropType, Platform, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';

const PRIMARY = '#FF5B04';

type Provider = { key: string; name: string; icon: ImageSourcePropType; iosOnly?: boolean };

const PROVIDERS: Provider[] = [
    { key: 'facebook', name: 'Facebook', icon: require('@/assets/images/facebook.png') },
    { key: 'google', name: 'Google', icon: require('@/assets/images/google.png') },
    { key: 'apple', name: 'Apple', icon: require('@/assets/images/apple.png'), iosOnly: true },
];

export default function SocialAuthButtons({ label = 'Veya devam et' }: { label?: string }) {
    const providers = PROVIDERS.filter((p) => !p.iosOnly || Platform.OS === 'ios');

    return (
        <View>
            <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>{label}</Text>
                <View style={s.dividerLine} />
            </View>

            <View style={s.row}>
                {providers.map((p) => (
                    <Tappable
                        key={p.key}
                        style={s.btn}
                        activeOpacity={0.85}
                        onPress={() => Alert.alert('Yakında', `${p.name} ile giriş yakında gelecek!`)}
                    >
                        <Image source={p.icon} style={s.icon} resizeMode="contain" />
                    </Tappable>
                ))}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: PRIMARY, opacity: 0.25 },
    dividerText: { marginHorizontal: 12, color: PRIMARY, fontWeight: '600', fontSize: 14 },

    row: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 },
    btn: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: { width: 36, height: 36 },
});
