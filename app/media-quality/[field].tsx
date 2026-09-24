import { ScreenHeader } from '@/components/SettingsRows';
import { MEDIA_QUALITY_FIELD_LABEL, MEDIA_QUALITY_LABEL, MEDIA_QUALITY_OPTIONS, MediaQuality } from '@/constants/storageOptions';
import { useGetStorageSettingsQuery, useUpdateStorageSettingsMutation } from '@/service/storageSettings.service';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MediaQualityScreen() {
    const router = useRouter();
    const { field } = useLocalSearchParams<{ field: 'upload' | 'autoDownload' }>();
    const { data: settings, isLoading } = useGetStorageSettingsQuery();
    const [update] = useUpdateStorageSettingsMutation();

    const current = field === 'upload' ? settings?.uploadQuality : settings?.autoDownloadQuality;

    const handleSelect = (value: MediaQuality) => {
        if (field === 'upload') {
            update({ uploadQuality: value });
        } else {
            update({ autoDownloadQuality: value });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScreenHeader title={MEDIA_QUALITY_FIELD_LABEL[field || 'upload']} onBack={() => router.back()} />

            {isLoading || !settings ? (
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
                        {MEDIA_QUALITY_OPTIONS.map((opt, index) => (
                            <Tappable
                                key={opt}
                                className={`flex-row items-center px-4 py-4 ${
                                    index !== MEDIA_QUALITY_OPTIONS.length - 1 ? 'border-b border-gray-50' : ''
                                }`}
                                onPress={() => handleSelect(opt)}
                                activeOpacity={0.6}
                            >
                                <Text className="flex-1 text-[15px] font-semibold text-gray-800 tracking-tight">
                                    {MEDIA_QUALITY_LABEL[opt]}
                                </Text>
                                {current === opt && <Feather name="check" size={19} color="#FF5B04" />}
                            </Tappable>
                        ))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
