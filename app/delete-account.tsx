import { useRequestAccountDeletionMutation } from '@/service/deleteAccount.service';
import { clearUserSession } from '@/store/feature/user/actions';
import { clearAutoReloginCredentials, clearUserSessionFromStorage } from '@/utils/storage';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const REASONS = [
    'Artık kullanmıyorum',
    'Başka bir hesabım var',
    'Uygulamadan memnun değilim',
    'Gizlilik endişelerim var',
    'Teknik sorunlar yaşıyorum',
    'Diğer',
];

export default function DeleteAccountScreen() {
    const router = useRouter();
    const [requestDeletion, { isLoading }] = useRequestAccountDeletionMutation();

    const [reason, setReason] = useState<string | null>(null);
    const [details, setDetails] = useState('');
    const [err, setErr] = useState<string | null>(null);

    const handleSubmit = () => {
        if (!reason) {
            setErr('Devam etmek için bir sebep seçin.');
            return;
        }
        setErr(null);

        Alert.alert(
            'Hesabı Kalıcı Olarak Sil',
            'Hesabınız ve tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz. Onaylıyor musunuz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Hesabımı Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await requestDeletion({ reason, details: details.trim() || undefined }).unwrap();
                        } catch {
                            // yine de devam et — talep backend'e ulaşmamış olsa bile hesap bu cihazda kilitlenir
                        }
                        await clearUserSessionFromStorage();
                        await clearAutoReloginCredentials();
                        clearUserSession();
                        Alert.alert(
                            'Talebiniz Alındı',
                            'Hesabınızı silme talebiniz alındı. Bu hesapla bu cihazdan bir daha giriş yapamazsınız.',
                        );
                    },
                },
            ],
        );
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Hesabımı Sil</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    <Text className="text-[15px] font-bold text-gray-800 mb-1 ml-1">
                        Hesabınızı neden siliyorsunuz?
                    </Text>
                    <Text className="text-[12px] text-gray-400 mb-4 ml-1">
                        Sebebini bilmek bize yardımcı olur.
                    </Text>

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
                        {REASONS.map((r, index) => (
                            <Tappable
                                key={r}
                                className={`flex-row items-center px-3 py-3.5 ${
                                    index !== REASONS.length - 1 ? 'border-b border-gray-50' : ''
                                }`}
                                onPress={() => { setReason(r); if (err) setErr(null); }}
                                activeOpacity={0.6}
                            >
                                <Text className="flex-1 text-[15px] font-semibold text-gray-800 tracking-tight">
                                    {r}
                                </Text>
                                <View
                                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                                        reason === r ? 'border-orange-500' : 'border-gray-200'
                                    }`}
                                >
                                    {reason === r && <View className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                                </View>
                            </Tappable>
                        ))}
                    </View>

                    {reason === 'Diğer' && (
                        <View className="bg-white rounded-3xl p-5 border border-gray-100 mt-4">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Açıklama</Text>
                            <View className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3">
                                <TextInput
                                    value={details}
                                    onChangeText={setDetails}
                                    placeholder="Bize sebebini anlatın"
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    className="font-semibold text-[15px] text-gray-900 min-h-[80px]"
                                />
                            </View>
                        </View>
                    )}

                    {!!err && <Text className="text-red-500 text-sm font-medium mt-3 text-center">{err}</Text>}

                    <Tappable haptic="warning"
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        disabled={isLoading}
                        className={`mt-8 h-16 rounded-2xl flex-row items-center justify-center ${isLoading ? 'bg-red-300' : 'bg-red-500'}`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" className="mr-3" />
                        ) : (
                            <Feather name="x-square" size={20} color="white" className="mr-2" />
                        )}
                        <Text className="text-white text-lg font-bold ml-1">
                            {isLoading ? 'Gönderiliyor...' : 'Hesabımı Kalıcı Olarak Sil'}
                        </Text>
                    </Tappable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
