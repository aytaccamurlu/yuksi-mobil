import { TICARIM_CATEGORIES, TicarimCategory } from '@/service/mockData';
import { patchTicarimDraft } from '@/store/feature/ticarim/actions';
import { useTicarimDraft } from '@/store/feature/ticarim/hooks';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCORE_OPTIONS = Array.from({ length: 10 }, (_, i) => String(i + 1));

export default function TicarimConditionScreen() {
    const router = useRouter();
    const draft = useTicarimDraft();
    const [condition, setCondition] = useState(draft.condition || 'Sıfır');
    const [score, setScore] = useState(draft.conditionScore ? draft.conditionScore.split('/')[1] || '' : '');

    const categoryName = TICARIM_CATEGORIES.find((c) => c.key === (draft.category as TicarimCategory))?.name;

    const handleConfirm = () => {
        patchTicarimDraft({
            condition,
            conditionScore: condition === 'İkinci El' && score ? `10/${score}` : '',
        });
        router.back();
    };

    return (
        <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
            <View className="px-5 pt-4 pb-5 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center mr-3"
                >
                    <Feather name="chevron-left" size={22} color="#fff" />
                </Tappable>
                <Text className="text-white text-lg font-bold flex-1 text-center mr-9">Durum</Text>
            </View>

            <View className="flex-1 bg-white rounded-t-3xl pt-2.5 px-5">
                <View className="items-center mb-4">
                    <View className="w-10 h-1 bg-gray-200 rounded-full" />
                </View>

                {!!categoryName && <Text className="text-gray-900 text-[15px] mb-1">{categoryName}</Text>}
                <Text className="text-gray-900 text-lg font-bold mb-4">Durum</Text>

                <Tappable
                    onPress={() => setCondition('Sıfır')}
                    className="flex-row items-center justify-between py-3.5 border-b border-gray-100"
                >
                    <Text className={condition === 'Sıfır' ? 'text-primary font-bold text-[15px]' : 'text-gray-700 text-[15px]'}>
                        Sıfır
                    </Text>
                    {condition === 'Sıfır' && <Feather name="check" size={18} color="#FF5B04" />}
                </Tappable>

                <Tappable
                    onPress={() => setCondition('İkinci El')}
                    className="flex-row items-center justify-between py-3.5 border-b border-gray-100"
                >
                    <Text className={condition === 'İkinci El' ? 'text-primary font-bold text-[15px]' : 'text-gray-700 text-[15px]'}>
                        İkinci El
                    </Text>
                    {condition === 'İkinci El' && <Feather name="check" size={18} color="#FF5B04" />}
                </Tappable>

                <Tappable
                    onPress={() => setCondition('Hasarlı')}
                    className="flex-row items-center justify-between py-3.5 border-b border-gray-100"
                >
                    <Text className={condition === 'Hasarlı' ? 'text-primary font-bold text-[15px]' : 'text-gray-700 text-[15px]'}>
                        Hasarlı
                    </Text>
                    {condition === 'Hasarlı' && <Feather name="check" size={18} color="#FF5B04" />}
                </Tappable>

                {condition === 'İkinci El' && (
                    <View className="py-3.5 border-b border-gray-100">
                        <Text className="text-gray-700 text-[15px] mb-3">Durum Puanı (10 üzerinden)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {SCORE_OPTIONS.map((n) => {
                                const active = score === n;
                                return (
                                    <Tappable
                                        key={n}
                                        onPress={() => setScore(n)}
                                        activeOpacity={0.7}
                                        className={`w-11 h-11 rounded-full items-center justify-center mr-2 ${
                                            active ? 'bg-primary' : 'bg-gray-50 border border-gray-200'
                                        }`}
                                    >
                                        <Text className={active ? 'text-white font-bold text-[14px]' : 'text-gray-700 text-[14px]'}>
                                            {n}
                                        </Text>
                                    </Tappable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                <Tappable
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                    className="bg-primary rounded-full py-4 items-center mt-6"
                    style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                >
                    <Text className="text-white font-bold text-[15px]">Onayla</Text>
                </Tappable>
            </View>
        </SafeAreaView>
    );
}
