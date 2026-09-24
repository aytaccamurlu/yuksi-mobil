import { useAddPaymentMethodMutation } from '@/service/payment.service';
import { validateName } from '@/utils/validation';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from 'expo-screen-capture';

const formatCardNumber = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export default function AddCardScreen() {
    usePreventScreenCapture();
    const router = useRouter();
    const [addCard, { isLoading }] = useAddPaymentMethodMutation();

    const [cardNumber, setCardNumber] = useState('');
    const [holder, setHolder] = useState('');
    const [expiry, setExpiry] = useState('');
    const [errs, setErrs] = useState<Record<string, string | null>>({});
    const [formErr, setFormErr] = useState<string | null>(null);

    const clearErr = (key: string) => {
        if (errs[key]) setErrs((p) => ({ ...p, [key]: null }));
        if (formErr) setFormErr(null);
    };

    const handleSave = async () => {
        const digits = cardNumber.replace(/\D/g, '');
        const [expMonth, expYear] = expiry.split('/');

        const next: Record<string, string | null> = {
            cardNumber: digits.length === 16 ? null : 'Kart numarası 16 haneli olmalı',
            holder: validateName(holder, 'Kart üzerindeki isim'),
            expiry:
                !expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2 ||
                Number(expMonth) < 1 || Number(expMonth) > 12
                    ? 'Geçerli bir tarih girin (AA/YY)'
                    : null,
        };
        setErrs(next);
        setFormErr(null);
        if (Object.values(next).some(Boolean)) return;

        try {
            await addCard({
                cardNumber: digits,
                holder: holder.trim(),
                expiryMonth: expMonth,
                expiryYear: expYear,
            }).unwrap();

            Alert.alert('Başarılı', 'Kartınız kaydedildi.', [
                { text: 'Tamam', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            setFormErr(e?.data?.message || e?.message || 'Kart kaydedilemedi.');
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Kart Ekle</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 shadow-gray-200/40">
                        <View className="mb-4">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Kart Numarası</Text>
                            <View className={`flex-row items-center bg-gray-50 rounded-2xl border px-4 h-14 ${errs.cardNumber ? 'border-red-500' : 'border-gray-100'}`}>
                                <Feather name="credit-card" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={cardNumber}
                                    onChangeText={(t) => { setCardNumber(formatCardNumber(t)); clearErr('cardNumber'); }}
                                    placeholder="0000 0000 0000 0000"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="number-pad"
                                    maxLength={19}
                                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                                />
                            </View>
                            {!!errs.cardNumber && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{errs.cardNumber}</Text>}
                        </View>

                        <View className="mb-4">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Kart Üzerindeki İsim</Text>
                            <View className={`flex-row items-center bg-gray-50 rounded-2xl border px-4 h-14 ${errs.holder ? 'border-red-500' : 'border-gray-100'}`}>
                                <Feather name="user" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={holder}
                                    onChangeText={(t) => { setHolder(t); clearErr('holder'); }}
                                    placeholder="Ad Soyad"
                                    placeholderTextColor="#9CA3AF"
                                    autoCapitalize="words"
                                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                                />
                            </View>
                            {!!errs.holder && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{errs.holder}</Text>}
                        </View>

                        <View>
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Son Kullanma (AA/YY)</Text>
                            <View className={`flex-row items-center bg-gray-50 rounded-2xl border px-4 h-14 ${errs.expiry ? 'border-red-500' : 'border-gray-100'}`}>
                                <Feather name="calendar" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={expiry}
                                    onChangeText={(t) => { setExpiry(formatExpiry(t)); clearErr('expiry'); }}
                                    placeholder="AA/YY"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                                />
                            </View>
                            {!!errs.expiry && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{errs.expiry}</Text>}
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
                            {isLoading ? 'Kaydediliyor...' : 'Kartı Kaydet'}
                        </Text>
                    </Tappable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
