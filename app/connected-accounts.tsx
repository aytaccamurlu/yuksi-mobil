import {
    useConnectAccountMutation,
    useDisconnectAccountMutation,
    useGetConnectedAccountsQuery,
} from '@/service/socialAccounts.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageSourcePropType, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProviderDef = {
    id: string;
    name: string;
    icon: ImageSourcePropType;
    description: string;
};

const PROVIDERS: ProviderDef[] = [
    {
        id: 'google',
        name: 'Google',
        icon: require('@/assets/images/google.png'),
        description: 'Google hesabınla hızlıca giriş yap',
    },
    {
        id: 'apple',
        name: 'Apple',
        icon: require('@/assets/images/apple.png'),
        description: 'Apple ID ile hızlıca giriş yap',
    },
    {
        id: 'facebook',
        name: 'Facebook',
        icon: require('@/assets/images/facebook.png'),
        description: 'Facebook hesabınla hızlıca giriş yap',
    },
];

export default function ConnectedAccountsScreen() {
    const router = useRouter();
    const { data, isLoading } = useGetConnectedAccountsQuery();
    const [connectAccount] = useConnectAccountMutation();
    const [disconnectAccount] = useDisconnectAccountMutation();
    const [pendingId, setPendingId] = useState<string | null>(null);

    const accounts: any[] = data || [];
    const statusOf = (id: string) => accounts.find((a: any) => a.provider === id);

    const handleConnect = (provider: ProviderDef) => {
        Alert.alert(
            `${provider.name} ile Bağlan`,
            `${provider.name} hesabınla bağlanmak istediğine emin misin?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Bağlan',
                    onPress: async () => {
                        setPendingId(provider.id);
                        try {
                            await connectAccount(provider.id).unwrap();
                        } catch {
                            Alert.alert('Hata', `${provider.name} hesabı bağlanamadı, lütfen tekrar deneyin.`);
                        } finally {
                            setPendingId(null);
                        }
                    },
                },
            ],
        );
    };

    const handleDisconnect = (provider: ProviderDef) => {
        Alert.alert(
            'Bağlantıyı Kaldır',
            `${provider.name} bağlantısını kaldırmak istediğine emin misin?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Kaldır',
                    style: 'destructive',
                    onPress: async () => {
                        setPendingId(provider.id);
                        try {
                            await disconnectAccount(provider.id).unwrap();
                        } catch {
                            Alert.alert('Hata', 'Bağlantı kaldırılamadı, lütfen tekrar deneyin.');
                        } finally {
                            setPendingId(null);
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-100 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 mr-3"
                >
                    <Feather name="arrow-left" size={20} color="#374151" />
                </Tappable>
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Hesap Bağlantılarım</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF5B04" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                    <Text className="text-gray-400 text-[13px] mb-4 px-1">
                        Bağladığın hesaplarla tek dokunuşla giriş yapabilirsin.
                    </Text>

                    <View
                        className="bg-white rounded-3xl p-2 border border-gray-100"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.06,
                            shadowRadius: 12,
                            elevation: 3,
                        }}
                    >
                        {PROVIDERS.map((provider, index) => {
                            const status = statusOf(provider.id);
                            const connected = !!status?.connected;
                            const busy = pendingId === provider.id;

                            return (
                                <View
                                    key={provider.id}
                                    className={`flex-row items-center px-3 py-3.5 ${
                                        index !== PROVIDERS.length - 1 ? 'border-b border-gray-50' : ''
                                    }`}
                                >
                                    <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3.5 border border-gray-100">
                                        <Image source={provider.icon} style={{ width: 18, height: 18 }} resizeMode="contain" />
                                    </View>
                                    <View className="flex-1 mr-2">
                                        <Text className="text-[15px] font-semibold text-gray-800 tracking-tight">
                                            {provider.name}
                                        </Text>
                                        <Text
                                            className={`text-[12px] mt-0.5 ${connected ? 'text-primary font-medium' : 'text-gray-400'}`}
                                            numberOfLines={1}
                                        >
                                            {connected ? (status.accountLabel ? `Bağlı · ${status.accountLabel}` : 'Bağlı') : provider.description}
                                        </Text>
                                    </View>

                                    {busy ? (
                                        <ActivityIndicator size="small" color="#FF5B04" />
                                    ) : connected ? (
                                        <Tappable
                                            onPress={() => handleDisconnect(provider)}
                                            activeOpacity={0.7}
                                            className="border-2 border-red-500 rounded-full px-3.5 py-1.5"
                                        >
                                            <Text className="text-red-500 text-[12px] font-bold">Kaldır</Text>
                                        </Tappable>
                                    ) : (
                                        <Tappable
                                            onPress={() => handleConnect(provider)}
                                            activeOpacity={0.7}
                                            className="bg-primary rounded-full px-4 py-1.5"
                                        >
                                            <Text className="text-white text-[12px] font-bold">Bağla</Text>
                                        </Tappable>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
