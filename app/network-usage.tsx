import { ScreenHeader } from '@/components/SettingsRows';
import { useGetNetworkUsageQuery } from '@/service/storageSettings.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function DirectionRow({
    icon,
    title,
    sentMb,
    receivedMb,
    isLast,
}: {
    icon: React.ComponentProps<typeof Feather>['name'];
    title: string;
    sentMb: number;
    receivedMb: number;
    isLast?: boolean;
}) {
    return (
        <View className={`px-3 py-3.5 ${isLast ? '' : 'border-b border-gray-50'}`}>
            <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-3.5">
                    <Feather name={icon} size={17} color="#FF5B04" />
                </View>
                <Text className="text-[15px] font-semibold text-gray-800 tracking-tight">{title}</Text>
            </View>
            <View className="flex-row ml-[54px] gap-6">
                <View>
                    <Text className="text-[11px] text-gray-400">Gönderilen</Text>
                    <Text className="text-[14px] font-bold text-gray-700">{sentMb.toFixed(1)} MB</Text>
                </View>
                <View>
                    <Text className="text-[11px] text-gray-400">Alınan</Text>
                    <Text className="text-[14px] font-bold text-gray-700">{receivedMb.toFixed(1)} MB</Text>
                </View>
            </View>
        </View>
    );
}

export default function NetworkUsageScreen() {
    const router = useRouter();
    const { data: usage, isLoading } = useGetNetworkUsageQuery();

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScreenHeader title="Ağ Kullanımı" onBack={() => router.back()} />

            {isLoading || !usage ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : (
                <ScrollView className="px-5 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                        <DirectionRow
                            icon="message-circle"
                            title="Mesajlar"
                            sentMb={usage.messagesSentMb}
                            receivedMb={usage.messagesReceivedMb}
                        />
                        <DirectionRow
                            icon="phone-call"
                            title="Aramalar"
                            sentMb={usage.callsSentMb}
                            receivedMb={usage.callsReceivedMb}
                        />
                        <DirectionRow
                            icon="image"
                            title="Medya"
                            sentMb={usage.mediaSentMb}
                            receivedMb={usage.mediaReceivedMb}
                            isLast
                        />
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
