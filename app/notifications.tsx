import NotificationCard from '@/components/NotificationCard';
import {
    useDeleteNotificationsMutation,
    useGetNotificationsQuery,
    useMarkAllNotificationsReadMutation,
} from '@/service/notifications.service';
import { useUserSession } from '@/store/feature/user/hooks';
import { Feather } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
    const router = useRouter();
    const userSession = useUserSession();
    const { data, isLoading } = useGetNotificationsQuery();
    const [deleteNotifications, { isLoading: isDeleting }] = useDeleteNotificationsMutation();
    const [markAllRead] = useMarkAllNotificationsReadMutation();

    const markedReadRef = useRef(false);
    const unseenSnapshotRef = useRef<Set<string> | null>(null);
    useEffect(() => {
        if (unseenSnapshotRef.current || isLoading) return;
        const raw = data?.data || data || [];
        const list = Array.isArray(raw) ? raw : [];
        const unseenIds = list.filter((n: any) => !(n.is_seen ?? n.isSeen ?? false)).map((n: any) => String(n.id));
        unseenSnapshotRef.current = new Set(unseenIds);
        if (unseenIds.length === 0) return;
        markedReadRef.current = true;
        markAllRead();
    }, [data, isLoading, markAllRead]);

    // Boş/yükleniyor durumunu native header'ı hesaba katıp gerçek ekran ortasına oturtur.
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const centerOffset = -(headerHeight - insets.bottom) / 2;

    const notifications = useMemo(() => {
        const raw = data?.data || data || [];
        const list = Array.isArray(raw) ? raw : [];
        const name = userSession?.first_name || 'Kullanıcı';
        const unseenSnapshot = unseenSnapshotRef.current;
        return list.map((n: any) => ({
            ...n,
            title: String(n.title || '').replace('{{name}}', name),
            createdAt: n.createdAt || n.created_at,
            unseen: unseenSnapshot ? unseenSnapshot.has(String(n.id)) : !(n.is_seen ?? n.isSeen ?? false),
        }));
    }, [data, userSession?.first_name]);

    const keyExtractor = useCallback((item: any) => String(item.id), []);
    const renderItem = useCallback(({ item }: { item: any }) => <NotificationCard item={item} />, []);

    const handleClearAll = () => {
        if (notifications.length === 0 || isDeleting) return;

        // Silme anındaki id anlık görüntüsü — araya giren yeni bildirime dokunulmaz.
        const idsToDelete = notifications.map((n: any) => n.id);

        Alert.alert('Bildirimleri Sil', 'Tüm bildirimleri silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteNotifications({ ids: idsToDelete }).unwrap();
                    } catch {
                        Alert.alert('Hata', 'Bildirimler silinemedi, lütfen tekrar deneyin.');
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Bildirimler',
                    headerTitleStyle: { fontWeight: '800', fontSize: 18, color: '#111827' },
                    headerStyle: { backgroundColor: '#fff' },
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <Tappable onPress={() => router.back()} className="mr-3">
                            <Feather name="chevron-left" size={26} color="#FF5B04" />
                        </Tappable>
                    ),
                    headerRight: () =>
                        notifications.length > 0 ? (
                            <Tappable haptic="warning"
                                onPress={handleClearAll}
                                disabled={isDeleting}
                                className="w-9 h-9 bg-orange-50 rounded-full items-center justify-center"
                                style={{ opacity: isDeleting ? 0.5 : 1 }}
                            >
                                <Feather name="trash-2" size={17} color="#FF5B04" />
                            </Tappable>
                        ) : null,
                }}
            />

            {isLoading ? (
                <View className="flex-1 items-center justify-center" style={{ marginTop: centerOffset }}>
                    <ActivityIndicator size="large" color="#FF5B04" />
                    <Text className="text-gray-400 mt-3 text-sm">Bildirimler yükleniyor...</Text>
                </View>
            ) : notifications.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8" style={{ marginTop: centerOffset }}>
                    <View className="w-20 h-20 bg-orange-50 rounded-3xl items-center justify-center mb-5">
                        <Feather name="bell-off" size={36} color="#FF5B04" />
                    </View>
                    <Text className="text-gray-800 text-lg font-bold text-center">Henüz Bildirim Yok</Text>
                    <Text className="text-gray-400 text-sm text-center mt-2">
                        Gönderileriniz ve hesabınızla ilgili bildirimler burada görünecek.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                />
            )}
        </SafeAreaView>
    );
}
