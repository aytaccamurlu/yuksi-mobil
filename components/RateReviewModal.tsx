import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import AppBottomSheet from '@/components/AppBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#FF5B04';

export default function RateReviewModal({
    visible,
    courierName,
    onClose,
    onSubmit,
}: {
    visible: boolean;
    courierName?: string;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
}) {
    const insets = useSafeAreaInsets();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (visible) {
            setRating(0);
            setComment('');
        }
    }, [visible]);

    const handleClose = () => {
        Keyboard.dismiss();
        onClose();
    };

    const handleSubmit = () => {
        if (rating === 0) return;
        Keyboard.dismiss();
        onSubmit(rating, comment.trim());
        onClose();
        Alert.alert('Teşekkürler', 'Değerlendirmeniz için teşekkür ederiz.');
    };

    return (
        <AppBottomSheet visible={visible} onClose={handleClose}>
            <View style={[s.body, { paddingBottom: insets.bottom + 24 }]}>
                <View style={s.header}>
                    <Text style={s.title} numberOfLines={1}>
                        {courierName ? `${courierName}'ı Değerlendir` : 'Değerlendirme Yap'}
                    </Text>
                    <Tappable onPress={handleClose} style={s.closeBtn} activeOpacity={0.7}>
                        <Feather name="x" size={16} color="#6B7280" />
                    </Tappable>
                </View>

                <View style={s.starsRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <Tappable key={n} onPress={() => setRating(n)} hitSlop={6} activeOpacity={0.7}>
                            <Feather
                                name="star"
                                size={34}
                                color={n <= rating ? '#F59E0B' : '#E5E7EB'}
                                style={n <= rating ? s.starFilled : undefined}
                            />
                        </Tappable>
                    ))}
                </View>

                <TextInput
                    style={s.input}
                    placeholder="Deneyiminizi paylaşın..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={300}
                    value={comment}
                    onChangeText={setComment}
                    textAlignVertical="top"
                />

                <Tappable
                    style={[s.submitBtn, rating === 0 && s.submitBtnDisabled]}
                    onPress={handleSubmit}
                    activeOpacity={0.85}
                    disabled={rating === 0}
                >
                    <Text style={s.submitBtnText}>Gönder</Text>
                </Tappable>
            </View>
        </AppBottomSheet>
    );
}

const s = StyleSheet.create({
    body: { paddingHorizontal: 0 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    title: { fontSize: 17, fontWeight: '800', color: '#111827', flex: 1, marginRight: 12 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
    },

    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
    },
    starFilled: {
        textShadowColor: 'rgba(245,158,11,0.35)',
        textShadowRadius: 6,
    },

    input: {
        marginHorizontal: 24,
        minHeight: 96,
        maxHeight: 140,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        padding: 14,
        fontSize: 13.5,
        color: '#111827',
    },

    submitBtn: {
        marginHorizontal: 24,
        marginTop: 18,
        height: 52,
        borderRadius: 16,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnDisabled: { backgroundColor: '#FBC7A8', shadowOpacity: 0 },
    submitBtnText: { fontSize: 14.5, fontWeight: '800', color: '#FFFFFF' },
});
