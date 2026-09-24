import {
    useClearShipmentHistoryMutation,
    useRestoreAddressesMutation,
    useRestoreShipmentHistoryMutation,
} from '@/service/createLoad.service';
import { useRestoreComplaintsMutation } from '@/service/complaints.service';
import { useRestoreConversationsMutation, useRestoreMessagesMutation } from '@/service/messages.service';
import { useRestoreNotificationsMutation } from '@/service/notifications.service';
import { isMockAccessToken } from '@/service/api';
import { clearUserSession } from '@/store/feature/user/actions';
import { useUserSession } from '@/store/feature/user/hooks';
import { clearAllLocalData, clearAutoReloginCredentials } from '@/utils/storage';
import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

type DevAction = {
    id: string;
    title: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    danger?: boolean;
    onPress: () => void;
};

export default function DeveloperToolsScreen() {
    const router = useRouter();
    const userSession = useUserSession();
    const [restoreNotifications] = useRestoreNotificationsMutation();
    const [restoreAddresses] = useRestoreAddressesMutation();
    const [clearShipmentHistory] = useClearShipmentHistoryMutation();
    const [restoreShipmentHistory] = useRestoreShipmentHistoryMutation();
    const [restoreMessages] = useRestoreMessagesMutation();
    const [restoreConversations] = useRestoreConversationsMutation();
    const [restoreComplaints] = useRestoreComplaintsMutation();

    const handleResetApp = () => {
        Alert.alert(
            'Uygulamayı Sıfırla',
            'Oturum, onboarding durumu ve mock veriler (gönderiler, kayıtlı adresler) tamamen silinecek. Emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sıfırla',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllLocalData();
                        await clearAutoReloginCredentials();
                        clearUserSession();
                    },
                },
            ],
        );
    };

    const handleRestoreNotifications = () => {
        Alert.alert('Bildirimleri Geri Getir', 'Silinen tüm bildirimler geri gelecek. Devam edilsin mi?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Geri Getir',
                onPress: async () => {
                    await restoreNotifications().unwrap();
                    Alert.alert('Tamam', 'Bildirimler geri getirildi.');
                },
            },
        ]);
    };

    const handleRestoreAddresses = () => {
        Alert.alert('Kayıtlı Adresleri Geri Getir', 'Silinen tüm rotalar (seed dahil) geri gelecek. Devam edilsin mi?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Geri Getir',
                onPress: async () => {
                    await restoreAddresses().unwrap();
                    Alert.alert('Tamam', 'Kayıtlı adresler geri getirildi.');
                },
            },
        ]);
    };

    const handleClearShipmentHistory = () => {
        Alert.alert(
            'Gönderi Geçmişini Temizle',
            'Test sırasında oluşturduğunuz gönderiler kalıcı olarak silinecek. Devam edilsin mi?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Temizle',
                    style: 'destructive',
                    onPress: async () => {
                        await clearShipmentHistory().unwrap();
                        Alert.alert('Tamam', 'Gönderi geçmişi temizlendi.');
                    },
                },
            ],
        );
    };

    const handleRestoreShipmentHistory = () => {
        Alert.alert('Gönderileri Geri Getir', 'Temizlenen tüm gönderiler (seed dahil) geri gelecek. Devam edilsin mi?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Geri Getir',
                onPress: async () => {
                    await restoreShipmentHistory().unwrap();
                    Alert.alert('Tamam', 'Gönderi geçmişi geri getirildi.');
                },
            },
        ]);
    };

    const handleRestoreMessages = () => {
        Alert.alert('Mesajları Sıfırla', 'Gönderdiğiniz test mesajları silinip başlangıç sohbetlerine dönülecek. Devam edilsin mi?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sıfırla',
                onPress: async () => {
                    await restoreMessages().unwrap();
                    Alert.alert('Tamam', 'Mesajlar sıfırlandı.');
                },
            },
        ]);
    };

    const handleRestoreConversations = () => {
        Alert.alert('Sohbetleri Geri Getir', 'Silinen tüm sohbetler geri gelecek. Devam edilsin mi?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Geri Getir',
                onPress: async () => {
                    await restoreConversations().unwrap();
                    Alert.alert('Tamam', 'Sohbetler geri getirildi.');
                },
            },
        ]);
    };

    const handleRestoreComplaints = () => {
        Alert.alert('Şikayetleri Sıfırla', 'Oluşturduğunuz test şikayetleri silinecek. Devam edilsin mi?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sıfırla',
                onPress: async () => {
                    await restoreComplaints().unwrap();
                    Alert.alert('Tamam', 'Şikayetler sıfırlandı.');
                },
            },
        ]);
    };

    const actions: DevAction[] = [
        {
            id: 'restore-conversations',
            title: 'Sohbetleri Geri Getir',
            icon: 'message-square',
            onPress: handleRestoreConversations,
        },
        {
            id: 'restore-complaints',
            title: 'Şikayetleri Sıfırla',
            icon: 'flag',
            onPress: handleRestoreComplaints,
        },
        {
            id: 'restore-messages',
            title: 'Mesajları Sıfırla',
            icon: 'message-circle',
            onPress: handleRestoreMessages,
        },
        {
            id: 'restore-notifications',
            title: 'Bildirimleri Geri Getir',
            icon: 'bell',
            onPress: handleRestoreNotifications,
        },
        {
            id: 'restore-addresses',
            title: 'Kayıtlı Adresleri Geri Getir',
            icon: 'map-pin',
            onPress: handleRestoreAddresses,
        },
        {
            id: 'restore-shipment-history',
            title: 'Gönderileri Geri Getir',
            icon: 'box',
            onPress: handleRestoreShipmentHistory,
        },
        {
            id: 'clear-shipment-history',
            title: 'Gönderi Geçmişini Temizle',
            icon: 'trash-2',
            danger: true,
            onPress: handleClearShipmentHistory,
        },
        {
            id: 'reset-app',
            title: 'Uygulamayı Sıfırla',
            icon: 'refresh-cw',
            danger: true,
            onPress: handleResetApp,
        },
    ];

    if (!__DEV__ || !isMockAccessToken(userSession?.accessToken)) {
        return <Redirect href="/(tabs)/profile" />;
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-100 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 mr-3"
                >
                    <Feather name="arrow-left" size={20} color="#374151" />
                </Tappable>
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Geliştirici Araçları</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <View
                    className="bg-white rounded-3xl p-2 border border-gray-100"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.12,
                        shadowRadius: 16,
                        elevation: 7,
                    }}
                >
                    {actions.map((action, index) => (
                        <Tappable
                            key={action.id}
                            className={`flex-row items-center px-3 py-4 ${
                                index !== actions.length - 1 ? 'border-b border-gray-50' : ''
                            }`}
                            onPress={action.onPress}
                            activeOpacity={0.6}
                        >
                            <Feather
                                name={action.icon}
                                size={20}
                                color={action.danger ? '#EF4444' : '#FF5B04'}
                                style={{ marginRight: 14 }}
                            />
                            <Text
                                className={`text-[15px] font-semibold flex-1 tracking-tight ${
                                    action.danger ? 'text-red-500' : 'text-gray-800'
                                }`}
                            >
                                {action.title}
                            </Text>
                        </Tappable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
