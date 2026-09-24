import TicarimStepIndicator from '@/components/TicarimStepIndicator';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { useGuardedPress } from '@/hooks/useGuardedPress';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TicarimListingSuccessScreen() {
    const router = useRouter();

    const stayInTicarim = useGuardedPress(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/ticarim');
    });

    return (
        <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
            <View className="bg-primary px-5 pt-4 pb-5 flex-row items-center">
                <Tappable
                    onPress={stayInTicarim}
                    className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center mr-3"
                >
                    <Feather name="chevron-left" size={22} color="#fff" />
                </Tappable>
                <Text className="text-white text-lg font-bold flex-1 text-center mr-9">Tebrikler</Text>
            </View>

            <View className="flex-1 bg-white rounded-t-3xl">
                <TicarimStepIndicator step={4} />

                <View className="flex-1 items-center justify-center px-10">
                    <Image
                        source={require('@/assets/images/ticarim-success.png')}
                        style={{ width: 260, height: 200 }}
                        resizeMode="contain"
                    />
                    <Text className="text-gray-900 text-xl font-bold text-center mt-8">İlanın Tamamlandı</Text>
                    <Text className="text-gray-400 text-[14px] text-center mt-2 leading-6">
                        Yüksi'yi tercih ettiğiniz için teşekkür ederiz. İlanınız şu anda ekibimiz
                        tarafından inceleniyor ve en kısa sürede onaylanıp yayına alınacak.
                    </Text>
                </View>

                <View className="px-5 pb-6 flex-row items-center">
                    <Tappable
                        onPress={stayInTicarim}
                        activeOpacity={0.7}
                        className="flex-1 border-2 border-primary rounded-full py-3.5 items-center mr-3"
                    >
                        <Text className="text-primary font-bold text-[15px]">Ticarimde Kal</Text>
                    </Tappable>
                    <Tappable
                        onPress={() => router.replace('/(tabs)')}
                        activeOpacity={0.85}
                        className="flex-1 bg-primary rounded-full py-3.5 items-center"
                        style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    >
                        <Text className="text-white font-bold text-[15px]">Yüksiye Dön</Text>
                    </Tappable>
                </View>
            </View>
        </SafeAreaView>
    );
}
