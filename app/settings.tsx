import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

type SettingsRow = {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    route: string;
};

type SettingsSection = {
    id: string;
    title: string | null;
    rows: SettingsRow[];
};

const SECTIONS: SettingsSection[] = [
    {
        id: 'general',
        title: null,
        rows: [
            {
                id: 'account',
                title: 'Hesap',
                subtitle: 'Şifre, e-posta, telefon ve hesap bağlantıları',
                icon: 'user',
                route: '/account',
            },
            {
                id: 'payment-methods',
                title: 'Kayıtlı Kartlarım',
                subtitle: 'Kredi kartı ekleyin veya kaldırın',
                icon: 'credit-card',
                route: '/payment-methods',
            },
            {
                id: 'notifications',
                title: 'Bildirimler & Titreşimler',
                subtitle: 'Bildirim ve titreşim tercihlerinizi yönetin',
                icon: 'bell',
                route: '/notification-settings',
            },
            {
                id: 'storage-data',
                title: 'Depolama ve Veri',
                subtitle: 'Depolama, ağ ve medya kalitesini yönetin',
                icon: 'hard-drive',
                route: '/storage-data',
            },
            {
                id: 'user-location',
                title: 'Konum',
                subtitle: 'Mevcut konumunuzu görüntüleyin veya güncelleyin',
                icon: 'map-pin',
                route: '/user-location',
            },
        ],
    },
    {
        id: 'chat',
        title: 'Sohbet',
        rows: [
            {
                id: 'chat-status',
                title: 'Sohbet Durumu',
                subtitle: 'Çevrimiçi görünürlüğünüzü görün',
                icon: 'circle',
                route: '/chat-status',
            },
            {
                id: 'blocked-users',
                title: 'Engellenen Kişiler',
                subtitle: 'Engellediğiniz kişileri görüntüleyin',
                icon: 'user-x',
                route: '/blocked-users',
            },
        ],
    },
];

export default function SettingsScreen() {
    const router = useRouter();

    const handleDeleteAccount = () => {
        Alert.alert(
            'Hesabınızı silmek istediğinize emin misiniz?',
            'Hesabınız ve hesabınızla ilişkili tüm bilgiler kaldırılacak.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Devam Et',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Son kez soruyoruz',
                            'Bu işlem geri alınamaz. Hesabınızı silmek istediğinizden emin misiniz?',
                            [
                                { text: 'Vazgeç', style: 'cancel' },
                                {
                                    text: 'Evet, Eminim',
                                    style: 'destructive',
                                    onPress: () => router.push('/delete-account'),
                                },
                            ],
                        );
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Ayarlar</Text>
            </View>

            <View className="px-5 pt-6">
                {SECTIONS.map((section, sIndex) => (
                    <View key={section.id} className={sIndex !== 0 ? 'mt-6' : ''}>
                        {!!section.title && (
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wide">
                                {section.title}
                            </Text>
                        )}
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
                            {section.rows.map((row, index) => (
                                <Tappable
                                    key={row.id}
                                    className={`flex-row items-center px-3 py-3.5 ${
                                        index !== section.rows.length - 1 ? 'border-b border-gray-50' : ''
                                    }`}
                                    onPress={() => router.push(row.route as any)}
                                    activeOpacity={0.6}
                                >
                                    <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-3.5">
                                        <Feather name={row.icon} size={17} color="#FF5B04" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[15px] font-semibold text-gray-800 tracking-tight">
                                            {row.title}
                                        </Text>
                                        <Text className="text-[12px] text-gray-400 mt-0.5">{row.subtitle}</Text>
                                    </View>
                                    <Feather name="chevron-right" size={18} color="#D1D5DB" />
                                </Tappable>
                            ))}
                        </View>
                    </View>
                ))}

                <Tappable haptic="warning"
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                    className="h-14 rounded-2xl items-center justify-center bg-white border border-gray-100 flex-row mt-6"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.06,
                        shadowRadius: 12,
                        elevation: 3,
                    }}
                >
                    <Feather name="x-square" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text className="text-red-500 text-[15px] font-bold">Hesabımı Sil</Text>
                </Tappable>
            </View>
        </SafeAreaView>
    );
}
