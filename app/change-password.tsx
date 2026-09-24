import PasswordChecklist from '@/components/PasswordChecklist';
import { useChangePasswordMutation } from '@/service/auth.service';
import { useUserSession } from '@/store/feature/user/hooks';
import { translateAuthError } from '@/utils/authErrors';
import { confirmImportantChange } from '@/utils/confirm';
import { validatePassword, validateRequiredPassword } from '@/utils/validation';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

function PasswordField({
    label,
    value,
    onChangeText,
    placeholder,
    error,
}: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    error?: string | null;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <View className="mb-4">
            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">{label}</Text>
            <View className={`flex-row items-center bg-gray-50 rounded-2xl border px-4 h-14 ${error ? 'border-red-500' : 'border-gray-100'}`}>
                <Feather name="lock" size={18} color="#9CA3AF" />
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!visible}
                    autoCapitalize="none"
                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                />
                <Tappable onPress={() => setVisible((v) => !v)} hitSlop={8}>
                    <Feather name={visible ? 'eye-off' : 'eye'} size={18} color="#9CA3AF" />
                </Tappable>
            </View>
            {!!error && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{error}</Text>}
        </View>
    );
}

export default function ChangePasswordScreen() {
    const router = useRouter();
    const [changePassword, { isLoading }] = useChangePasswordMutation();
    const session = useUserSession();
    const pwContext = {
        email: session?.email,
        firstName: session?.first_name,
        lastName: session?.last_name,
    };

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errs, setErrs] = useState<Record<string, string | null>>({});
    const [formErr, setFormErr] = useState<string | null>(null);

    const clearErr = (key: string) => {
        if (errs[key]) setErrs((p) => ({ ...p, [key]: null }));
        if (formErr) setFormErr(null);
    };

    const handleSave = async () => {
        const next: Record<string, string | null> = {
            currentPassword: validateRequiredPassword(currentPassword),
            newPassword: validatePassword(newPassword, { ...pwContext, current: currentPassword }),
            confirmPassword:
                confirmPassword !== newPassword ? 'Şifreler eşleşmiyor' : null,
        };
        setErrs(next);
        setFormErr(null);
        if (Object.values(next).some(Boolean)) return;

        confirmImportantChange('Şifreniz güncellenecek. Devam etmek istiyor musunuz?', async () => {
            try {
                await changePassword({ currentPassword, newPassword }).unwrap();
                Alert.alert('Başarılı', 'Şifreniz başarıyla güncellendi.', [
                    { text: 'Tamam', onPress: () => router.back() },
                ]);
            } catch (err: any) {
                setFormErr(err?.data?.message || translateAuthError(err?.data?.error) || err?.message || 'Şifre güncellenemedi.');
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Şifre Değiştir</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 shadow-gray-200/40">
                        <PasswordField
                            label="Mevcut Şifre"
                            value={currentPassword}
                            onChangeText={(t) => { setCurrentPassword(t); clearErr('currentPassword'); }}
                            placeholder="Mevcut şifreniz"
                            error={errs.currentPassword}
                        />
                        <PasswordField
                            label="Yeni Şifre"
                            value={newPassword}
                            onChangeText={(t) => { setNewPassword(t); clearErr('newPassword'); }}
                            placeholder="Güçlü bir şifre belirle"
                            error={errs.newPassword}
                        />
                        <PasswordChecklist
                            value={newPassword}
                            context={{ ...pwContext, current: currentPassword }}
                            style={{ marginBottom: 16 }}
                        />
                        <View className="mb-0">
                            <PasswordField
                                label="Yeni Şifre (Tekrar)"
                                value={confirmPassword}
                                onChangeText={(t) => { setConfirmPassword(t); clearErr('confirmPassword'); }}
                                placeholder="Yeni şifrenizi tekrar girin"
                                error={errs.confirmPassword}
                            />
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
                            {isLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                        </Text>
                    </Tappable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
