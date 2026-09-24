import { useGetAddressesQuery } from '@/service/createLoad.service';
import { LocationData } from '@/store/feature/createLoad/slice';
import { Feather } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import AppBottomSheet from '@/components/AppBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SavedRoutePickerModal({
    visible,
    onClose,
    onSelect,
}: {
    visible: boolean;
    onClose: () => void;
    onSelect: (route: { from: LocationData; to: LocationData }) => void;
}) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { data, isLoading } = useGetAddressesQuery(undefined, { skip: !visible });
    const routes: any[] = data?.data?.addresses || data?.data || data || [];

    return (
        <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['70%']}>
            <View className="flex-1 px-6" style={{ paddingBottom: insets.bottom + 16 }}>
                <View className="flex-row justify-between items-center mb-5">
                    <Text className="text-xl font-bold text-gray-900">Kayıtlı Rotalarım</Text>
                    <Tappable onPress={onClose} className="p-2 bg-gray-50 rounded-full">
                        <Feather name="x" size={20} color="#374151" />
                    </Tappable>
                </View>

                {isLoading ? (
                    <View className="py-10 items-center">
                        <ActivityIndicator color="#FF5B04" />
                    </View>
                ) : routes.length === 0 ? (
                    <View className="py-6 items-center">
                        <Text className="text-gray-400 text-sm text-center mb-4">
                            Henüz kayıtlı bir rotanız yok.
                        </Text>
                        <Tappable
                            className="bg-primary px-6 py-3 rounded-2xl"
                            onPress={() => {
                                onClose();
                                router.push('/saved-addresses');
                            }}
                            activeOpacity={0.85}
                        >
                            <Text className="text-white font-bold text-sm">Rotalarımı Yönet</Text>
                        </Tappable>
                    </View>
                ) : (
                    <BottomSheetScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {routes.map((item) => (
                            <Tappable
                                key={item.id}
                                onPress={() => onSelect({ from: item.from, to: item.to })}
                                className="flex-row items-center p-4 mb-3 rounded-2xl border border-gray-100 bg-white"
                                activeOpacity={0.8}
                            >
                                <View className="flex-1 pr-3">
                                    <Text className="text-primary font-bold text-[13px] mb-1.5">{item.title || 'Rota'}</Text>
                                    <Text className="text-gray-700 text-[12px]" numberOfLines={1}>
                                        {item.from?.address}
                                    </Text>
                                    <Text className="text-gray-400 text-[12px]" numberOfLines={1}>
                                        {item.to?.address}
                                    </Text>
                                </View>
                                <View className="w-6 h-6 rounded-full border-[1.5px] border-primary items-center justify-center">
                                    <Feather name="arrow-right" size={12} color="#FF5B04" />
                                </View>
                            </Tappable>
                        ))}
                    </BottomSheetScrollView>
                )}
            </View>
        </AppBottomSheet>
    );
}
