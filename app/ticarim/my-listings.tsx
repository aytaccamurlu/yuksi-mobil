import AnchoredMenu, { AnchoredMenuItem } from '@/components/AnchoredMenu';
import {
    useDeleteListingMutation,
    useGetMyListingsQuery,
    useMarkListingSoldMutation,
    usePublishListingMutation,
    useReactivateListingMutation,
    useSetListingPassiveMutation,
} from '@/service/ticarim.service';
import { startTicarimListing } from '@/store/feature/ticarim/actions';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatPrice = (price: number) => `${price.toLocaleString('tr-TR')}TL`;

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
    Draft: { label: 'Taslak', bg: '#F3F4F6', text: '#6B7280' },
    Pending: { label: 'İncelemede', bg: '#FEF3C7', text: '#B45309' },
    Active: { label: 'Yayında', bg: '#DCFCE7', text: '#15803D' },
    Passive: { label: 'Pasif', bg: '#F3F4F6', text: '#6B7280' },
    Sold: { label: 'Satıldı', bg: '#DBEAFE', text: '#1D4ED8' },
    Rejected: { label: 'Reddedildi', bg: '#FEE2E2', text: '#DC2626' },
    Expired: { label: 'Süresi Doldu', bg: '#F3F4F6', text: '#6B7280' },
};

export default function MyListingsScreen() {
    const router = useRouter();
    const { data, isLoading } = useGetMyListingsQuery();
    const [deleteListing] = useDeleteListingMutation();
    const [publishListing] = usePublishListingMutation();
    const [setListingPassive] = useSetListingPassiveMutation();
    const [reactivateListing] = useReactivateListingMutation();
    const [markListingSold] = useMarkListingSoldMutation();

    const [menu, setMenu] = useState<{ x: number; y: number; item: any } | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const listings: any[] = data || [];

    const run = async (id: string, action: () => Promise<any>, failMessage: string) => {
        setBusyId(id);
        try {
            await action();
        } catch {
            Alert.alert('Hata', failMessage);
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = (id: string, title: string) => {
        Alert.alert('İlanı Kaldır', `"${title}" ilanını kaldırmak istediğine emin misin?`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Kaldır',
                style: 'destructive',
                onPress: () => run(id, () => deleteListing(id).unwrap(), 'İlan kaldırılamadı, lütfen tekrar deneyin.'),
            },
        ]);
    };

    const menuItemsFor = (item: any): AnchoredMenuItem[] => {
        const items: AnchoredMenuItem[] = [];
        const editable = item.status !== 'Sold' && item.status !== 'Deleted';

        if (editable) {
            items.push({
                key: 'edit',
                label: 'Düzenle',
                icon: 'edit-2',
                onPress: () => router.push({ pathname: '/ticarim/edit/[id]', params: { id: item.id } }),
            });
            items.push({
                key: 'photos',
                label: 'Fotoğrafları Yönet',
                icon: 'image',
                onPress: () => router.push({ pathname: '/ticarim/manage-photos/[id]', params: { id: item.id } }),
            });
        }

        if (item.status === 'Draft' || item.status === 'Rejected') {
            items.push({
                key: 'publish',
                label: 'Yayınla',
                icon: 'upload-cloud',
                onPress: () => run(item.id, () => publishListing(item.id).unwrap(), 'İlan yayınlanamadı.'),
            });
        }
        if (item.status === 'Active') {
            items.push({
                key: 'passive',
                label: 'Pasife Al',
                icon: 'eye-off',
                onPress: () => run(item.id, () => setListingPassive(item.id).unwrap(), 'İlan pasife alınamadı.'),
            });
        }
        if (item.status === 'Passive') {
            items.push({
                key: 'reactivate',
                label: 'Yeniden Yayınla',
                icon: 'upload-cloud',
                onPress: () => run(item.id, () => reactivateListing(item.id).unwrap(), 'İlan yeniden yayınlanamadı.'),
            });
        }
        if (item.status === 'Active' || item.status === 'Passive') {
            items.push({
                key: 'sold',
                label: 'Satıldı Olarak İşaretle',
                icon: 'check-circle',
                onPress: () => run(item.id, () => markListingSold(item.id).unwrap(), 'İlan güncellenemedi.'),
            });
        }

        items.push({
            key: 'delete',
            label: 'Sil',
            icon: 'trash-2',
            danger: true,
            onPress: () => handleDelete(item.id, item.title),
        });

        return items;
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">İlanlarım</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF5B04" />
                </View>
            ) : listings.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8">
                    <View className="w-20 h-20 bg-orange-50 rounded-3xl items-center justify-center mb-5">
                        <Feather name="file-text" size={32} color="#FF5B04" />
                    </View>
                    <Text className="text-gray-800 text-lg font-bold text-center">Henüz İlanın Yok</Text>
                    <Text className="text-gray-400 text-sm text-center mt-2">
                        Aracını satmak için hemen bir ilan oluştur.
                    </Text>
                    <Tappable
                        className="mt-6 bg-primary px-8 py-3.5 rounded-2xl flex-row items-center"
                        onPress={() => {
                            startTicarimListing();
                            router.push('/ticarim/create/photos');
                        }}
                        activeOpacity={0.8}
                        style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    >
                        <Feather name="plus" size={16} color="#fff" />
                        <Text className="text-white font-bold text-sm ml-2">İlan Ver</Text>
                    </Tappable>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
                    {listings.map((item: any) => {
                        const meta = STATUS_META[item.status] || STATUS_META.Draft;
                        return (
                            <Tappable
                                key={item.id}
                                onPress={() => router.push({ pathname: '/ticarim/[id]', params: { id: item.id } })}
                                activeOpacity={0.8}
                                className="bg-white rounded-3xl mb-4 flex-row overflow-hidden border border-gray-100"
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2,
                                }}
                            >
                                <Image
                                    source={{ uri: item.photos?.[0] }}
                                    style={{ width: 96, height: 110, backgroundColor: '#F3F4F6' }}
                                    resizeMode="cover"
                                />
                                <View className="flex-1 p-3">
                                    <View
                                        className="self-start rounded-full px-2.5 py-1 mb-1.5"
                                        style={{ backgroundColor: meta.bg }}
                                    >
                                        <Text style={{ color: meta.text, fontSize: 11, fontWeight: '700' }}>
                                            {meta.label}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-900 font-bold text-[15px]" numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text className="text-gray-400 text-[12px] mt-1">{item.location}</Text>
                                    <Text className="text-primary font-extrabold text-[15px] mt-1.5">
                                        {formatPrice(item.price)}
                                    </Text>
                                </View>
                                <Tappable
                                    onPress={(e) => setMenu({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, item })}
                                    disabled={busyId === item.id}
                                    className="w-9 h-9 rounded-xl border-2 border-primary items-center justify-center m-3"
                                >
                                    {busyId === item.id ? (
                                        <ActivityIndicator size="small" color="#FF5B04" />
                                    ) : (
                                        <Feather name="more-vertical" size={15} color="#FF5B04" />
                                    )}
                                </Tappable>
                            </Tappable>
                        );
                    })}
                </ScrollView>
            )}

            <AnchoredMenu
                visible={!!menu}
                anchor={menu}
                items={menu ? menuItemsFor(menu.item) : []}
                onClose={() => setMenu(null)}
            />
        </SafeAreaView>
    );
}
