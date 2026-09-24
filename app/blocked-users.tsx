import Avatar from '@/components/Avatar';
import Tappable from '@/components/Tappable';
import { useGetBlockedConversationsQuery, useUnblockUserMutation } from '@/service/messages.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BlockedConversation = { id: string; name: string; avatar: string | null };

export default function BlockedUsersScreen() {
    const router = useRouter();
    const { data, isLoading } = useGetBlockedConversationsQuery();
    const [unblockUser] = useUnblockUserMutation();

    const blocked: BlockedConversation[] = data?.data || data || [];

    const handleUnblock = (conv: BlockedConversation) => {
        Alert.alert('Engeli kaldır', `${conv.name} adlı kişinin engelini kaldırmak istiyor musun?`, [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Engeli Kaldır',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await unblockUser({ targetUserId: conv.id }).unwrap();
                    } catch {
                        Alert.alert('Bir sorun oluştu', 'Engel kaldırılamadı, tekrar dene.');
                    }
                },
            },
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Engellenen Kişiler</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#FF5B04" />
                </View>
            ) : (
                <FlatList
                    data={blocked}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100, flexGrow: 1 }}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center mt-20">
                            <Feather name="user-x" size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-3 text-[14px]">Engellediğin kimse yok.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View className="flex-row items-center bg-white rounded-2xl p-3 border border-gray-100 mb-2.5">
                            <Avatar name={item.name} uri={item.avatar} size={44} ring="#D1D5DB" />
                            <Text className="flex-1 text-[15px] font-semibold text-gray-800 ml-3">
                                {item.name}
                            </Text>
                            <Tappable haptic="medium"
                                onPress={() => handleUnblock(item)}
                                className="px-4 py-2 rounded-xl bg-orange-50"
                                activeOpacity={0.7}
                            >
                                <Text className="text-[13px] font-bold text-orange-500">Engeli Kaldır</Text>
                            </Tappable>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}
