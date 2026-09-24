import { ScreenHeader, ToggleRow } from '@/components/SettingsRows';
import { useGetStorageSettingsQuery, useUpdateStorageSettingsMutation } from '@/service/storageSettings.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProxySettingsScreen() {
    const router = useRouter();
    const { data: settings, isLoading } = useGetStorageSettingsQuery();
    const [update, { isLoading: isSaving }] = useUpdateStorageSettingsMutation();

    const [host, setHost] = useState('');

    useEffect(() => {
        if (settings) setHost(settings.proxyHost);
    }, [settings?.proxyHost]);

    const handleSave = () => {
        update({ proxyHost: host.trim() });
        router.back();
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScreenHeader title="Proxy" onBack={() => router.back()} />

            {isLoading || !settings ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : (
                <View className="px-5 pt-6">
                    <View
                        className="bg-white rounded-3xl p-2 border border-gray-100 mb-5"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.06,
                            shadowRadius: 12,
                            elevation: 3,
                        }}
                    >
                        <ToggleRow
                            title="Proxy Kullan"
                            subtitle="Bağlantı proxy sunucusu üzerinden yapılsın"
                            value={settings.proxyEnabled}
                            onValueChange={(v) => update({ proxyEnabled: v })}
                            isLast
                        />
                    </View>

                    {settings.proxyEnabled && (
                        <View className="bg-white rounded-3xl p-5 border border-gray-100">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Proxy Adresi</Text>
                            <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 px-4 h-14">
                                <Feather name="globe" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={host}
                                    onChangeText={setHost}
                                    placeholder="proxy.example.com:8080"
                                    placeholderTextColor="#9CA3AF"
                                    autoCapitalize="none"
                                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                                />
                            </View>

                            <Tappable haptic="medium"
                                onPress={handleSave}
                                activeOpacity={0.8}
                                disabled={isSaving}
                                className={`mt-6 h-14 rounded-2xl items-center justify-center ${isSaving ? 'bg-orange-400' : 'bg-orange-500 shadow-xl shadow-orange-500/30'}`}
                            >
                                <Text className="text-white text-[15px] font-bold">Kaydet</Text>
                            </Tappable>
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}
