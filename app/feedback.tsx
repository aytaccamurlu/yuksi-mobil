import { useSendFeedbackMutation } from '@/service/feedback.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeedbackScreen() {
    const router = useRouter();
    const [sendFeedback, { isLoading }] = useSendFeedbackMutation();

    const [rating, setRating] = useState(0);
    const [message, setMessage] = useState('');
    const [err, setErr] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (message.trim().length < 5) {
            setErr('Lütfen en az birkaç kelimeyle geribildiriminizi yazın.');
            return;
        }
        setErr(null);

        try {
            await sendFeedback({ message: message.trim(), rating: rating || undefined }).unwrap();
            Alert.alert('Teşekkürler', 'Geribildiriminiz bize ulaştı.', [
                { text: 'Tamam', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            setErr(e?.data?.message || e?.message || 'Geribildirim gönderilemedi.');
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
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Geribildirim</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 shadow-gray-200/40">
                        <Text className="text-[13px] font-bold text-gray-400 mb-3 ml-1">
                            Yüksi'yi nasıl değerlendirirsin?
                        </Text>
                        <View className="flex-row justify-center mb-5">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Tappable key={star} onPress={() => setRating(star)} hitSlop={6} className="px-1.5">
                                    <Feather
                                        name="star"
                                        size={30}
                                        color={star <= rating ? '#FF5B04' : '#E5E7EB'}
                                    />
                                </Tappable>
                            ))}
                        </View>

                        <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Geribildiriminiz</Text>
                        <View className={`bg-gray-50 rounded-2xl border px-4 py-3 ${err ? 'border-red-500' : 'border-gray-100'}`}>
                            <TextInput
                                value={message}
                                onChangeText={(t) => { setMessage(t); if (err) setErr(null); }}
                                placeholder="Beğendiklerinizi, önerilerinizi veya karşılaştığınız bir sorunu bizimle paylaşın"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                className="font-semibold text-[15px] text-gray-900 min-h-[120px]"
                            />
                        </View>
                        {!!err && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{err}</Text>}
                    </View>

                    <Tappable haptic="medium"
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        disabled={isLoading}
                        className={`mt-8 h-16 rounded-2xl flex-row items-center justify-center ${isLoading ? 'bg-orange-400' : 'bg-orange-500 shadow-xl shadow-orange-500/30'}`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" className="mr-3" />
                        ) : (
                            <Feather name="send" size={19} color="white" className="mr-2" />
                        )}
                        <Text className="text-white text-lg font-bold ml-1">
                            {isLoading ? 'Gönderiliyor...' : 'Gönder'}
                        </Text>
                    </Tappable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
