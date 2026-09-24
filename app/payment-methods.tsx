import {
    useDeletePaymentMethodMutation,
    useGetPaymentMethodsQuery,
    useSetDefaultPaymentMethodMutation,
} from '@/service/payment.service';
import { Feather } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from 'expo-screen-capture';

const BRAND_COLORS: Record<string, string> = {
    Visa: '#1A56DB',
    Mastercard: '#EB5C29',
    Troy: '#00A651',
};

function CardRow({
    card,
    onDelete,
    onSetDefault,
    isUpdating,
}: {
    card: any;
    onDelete: () => void;
    onSetDefault: () => void;
    isUpdating: boolean;
}) {
    const brandColor = BRAND_COLORS[card.brand] || '#374151';

    return (
        <View
            className="bg-white rounded-3xl p-4 mb-4"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 1,
                borderColor: '#F3F4F6',
            }}
        >
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                    <View className="w-11 h-11 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: `${brandColor}1A` }}>
                        <Feather name="credit-card" size={18} color={brandColor} />
                    </View>
                    <View>
                        <Text className="text-gray-900 font-bold text-[15px]">{card.name || card.brand}</Text>
                        <Text className="text-gray-400 text-[12px] mt-0.5">
                            {card.brand} · •••• {card.last4}
                        </Text>
                    </View>
                </View>
                {card.isDefault && (
                    <View className="bg-orange-50 rounded-full px-2.5 py-1">
                        <Text className="text-primary text-[11px] font-bold">Varsayılan</Text>
                    </View>
                )}
            </View>

            <View className="flex-row items-center justify-between">
                <Text className="text-gray-500 text-[13px]">
                    {card.holder ? `${card.holder} · ` : ''}
                    {card.expiryMonth}/{card.expiryYear}
                </Text>
                <View className="flex-row items-center">
                    {!card.isDefault && (
                        <Tappable onPress={onSetDefault} disabled={isUpdating} activeOpacity={0.7} className="mr-4">
                            <Text className="text-primary text-[13px] font-bold">Varsayılan Yap</Text>
                        </Tappable>
                    )}
                    <Tappable haptic="warning"
                        onPress={onDelete}
                        activeOpacity={0.7}
                        className="w-9 h-9 rounded-xl border-2 border-primary items-center justify-center"
                    >
                        <Feather name="x" size={16} color="#FF5B04" />
                    </Tappable>
                </View>
            </View>
        </View>
    );
}

export default function PaymentMethodsScreen() {
    usePreventScreenCapture();
    const router = useRouter();
    const { data, isLoading } = useGetPaymentMethodsQuery();
    const [deleteCard, { isLoading: isDeleting }] = useDeletePaymentMethodMutation();
    const [setDefaultCard, { isLoading: isSettingDefault }] = useSetDefaultPaymentMethodMutation();

    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const centerOffset = -(headerHeight - insets.bottom) / 2;

    const cards: any[] = data?.data || data || [];

    const handleDelete = (id: string, name: string, last4: string) => {
        Alert.alert('Kartı Sil', `${name} •••• ${last4} kartını kaldırmak istediğinize emin misiniz?`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteCard(id).unwrap();
                    } catch {
                        Alert.alert('Hata', 'Kart silinemedi, lütfen tekrar deneyin.');
                    }
                },
            },
        ]);
    };

    const handleSetDefault = async (id: string) => {
        try {
            await setDefaultCard(id).unwrap();
        } catch {
            Alert.alert('Hata', 'Varsayılan kart güncellenemedi.');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Kayıtlı Kartlarım',
                    headerTitleStyle: { fontWeight: '800', fontSize: 18, color: '#111827' },
                    headerStyle: { backgroundColor: '#fff' },
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <Tappable onPress={() => router.back()} className="mr-3">
                            <Feather name="arrow-left" size={22} color="#374151" />
                        </Tappable>
                    ),
                }}
            />

            {isLoading ? (
                <View className="flex-1 items-center justify-center" style={{ marginTop: centerOffset }}>
                    <ActivityIndicator size="large" color="#FF5B04" />
                    <Text className="text-gray-400 mt-3 text-sm">Kartlar yükleniyor...</Text>
                </View>
            ) : cards.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8" style={{ marginTop: centerOffset }}>
                    <View className="w-20 h-20 bg-orange-50 rounded-3xl items-center justify-center mb-5">
                        <Feather name="credit-card" size={36} color="#FF5B04" />
                    </View>
                    <Text className="text-gray-800 text-lg font-bold text-center">Henüz Kayıtlı Kart Yok</Text>
                    <Text className="text-gray-400 text-sm text-center mt-2">
                        Ödemelerinizi hızlandırmak için bir kredi kartı ekleyin.
                    </Text>
                    <Tappable
                        className="mt-6 bg-primary px-8 py-3.5 rounded-2xl flex-row items-center"
                        onPress={() => router.push('/add-card')}
                        activeOpacity={0.8}
                        style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    >
                        <Feather name="plus" size={16} color="#fff" />
                        <Text className="text-white font-bold text-sm ml-2">Kart Ekle</Text>
                    </Tappable>
                </View>
            ) : (
                <View className="flex-1">
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
                    >
                        {cards.map((card) => (
                            <CardRow
                                key={card.id}
                                card={card}
                                isUpdating={isDeleting || isSettingDefault}
                                onDelete={() => handleDelete(card.id, card.name || card.brand, card.last4)}
                                onSetDefault={() => handleSetDefault(card.id)}
                            />
                        ))}
                    </ScrollView>

                    <View className="px-5 pb-5">
                        <Tappable
                            className="border-2 border-dashed border-gray-200 rounded-2xl py-4 items-center flex-row justify-center bg-gray-50"
                            onPress={() => router.push('/add-card')}
                            activeOpacity={0.6}
                        >
                            <Feather name="plus-circle" size={18} color="#9CA3AF" />
                            <Text className="text-gray-400 font-semibold text-sm ml-2">Yeni Kart Ekle</Text>
                        </Tappable>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
