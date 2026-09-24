import Avatar from '@/components/Avatar';
import type { Conversation } from '@/components/ConversationRow';
import {
    useDeleteConversationMutation,
    useGetConversationsQuery,
    useUnblockUserMutation,
    useUpdateConversationMutation,
} from '@/service/messages.service';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContactInfoScreen() {
    const router = useRouter();
    const { id, name: pName, avatar: pAvatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
    const convId = String(id);

    const { data: convData } = useGetConversationsQuery();
    const [updateConversation] = useUpdateConversationMutation();
    const [unblockUser] = useUnblockUserMutation();
    const [deleteConversation] = useDeleteConversationMutation();

    const found: Conversation | undefined = (convData?.data || convData || []).find(
        (c: Conversation) => c.id === convId,
    );
    const conversation: Conversation | undefined =
        found || (pName ? { id: convId, name: pName, avatar: pAvatar || null, lastMessage: '', time: '', unread: 0, status: 'offline' } : undefined);

    const name = conversation?.name || 'Kişi';
    const blocked = !!conversation?.blocked;
    const muted = !!conversation?.muted;

    const call = (type: 'voice' | 'video') =>
        router.push({
            pathname: '/call/[id]',
            params: { id: convId, name, avatar: conversation?.avatar ?? '', type },
        });

    const handleDelete = () => {
        Alert.alert('Sohbeti sil', 'Bu sohbet ve içindeki mesajlar silinecek. Devam edilsin mi?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    await deleteConversation(convId).unwrap().catch(() => {});
                    router.back();
                    router.back();
                },
            },
        ]);
    };

    const handleBlock = () => {
        if (blocked) {
            const otherUserId = (conversation as any)?.otherUserId;
            if (otherUserId) unblockUser({ targetUserId: otherUserId });
            return;
        }
        Alert.alert('Kişiyi engelle', `${name} artık sana mesaj gönderemeyecek. Devam edilsin mi?`, [
            { text: 'İptal', style: 'cancel' },
            { text: 'Engelle', style: 'destructive', onPress: () => updateConversation({ id: convId, blocked: true }) },
        ]);
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Kişi Bilgisi</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                <View className="items-center pt-8 pb-6">
                    <Avatar name={name} uri={blocked ? null : conversation?.avatar} size={96} ring="#FF5B04" />
                    <Text className="text-gray-900 text-xl font-bold tracking-tight mt-4">{name}</Text>
                    {blocked && <Text className="text-gray-400 text-sm mt-1">Engellendi</Text>}
                </View>

                <View className="flex-row justify-center gap-3 px-5 mb-6">
                    <QuickAction icon="phone" label="Sesli Ara" onPress={() => call('voice')} />
                    <QuickAction icon="video" label="Görüntülü Ara" onPress={() => call('video')} />
                    <QuickAction icon="image" label="Medya" onPress={() => router.push(`/messages/media/${convId}`)} />
                </View>

                <View className="px-5">
                    <View
                        className="bg-white rounded-3xl p-2 border border-gray-100"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}
                    >
                        <Row
                            icon="image"
                            title="Medya, Bağlantılar ve Belgeler"
                            onPress={() => router.push(`/messages/media/${convId}`)}
                        />
                        <Row
                            icon={muted ? 'bell' : 'bell-off'}
                            title={muted ? 'Bildirimleri Aç' : 'Bildirimleri Sessize Al'}
                            onPress={() => updateConversation({ id: convId, muted: !muted })}
                            last
                        />
                    </View>

                    <View
                        className="bg-white rounded-3xl p-2 border border-gray-100 mt-6"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}
                    >
                        <Row
                            icon={blocked ? 'check-circle' : 'slash'}
                            title={blocked ? 'Engeli Kaldır' : 'Kişiyi Engelle'}
                            onPress={handleBlock}
                            danger={!blocked}
                        />
                        <Row
                            icon="flag"
                            title="Şikayet Et"
                            onPress={() =>
                                router.push({ pathname: '/complaint/new', params: { conversationId: convId, name } })
                            }
                            danger
                        />
                        <Row icon="trash-2" title="Sohbeti Sil" onPress={handleDelete} danger last />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function QuickAction({
    icon,
    label,
    onPress,
}: {
    icon: React.ComponentProps<typeof Feather>['name'];
    label: string;
    onPress: () => void;
}) {
    return (
        <Tappable onPress={onPress} activeOpacity={0.7} className="items-center flex-1">
            <View className="w-14 h-14 rounded-full bg-orange-50 items-center justify-center mb-1.5">
                <Feather name={icon} size={20} color="#FF5B04" />
            </View>
            <Text className="text-[12px] font-semibold text-gray-600" numberOfLines={1}>
                {label}
            </Text>
        </Tappable>
    );
}

function Row({
    icon,
    title,
    onPress,
    danger,
    last,
}: {
    icon: React.ComponentProps<typeof Feather>['name'];
    title: string;
    onPress: () => void;
    danger?: boolean;
    last?: boolean;
}) {
    return (
        <Tappable
            haptic={danger ? 'warning' : 'none'}
            className={`flex-row items-center px-3 py-3.5 ${last ? '' : 'border-b border-gray-50'}`}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3.5"
                style={{ backgroundColor: danger ? '#FEF2F2' : '#FFF1EA' }}
            >
                <Feather name={icon} size={17} color={danger ? '#DC2626' : '#FF5B04'} />
            </View>
            <Text className={`text-[15px] font-semibold flex-1 tracking-tight ${danger ? 'text-red-600' : 'text-gray-800'}`}>
                {title}
            </Text>
            <Feather name="chevron-right" size={18} color="#D1D5DB" />
        </Tappable>
    );
}
