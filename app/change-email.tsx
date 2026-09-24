import { useUpdateProfileMutation } from '@/service/profile.service';
import { setUserSession } from '@/store/feature/user/actions';
import { useUserSession } from '@/store/feature/user/hooks';
import { confirmImportantChange } from '@/utils/confirm';
import { setUserSessionToStorage } from '@/utils/storage';
import { validateEmail } from '@/utils/validation';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangeEmailScreen() {
    const router = useRouter();
    const userSession = useUserSession();
    const [updateProfile, { isLoading }] = useUpdateProfileMutation();

    const [email, setEmail] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [formErr, setFormErr] = useState<string | null>(null);

    const currentEmail = userSession?.email || null;

    const handleSave = async () => {
        const validation = validateEmail(email);
        setErr(validation);
        setFormErr(null);
        if (validation) return;

        if (email.trim().toLowerCase() === (currentEmail || '').toLowerCase()) {
            setErr('Bu zaten kayıtlı e-posta adresiniz');
            return;
        }

        confirmImportantChange('E-posta adresiniz güncellenecek. Devam etmek istiyor musunuz?', async () => {
            try {
                await updateProfile({ email: email.trim() }).unwrap();

                const updated = { ...userSession!, email: email.trim() };
                await setUserSessionToStorage(updated);
                setUserSession(updated);

                Alert.alert('Başarılı', 'E-posta adresiniz güncellendi.', [
                    { text: 'Tamam', onPress: () => router.back() },
                ]);
            } catch (e: any) {
                setFormErr(e?.data?.message || e?.message || 'E-posta güncellenemedi.');
            }
        });
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">E-posta Adresi</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    <View className="mb-5">
                        <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Kayıtlı E-posta</Text>
                        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-14">
                            <Feather name="mail" size={18} color="#9CA3AF" />
                            <Text className="flex-1 font-semibold text-[15px] text-gray-500 ml-3">
                                {currentEmail || '—'}
                            </Text>
                        </View>
                    </View>

                    <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 shadow-gray-200/40">
                        <View className="mb-0">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">
                                Yeni E-posta Adresi
                            </Text>
                            <View className={`flex-row items-center bg-gray-50 rounded-2xl border px-4 h-14 ${err ? 'border-red-500' : 'border-gray-100'}`}>
                                <Feather name="mail" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={email}
                                    onChangeText={(t) => { setEmail(t); if (err) setErr(null); if (formErr) setFormErr(null); }}
                                    placeholder="ornek@eposta.com"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                                />
                            </View>
                            {!!err && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{err}</Text>}
                        </View>
                    </View>

                    {!!formErr && <Text className="text-red-500 text-sm font-medium mt-3 text-center">{formErr}</Text>}

                    <Tappable haptic="medium"
                        onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={isLoading}
                        className={`mt-8 h-16 rounded-2xl flex-row items-center justify-center ${isLoading ? 'bg-orange-400' : 'bg-orange-500 shadow-xl shadow-orange-500/30'}`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" className="mr-3" />
                        ) : (
                            <Feather name="check" size={20} color="white" className="mr-2" />
                        )}
                        <Text className="text-white text-lg font-bold ml-1">
                            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </Text>
                    </Tappable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
