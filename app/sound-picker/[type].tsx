import { ScreenHeader } from '@/components/SettingsRows';
import { CALL_SOUNDS, NOTIFICATION_SOUNDS } from '@/constants/notificationSounds';
import { useGetNotificationSettingsQuery, useUpdateNotificationSettingsMutation } from '@/service/notificationSettings.service';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SoundPickerScreen() {
    const router = useRouter();
    const { type } = useLocalSearchParams<{ type: string }>();
    const isCall = type === 'call';

    const { data: settings, isLoading } = useGetNotificationSettingsQuery();
    const [update] = useUpdateNotificationSettingsMutation();

    const options = isCall ? CALL_SOUNDS : NOTIFICATION_SOUNDS;
    const selected = isCall ? settings?.callSoundId : settings?.notificationSoundId;

    const handleSelect = (id: string) => {
        if (isCall) {
            update({ callSoundId: id });
        } else {
            update({ notificationSoundId: id });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScreenHeader title={isCall ? 'Arama Sesi' : 'Bildirim Sesi'} onBack={() => router.back()} />

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
                        {options.map((opt, index) => (
                            <Tappable
                                key={opt.id}
                                className={`flex-row items-center px-4 py-4 ${
                                    index !== options.length - 1 ? 'border-b border-gray-50' : ''
                                }`}
                                onPress={() => handleSelect(opt.id)}
                                activeOpacity={0.6}
                            >
                                <Text className="flex-1 text-[15px] font-semibold text-gray-800 tracking-tight">
                                    {opt.label}
                                </Text>
                                {selected === opt.id && <Feather name="check" size={19} color="#FF5B04" />}
                            </Tappable>
                        ))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
