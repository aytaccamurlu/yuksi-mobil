import { useLogout } from '@/hooks/useLogout';
import { useAvatarSource } from '@/hooks/useAvatarSource';
import { BASE_URL, isMockAccessToken } from '@/service/api';
import { useUserSession } from '@/store/feature/user/hooks';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Share, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

type MenuItem = {
    id: string;
    title: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    onPress: () => void;
    chevron?: boolean;
    danger?: boolean;
};

function MenuCard({ items }: { items: MenuItem[] }) {
    return (
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
            {items.map((item, index) => (
                <Tappable
                    key={item.id}
                    className={`flex-row items-center px-3 py-4 ${
                        index !== items.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                    onPress={item.onPress}
                    activeOpacity={0.6}
                >
                    <Feather name={item.icon} size={20} color={item.danger ? '#EF4444' : '#FF5B04'} style={{ marginRight: 14 }} />
                    <Text
                        className={`text-[15px] font-semibold flex-1 tracking-tight ${
                            item.danger ? 'text-red-500' : 'text-gray-800'
                        }`}
                    >
                        {item.title}
                    </Text>
                    {item.chevron && <Feather name="chevron-right" size={20} color="#D1D5DB" />}
                </Tappable>
            ))}
        </View>
    );
}

export default function ProfileScreen() {
    const userSession = useUserSession();
    const router = useRouter();
    const handleLogout = useLogout();

    const capitalize = (str?: string) =>
        str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

    const getDisplayName = () => {
        const firstName = userSession?.first_name;
        const lastName = userSession?.last_name;
        const email = userSession?.email;

        if (firstName && lastName) {
            return `${capitalize(firstName)} ${capitalize(lastName)}`;
        }
        if (firstName) return capitalize(firstName);
        if (email) return email.split('@')[0];
        return 'Kullanıcı';
    };

    const getInitials = () => {
        const name = getDisplayName();
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    const formatAvatarUrl = (urlStr?: string) => {
        if (!urlStr) return null;
        if (urlStr.startsWith('http') || urlStr.startsWith('data:')) return urlStr;
        if (urlStr.startsWith('/')) return `${BASE_URL}${urlStr}`;
        return `data:image/jpeg;base64,${urlStr}`;
    };

    const formatPhoneDisplay = (raw?: string) => {
        if (!raw) return '';
        const digits = raw.replace(/\D/g, '');
        let local = digits;
        if (local.startsWith('90') && local.length > 10) local = local.slice(2);
        if (!local.startsWith('0')) local = `0${local}`;
        if (local.length !== 11) return raw;
        return `${local[0]} ${local.slice(1, 4)} ${local.slice(4, 7)} ${local.slice(7, 9)} ${local.slice(9, 11)}`;
    };

    const { uri: avatarUri, onError: onAvatarError } = useAvatarSource(
        formatAvatarUrl(userSession?.photo_url),
        userSession?.local_photo_uri,
    );
    const isDeveloper = __DEV__ && isMockAccessToken(userSession?.accessToken);

    const handleInvite = () => {
        Share.share({
            message: 'Yüksi ile kargo göndermek ve ticari araç almak-satmak çok kolay! Sen de dene: https://yuksi.tr',
        }).catch(() => {});
    };

    const primaryMenuItems: MenuItem[] = [
        {
            id: 'edit-profile',
            title: 'Profili Düzenle',
            icon: 'edit-2',
            chevron: true,
            onPress: () => router.push('/edit-profile'),
        },
        {
            id: 'settings',
            title: 'Ayarlar',
            icon: 'settings',
            chevron: true,
            onPress: () => router.push('/settings'),
        },
        {
            id: 'addresses',
            title: 'Kayıtlı Adreslerim',
            icon: 'file-text',
            chevron: true,
            onPress: () => router.push('/saved-addresses'),
        },
    ];

    const secondaryMenuItems: MenuItem[] = [
        {
            id: 'complaints',
            title: 'Şikayetlerim',
            icon: 'flag',
            chevron: true,
            onPress: () => router.push('/complaints'),
        },
        {
            id: 'feedback',
            title: 'Geribildirim',
            icon: 'message-square',
            chevron: true,
            onPress: () => router.push('/feedback'),
        },
        {
            id: 'agreements',
            title: 'Kullanım Koşulları ve Gizlilik',
            icon: 'shield',
            chevron: true,
            onPress: () => router.push('/agreements'),
        },
        {
            id: 'invite',
            title: 'Arkadaşını Davet Et',
            icon: 'user-plus',
            onPress: handleInvite,
        },
        {
            id: 'logout',
            title: 'Çıkış Yap',
            icon: 'log-out',
            danger: true,
            onPress: handleLogout,
        },
    ];

    return (
        <SafeAreaView className="flex-1 bg-orange-50" edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Avatar / İsim / Telefon */}
                <Tappable
                    className="items-center mt-8 mb-8 px-6"
                    activeOpacity={0.8}
                    onPress={() => router.push('/edit-profile')}
                >
                    <View
                        className="w-32 h-32 rounded-full border-[3px] border-primary p-1 mb-4"
                        style={{
                            backgroundColor: '#fff',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.22,
                            shadowRadius: 14,
                            elevation: 10,
                        }}
                    >
                        <View className="w-full h-full rounded-full bg-white overflow-hidden">
                            {avatarUri ? (
                                <Image
                                    source={{ uri: avatarUri }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                    onError={onAvatarError}
                                />
                            ) : (
                                <View className="w-full h-full bg-primary items-center justify-center">
                                    <Text className="text-white text-3xl font-bold tracking-tight">{getInitials()}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Text className="text-primary text-xl font-bold tracking-tight text-center">
                        {getDisplayName()}
                    </Text>
                    {!!userSession?.phone && (
                        <Text className="text-gray-500 font-medium text-sm mt-1">
                            {formatPhoneDisplay(userSession.phone)}
                        </Text>
                    )}
                </Tappable>

                {/* Menü */}
                <View className="px-5 mb-4">
                    <MenuCard items={primaryMenuItems} />
                </View>

                <View className="px-5">
                    <MenuCard items={secondaryMenuItems} />
                </View>

                {/* Geliştirici Araçları — sadece bu hesapla ve dev derlemesinde görünür */}
                {isDeveloper && (
                    <View className="px-5 mt-6">
                        <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-3 ml-2">
                            Geliştirici
                        </Text>
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
                            <Tappable
                                className="flex-row items-center px-3 py-4"
                                onPress={() => router.push('/developer-tools')}
                                activeOpacity={0.6}
                            >
                                <Feather name="tool" size={20} color="#FF5B04" style={{ marginRight: 14 }} />
                                <Text className="text-[15px] font-semibold flex-1 tracking-tight text-gray-800">
                                    Geliştirici Araçları
                                </Text>
                                <Feather name="chevron-right" size={20} color="#D1D5DB" />
                            </Tappable>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
