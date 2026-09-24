import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

type AccountRow = {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    route: string;
};

const ROWS: AccountRow[] = [
    {
        id: 'change-password',
        title: 'Şifre Değiştir',
        subtitle: 'Hesap şifrenizi güncelleyin',
        icon: 'lock',
        route: '/change-password',
    },
    {
        id: 'change-email',
        title: 'E-posta Adresi',
        subtitle: 'Kayıtlı e-posta adresinizi değiştirin',
        icon: 'mail',
        route: '/change-email',
    },
    {
        id: 'phone-number',
        title: 'Telefon Numarası',
        subtitle: 'Kayıtlı telefon numaranızı değiştirin',
        icon: 'phone',
        route: '/phone-number',
    },
    {
        id: 'connected-accounts',
        title: 'Hesap Bağlantılarım',
        subtitle: 'Google, Apple ve Facebook bağlantılarınızı yönetin',
        icon: 'link',
        route: '/connected-accounts',
    },
];

export default function AccountScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-100 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 mr-3"
                >
                    <Feather name="arrow-left" size={20} color="#374151" />
                </Tappable>
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Hesap</Text>
            </View>

            <View className="px-5 pt-6">
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
                    {ROWS.map((row, index) => (
                        <Tappable
                            key={row.id}
                            className={`flex-row items-center px-3 py-3.5 ${
                                index !== ROWS.length - 1 ? 'border-b border-gray-50' : ''
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
        </SafeAreaView>
    );
}
