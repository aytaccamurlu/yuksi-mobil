import LocationPickerInput from '@/components/LocationPicker';
import { useSaveAddressMutation } from '@/service/createLoad.service';
import { LocationData } from '@/store/feature/createLoad/slice';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddRouteScreen() {
    const router = useRouter();
    const [saveAddress, { isLoading: isSaving }] = useSaveAddressMutation();

    const [routeTitle, setRouteTitle] = useState('');
    const [fromLoc, setFromLoc] = useState<LocationData | null>(null);
    const [toLoc, setToLoc] = useState<LocationData | null>(null);

    const handleSaveRoute = async () => {
        if (!routeTitle.trim()) {
            Alert.alert('Uyarı', 'Lütfen bir başlık girin.');
            return;
        }
        if (!fromLoc?.address) {
            Alert.alert('Uyarı', 'Lütfen "Nereden" konumunu seçin.');
            return;
        }
        if (!toLoc?.address) {
            Alert.alert('Uyarı', 'Lütfen "Nereye" konumunu seçin.');
            return;
        }

        try {
            await saveAddress({ title: routeTitle.trim(), from: fromLoc, to: toLoc }).unwrap();
            Alert.alert('✅ Başarılı', 'Rota başarıyla kaydedildi!', [
                { text: 'Tamam', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert('Hata', e?.data?.message || 'Rota kaydedilemedi.');
        }
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Rota Ekle</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text className="text-gray-400 text-sm mb-6">
                        Sık kullandığınız nereden-nereye rotasını kaydedin, gönderi oluştururken tek dokunuşla kullanın.
                    </Text>

                    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                        Başlık
                    </Text>
                    <TextInput
                        className="h-14 bg-white rounded-2xl border border-gray-100 px-4 text-gray-900 text-base font-medium mb-5"
                        placeholder="Örn: Köfteci Yusuf, Ev - İş..."
                        placeholderTextColor="#9CA3AF"
                        value={routeTitle}
                        onChangeText={setRouteTitle}
                    />

                    <View className="mb-5">
                        <LocationPickerInput
                            label="Nereden"
                            placeholder="Çıkış konumunu seçin"
                            value={fromLoc?.address || ''}
                            locationType="from"
                            onLocationSelect={(loc: any) => setFromLoc(loc)}
                        />
                    </View>

                    <View className="mb-8">
                        <LocationPickerInput
                            label="Nereye"
                            placeholder="Varış konumunu seçin"
                            value={toLoc?.address || ''}
                            locationType="to"
                            onLocationSelect={(loc: any) => setToLoc(loc)}
                        />
                    </View>

                    <Tappable haptic="medium"
                        onPress={handleSaveRoute}
                        disabled={isSaving}
                        className={`py-4 rounded-2xl items-center flex-row justify-center ${isSaving ? 'bg-gray-300' : 'bg-primary'}`}
                        activeOpacity={0.85}
                        style={
                            !isSaving
                                ? { shadowColor: '#FF5B04', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
                                : {}
                        }
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Feather name="check" size={18} color="#fff" />
                                <Text className="text-white font-bold text-base ml-2">Rotayı Kaydet</Text>
                            </>
                        )}
                    </Tappable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
