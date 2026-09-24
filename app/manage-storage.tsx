import { ScreenHeader } from '@/components/SettingsRows';
import { useGetStorageUsageQuery } from '@/service/storageSettings.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function UsageRow({
    icon,
    title,
    mb,
    isLast,
}: {
    icon: React.ComponentProps<typeof Feather>['name'];
    title: string;
    mb: number;
    isLast?: boolean;
}) {
    return (
        <View className={`flex-row items-center px-3 py-3.5 ${isLast ? '' : 'border-b border-gray-50'}`}>
            <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-3.5">
                <Feather name={icon} size={17} color="#FF5B04" />
            </View>
            <Text className="flex-1 text-[15px] font-semibold text-gray-800 tracking-tight">{title}</Text>
            <Text className="text-[14px] font-bold text-gray-500">{mb.toFixed(1)} MB</Text>
        </View>
    );
}

export default function ManageStorageScreen() {
    const router = useRouter();
    const { data: usage, isLoading } = useGetStorageUsageQuery();

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScreenHeader title="Depolamayı Yönet" onBack={() => router.back()} />

            {isLoading || !usage ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : (
                <ScrollView className="px-5 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View className="items-center mb-6">
                        <Text className="text-[13px] font-bold text-gray-400 uppercase tracking-wide">
                            Toplam Kullanım
                        </Text>
                        <Text className="text-[34px] font-bold text-gray-900 mt-1">
                            {usage.totalMb.toFixed(1)} MB
                        </Text>
                    </View>

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
                        <UsageRow icon="message-circle" title="Sohbetler" mb={usage.chatsMb} />
                        <UsageRow icon="image" title="Medya" mb={usage.mediaMb} />
                        <UsageRow icon="file-text" title="Belgeler" mb={usage.documentsMb} isLast />
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
