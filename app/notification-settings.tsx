import { LinkRow, ScreenHeader, SectionCard, ToggleRow } from '@/components/SettingsRows';
import { CALL_SOUNDS, NOTIFICATION_SOUNDS } from '@/constants/notificationSounds';
import {
    useGetNotificationSettingsQuery,
    useResetNotificationSettingsMutation,
    useUpdateNotificationSettingsMutation,
} from '@/service/notificationSettings.service';
import { isHapticsEnabled, setHapticsEnabled } from '@/utils/haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ALERT_STYLE_LABEL: Record<string, string> = {
    none: 'Yok',
    banners: "Banner'lar",
    alerts: 'Uyarılar',
};

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const { data: settings, isLoading } = useGetNotificationSettingsQuery();
    const [update] = useUpdateNotificationSettingsMutation();
    const [reset] = useResetNotificationSettingsMutation();
    const [haptics, setHaptics] = React.useState(isHapticsEnabled());

    const toggleHaptics = (v: boolean) => {
        setHaptics(v);
        setHapticsEnabled(v);
    };

    const handleReset = () => {
        Alert.alert(
            'Bildirim Ayarlarını Sıfırla',
            'Tüm bildirim ayarları varsayılana döndürülecek. Devam edilsin mi?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sıfırla',
                    style: 'destructive',
                    onPress: () => {
                        reset();
                        toggleHaptics(true);
                    },
                },
            ],
        );
    };

    const notificationSoundLabel = NOTIFICATION_SOUNDS.find((s) => s.id === settings?.notificationSoundId)?.label;
    const callSoundLabel = CALL_SOUNDS.find((s) => s.id === settings?.callSoundId)?.label;

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScreenHeader title="Bildirimler & Titreşimler" onBack={() => router.back()} />

            {isLoading || !settings ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : (
                <ScrollView className="px-5 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                    <SectionCard title="Sistem">
                        <LinkRow
                            title="Bildirim İzinleri"
                            subtitle="Telefonun sistem bildirim iznini yönetin"
                            onPress={() => Linking.openSettings()}
                            isLast
                        />
                    </SectionCard>

                    <SectionCard title="Bildirimler">
                        <ToggleRow
                            title="Mesaj Bildirimleri"
                            subtitle="Yeni mesaj geldiğinde bildirim al"
                            value={settings.messages}
                            onValueChange={(v) => update({ ...settings, messages: v })}
                        />
                        <ToggleRow
                            title="Gönderi Bildirimleri"
                            subtitle="Sipariş/gönderi durumu değiştiğinde bildirim al"
                            value={settings.shipments}
                            onValueChange={(v) => update({ ...settings, shipments: v })}
                            isLast
                        />
                    </SectionCard>

                    <SectionCard title="Sesler">
                        <ToggleRow
                            title="Sesler"
                            subtitle="Bildirimlerde ses çalsın"
                            value={settings.sounds}
                            onValueChange={(v) => update({ ...settings, sounds: v })}
                        />
                        <LinkRow
                            title="Bildirim Sesi"
                            value={notificationSoundLabel}
                            onPress={() => router.push('/sound-picker/notification')}
                        />
                        <ToggleRow
                            title="Arama Sesi"
                            subtitle="Gelen aramalarda ses çalsın"
                            value={settings.callSound}
                            onValueChange={(v) => update({ ...settings, callSound: v })}
                        />
                        <LinkRow
                            title="Arama Sesi Tonu"
                            value={callSoundLabel}
                            onPress={() => router.push('/sound-picker/call')}
                        />
                        <ToggleRow
                            title="Arama Sesini Göster"
                            subtitle="Arama ekranında ses göstergesini göster"
                            value={settings.showCallSound}
                            onValueChange={(v) => update({ ...settings, showCallSound: v })}
                            isLast
                        />
                    </SectionCard>

                    <SectionCard title="Titreşimler">
                        <ToggleRow
                            title="Buton Titreşimleri"
                            subtitle="Onay, gönderme ve silme gibi işlemlerde titreşim ver"
                            value={haptics}
                            onValueChange={toggleHaptics}
                            isLast
                        />
                    </SectionCard>

                    <SectionCard title="Uygulama İçi Bildirimler">
                        <LinkRow
                            title="Uygulama İçi Bildirimler"
                            value={ALERT_STYLE_LABEL[settings.inApp.alertStyle]}
                            onPress={() => router.push('/in-app-notifications')}
                            isLast
                        />
                    </SectionCard>

                    <Tappable
                        onPress={handleReset}
                        activeOpacity={0.7}
                        className="h-14 rounded-2xl items-center justify-center bg-red-50 border border-red-100"
                    >
                        <Text className="text-red-500 text-[14px] font-bold">Bildirim Ayarlarını Sıfırla</Text>
                    </Tappable>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
