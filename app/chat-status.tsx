import { useGetPresenceQuery, useSetPresenceModeMutation, PresenceMode } from '@/service/presence.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const OPTIONS: { mode: PresenceMode; title: string; description: string }[] = [
    {
        mode: 'auto',
        title: 'Otomatik',
        description: 'Uygulamayı kullanırken çevrimiçi, bir süre kullanmayınca çevrimdışı görünürsün.',
    },
    {
        mode: 'always_online',
        title: 'Her Zaman Çevrimiçi',
        description: 'Uygulamada olsan da olmasan da herkese her zaman çevrimiçi görünürsün.',
    },
    {
        mode: 'always_offline',
        title: 'Her Zaman Çevrimdışı',
        description: 'Uygulamada olsan bile kimseye çevrimiçi görünmezsin. Bu modda sen de başkalarının çevrimiçi durumunu göremezsin.',
    },
];

export default function ChatStatusScreen() {
    const router = useRouter();
    const { data, isLoading } = useGetPresenceQuery(undefined, { pollingInterval: 5_000 });
    const [setPresenceMode, { isLoading: isSaving }] = useSetPresenceModeMutation();

    const isOnline = !!data?.isOnline;
    const currentMode = data?.mode ?? 'auto';

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-100 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 mr-3"
                >
                    <Feather name="arrow-left" size={20} color="#374151" />
                </Tappable>
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Sohbet Durumu</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : (
                <View className="px-5 pt-6">
                    <View className="flex-row items-center bg-white rounded-2xl p-4 border border-gray-100 mb-5">
                        <View
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: isOnline ? '#22C55E' : '#9CA3AF' }}
                        />
                        <Text className="text-[15px] font-semibold text-gray-800">
                            Şu an {isOnline ? 'çevrimiçi' : 'çevrimdışı'} görünüyorsun
                        </Text>
                    </View>

                    {OPTIONS.map((option) => {
                        const selected = currentMode === option.mode;
                        return (
                            <Tappable
                                key={option.mode}
                                onPress={() => setPresenceMode({ mode: option.mode })}
                                disabled={isSaving}
                                className="bg-white rounded-2xl p-4 border mb-3"
                                style={{ borderColor: selected ? '#FF5B04' : '#F3F4F6' }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-[15px] font-semibold text-gray-800">{option.title}</Text>
                                    {selected && <Feather name="check-circle" size={18} color="#FF5B04" />}
                                </View>
                                <Text className="text-[12px] text-gray-400 mt-1 leading-5">
                                    {option.description}
                                </Text>
                            </Tappable>
                        );
                    })}
                </View>
            )}
        </SafeAreaView>
    );
}
