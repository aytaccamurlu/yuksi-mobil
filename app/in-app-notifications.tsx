import { ScreenHeader, SectionCard, ToggleRow } from '@/components/SettingsRows';
import { InAppAlertStyle, useGetNotificationSettingsQuery, useUpdateNotificationSettingsMutation } from '@/service/notificationSettings.service';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const STYLES: { id: InAppAlertStyle; title: string }[] = [
    { id: 'none', title: 'Yok' },
    { id: 'banners', title: "Banner'lar" },
    { id: 'alerts', title: 'Uyarılar' },
];

function PhonePreview({ style, active }: { style: InAppAlertStyle; active: boolean }) {
    return (
        <View style={[phone.frame, active && phone.frameActive]}>
            {style === 'banners' && <View style={[phone.banner, active && phone.bannerActive]} />}
            {style === 'alerts' && (
                <View style={phone.alertWrap}>
                    <View style={[phone.alertBox, active && phone.alertBoxActive]} />
                </View>
            )}
        </View>
    );
}

const phone = StyleSheet.create({
    frame: {
        width: 56,
        height: 96,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        paddingTop: 10,
    },
    frameActive: { borderColor: '#FF5B04' },
    banner: {
        width: 44,
        height: 10,
        borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },
    bannerActive: { backgroundColor: '#FF5B04' },
    alertWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    alertBox: {
        width: 32,
        height: 22,
        borderRadius: 5,
        backgroundColor: '#D1D5DB',
    },
    alertBoxActive: { backgroundColor: '#FF5B04' },
});

export default function InAppNotificationsScreen() {
    const router = useRouter();
    const { data: settings, isLoading } = useGetNotificationSettingsQuery();
    const [update] = useUpdateNotificationSettingsMutation();

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScreenHeader title="Uygulama İçi Bildirimler" onBack={() => router.back()} />

            {isLoading || !settings ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : (
                <ScrollView className="px-5 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                    <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wide">
                        Uyarı Stili
                    </Text>
                    <View
                        className="bg-white rounded-3xl p-5 border border-gray-100 flex-row justify-around"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.06,
                            shadowRadius: 12,
                            elevation: 3,
                        }}
                    >
                        {STYLES.map((s) => {
                            const active = settings.inApp.alertStyle === s.id;
                            return (
                                <Tappable
                                    key={s.id}
                                    activeOpacity={0.7}
                                    onPress={() => update({ ...settings, inApp: { ...settings.inApp, alertStyle: s.id } })}
                                    className="items-center"
                                >
                                    <PhonePreview style={s.id} active={active} />
                                    <View
                                        className={`mt-2.5 px-3 py-1 rounded-full ${active ? 'bg-orange-500' : ''}`}
                                    >
                                        <Text className={`text-[13px] font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
                                            {s.title}
                                        </Text>
                                    </View>
                                </Tappable>
                            );
                        })}
                    </View>
                    <Text className="text-[12px] text-gray-400 mt-3 ml-1 leading-5">
                        Uyarılar devam etmeden önce bir aksiyon gerektirir. Banner'lar ekranın üstünde belirir ve
                        kendiliğinden kaybolur.
                    </Text>

                    <View className="mt-6">
                        <SectionCard title="Diğer">
                            <ToggleRow
                                title="Sesler"
                                value={settings.inApp.sounds}
                                onValueChange={(v) => update({ ...settings, inApp: { ...settings.inApp, sounds: v } })}
                            />
                            <ToggleRow
                                title="Titreşim"
                                value={settings.inApp.vibration}
                                onValueChange={(v) => update({ ...settings, inApp: { ...settings.inApp, vibration: v } })}
                                isLast
                            />
                        </SectionCard>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
