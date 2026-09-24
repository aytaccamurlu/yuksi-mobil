import { LinkRow, ScreenHeader, SectionCard, ToggleRow } from '@/components/SettingsRows';
import {
    AUTO_DOWNLOAD_FIELD_LABEL,
    DOWNLOAD_PREF_LABEL,
    MEDIA_QUALITY_LABEL,
} from '@/constants/storageOptions';
import { useGetStorageSettingsQuery, useUpdateStorageSettingsMutation } from '@/service/storageSettings.service';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StorageDataScreen() {
    const router = useRouter();
    const { data: settings, isLoading } = useGetStorageSettingsQuery();
    const [update] = useUpdateStorageSettingsMutation();

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScreenHeader title="Depolama ve Veri" onBack={() => router.back()} />

            {isLoading || !settings ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : (
                <ScrollView className="px-5 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                    <SectionCard title="Depolama">
                        <LinkRow
                            title="Depolamayı Yönet"
                            subtitle="Sohbet ve medya kullanımını inceleyin"
                            onPress={() => router.push('/manage-storage')}
                            isLast
                        />
                    </SectionCard>

                    <SectionCard title="Ağ">
                        <LinkRow
                            title="Ağ Kullanımı"
                            subtitle="Gönderilen/alınan veriyi görüntüleyin"
                            onPress={() => router.push('/network-usage')}
                        />
                        <ToggleRow
                            title="Aramalar İçin Daha Az Veri Kullan"
                            value={settings.lessDataForCalls}
                            onValueChange={(v) => update({ lessDataForCalls: v })}
                        />
                        <LinkRow
                            title="Proxy"
                            value={settings.proxyEnabled ? 'Açık' : 'Kapalı'}
                            onPress={() => router.push('/proxy-settings')}
                            isLast
                        />
                    </SectionCard>

                    <SectionCard title="Medya Kalitesi">
                        <LinkRow
                            title="Yükleme Kalitesi"
                            value={MEDIA_QUALITY_LABEL[settings.uploadQuality]}
                            onPress={() => router.push('/media-quality/upload')}
                        />
                        <LinkRow
                            title="Otomatik İndirme Kalitesi"
                            value={MEDIA_QUALITY_LABEL[settings.autoDownloadQuality]}
                            onPress={() => router.push('/media-quality/autoDownload')}
                            isLast
                        />
                    </SectionCard>

                    <SectionCard title="Medya Otomatik İndirme">
                        {(Object.keys(settings.autoDownload) as (keyof typeof settings.autoDownload)[]).map((field, index, arr) => (
                            <LinkRow
                                key={field}
                                title={AUTO_DOWNLOAD_FIELD_LABEL[field]}
                                value={DOWNLOAD_PREF_LABEL[settings.autoDownload[field]]}
                                onPress={() => router.push(`/auto-download/${field}`)}
                                isLast={index === arr.length - 1}
                            />
                        ))}
                    </SectionCard>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
