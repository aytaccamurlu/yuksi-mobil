import {
    useAddListingImagesMutation,
    useGetListingByIdQuery,
    useRemoveListingImageMutation,
    useReorderListingImagesMutation,
} from '@/service/ticarim.service';
import { useUploadMediaMutation } from '@/service/createLoad.service';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

type ListingImage = { id: string; media_image_id: string; image_url: string; sort_order: number; is_cover: boolean };

export default function ManagePhotosScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const listingId = String(id);

    const { data, isLoading } = useGetListingByIdQuery(listingId);
    const [uploadMedia, { isLoading: isUploading }] = useUploadMediaMutation();
    const [addListingImages, { isLoading: isAdding }] = useAddListingImagesMutation();
    const [removeListingImage] = useRemoveListingImageMutation();
    const [reorderListingImages] = useReorderListingImagesMutation();

    const [images, setImages] = useState<ListingImage[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        const listing = data?.data || data;
        const raw: ListingImage[] = listing?.listingImages || [];
        setImages([...raw].sort((a, b) => a.sort_order - b.sort_order));
    }, [data]);

    const busy = isUploading || isAdding;

    const persistOrder = async (next: ListingImage[]) => {
        const cover = next.find((i) => i.is_cover) || next[0];
        try {
            await reorderListingImages({
                id: listingId,
                orderedListingImageIds: next.map((i) => i.id),
                coverListingImageId: cover.id,
            }).unwrap();
        } catch {
            Alert.alert('Hata', 'Fotoğraf sırası güncellenemedi.');
        }
    };

    const move = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= images.length) return;
        const next = [...images];
        [next[index], next[target]] = [next[target], next[index]];
        setImages(next);
        persistOrder(next);
    };

    const makeCover = (imageId: string) => {
        const next = images.map((i) => ({ ...i, is_cover: i.id === imageId }));
        setImages(next);
        persistOrder(next);
    };

    const removePhoto = (image: ListingImage) => {
        if (images.length <= 1) {
            Alert.alert('En Az Bir Fotoğraf Gerekli', 'İlanda en az bir fotoğraf kalmalı.');
            return;
        }
        Alert.alert('Fotoğrafı Sil', 'Bu fotoğrafı kaldırmak istediğine emin misin?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    setBusyId(image.id);
                    try {
                        await removeListingImage({ id: listingId, imageId: image.id }).unwrap();
                        setImages((prev) => prev.filter((i) => i.id !== image.id));
                    } catch {
                        Alert.alert('Hata', 'Fotoğraf silinemedi.');
                    } finally {
                        setBusyId(null);
                    }
                },
            },
        ]);
    };

    const addPhotos = async () => {
        try {
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                allowsMultipleSelection: true,
                selectionLimit: 10,
            });
            if (res.canceled || !res.assets.length) return;

            const formData = new FormData();
            res.assets.forEach((a, i) => {
                formData.append('files', {
                    uri: a.uri,
                    type: 'image/jpeg',
                    name: `ticarim_${Date.now()}_${i}.jpg`,
                } as any);
            });
            const uploadRes = await uploadMedia(formData).unwrap();
            const uploaded = uploadRes?.images || uploadRes?.data?.images || [];
            if (!uploaded.length) {
                Alert.alert('Hata', 'Fotoğraflar yüklenemedi.');
                return;
            }

            const startOrder = images.length;
            const newImages = uploaded.map((img: any, i: number) => ({
                media_image_id: img.id,
                sort_order: startOrder + i,
                is_cover: images.length === 0 && i === 0,
            }));
            await addListingImages({ id: listingId, images: newImages }).unwrap();

            setImages((prev) => [
                ...prev,
                ...uploaded.map((img: any, i: number) => ({
                    id: img.id,
                    media_image_id: img.id,
                    image_url: img.url,
                    sort_order: startOrder + i,
                    is_cover: prev.length === 0 && i === 0,
                })),
            ]);
        } catch {
            Alert.alert('Hata', 'Fotoğraf eklenemedi, lütfen tekrar dene.');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
            <View className="bg-primary px-5 pt-4 pb-5 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-9 h-9 bg-white/20 rounded-xl items-center justify-center mr-3"
                >
                    <Feather name="chevron-left" size={22} color="#fff" />
                </Tappable>
                <Text className="text-white text-lg font-bold flex-1 text-center mr-9">Fotoğrafları Yönet</Text>
            </View>

            <View className="flex-1 bg-white px-5 pt-5">
                {isLoading ? (
                    <ActivityIndicator color="#FF5B04" style={{ marginTop: 24 }} />
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text className="text-gray-400 text-[12px] mb-4">
                            Kapak yapmak için fotoğrafa dokun, ok tuşlarıyla sırasını değiştir.
                        </Text>
                        {images.map((img, index) => (
                            <View
                                key={img.id}
                                className="flex-row items-center bg-gray-50 rounded-2xl p-2.5 mb-3 border border-gray-100"
                            >
                                <Tappable onPress={() => makeCover(img.id)} activeOpacity={0.85}>
                                    <View className="relative">
                                        <Image
                                            source={{ uri: img.image_url }}
                                            style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: '#E5E7EB' }}
                                            resizeMode="cover"
                                        />
                                        {img.is_cover && (
                                            <View className="absolute bottom-1 left-1 bg-primary rounded-full px-2 py-0.5">
                                                <Text className="text-white text-[10px] font-bold">Kapak</Text>
                                            </View>
                                        )}
                                    </View>
                                </Tappable>

                                <View className="flex-1 flex-row items-center justify-center gap-2">
                                    <Tappable
                                        onPress={() => move(index, -1)}
                                        disabled={index === 0}
                                        className={`w-9 h-9 rounded-xl items-center justify-center ${index === 0 ? 'bg-gray-100' : 'bg-white border border-gray-200'}`}
                                    >
                                        <Feather name="arrow-left" size={16} color={index === 0 ? '#D1D5DB' : '#374151'} />
                                    </Tappable>
                                    <Tappable
                                        onPress={() => move(index, 1)}
                                        disabled={index === images.length - 1}
                                        className={`w-9 h-9 rounded-xl items-center justify-center ${index === images.length - 1 ? 'bg-gray-100' : 'bg-white border border-gray-200'}`}
                                    >
                                        <Feather name="arrow-right" size={16} color={index === images.length - 1 ? '#D1D5DB' : '#374151'} />
                                    </Tappable>
                                </View>

                                <Tappable
                                    onPress={() => removePhoto(img)}
                                    disabled={busyId === img.id}
                                    className="w-9 h-9 rounded-xl border-2 border-primary items-center justify-center"
                                >
                                    {busyId === img.id ? (
                                        <ActivityIndicator size="small" color="#FF5B04" />
                                    ) : (
                                        <Feather name="trash-2" size={15} color="#FF5B04" />
                                    )}
                                </Tappable>
                            </View>
                        ))}

                        <Tappable
                            onPress={addPhotos}
                            disabled={busy}
                            activeOpacity={0.85}
                            className="border-2 border-dashed border-primary rounded-2xl py-5 items-center justify-center mb-8"
                        >
                            {busy ? (
                                <ActivityIndicator color="#FF5B04" />
                            ) : (
                                <View className="items-center">
                                    <Feather name="camera" size={22} color="#FF5B04" />
                                    <Text className="text-primary font-bold text-[13px] mt-1.5">Fotoğraf Ekle</Text>
                                </View>
                            )}
                        </Tappable>
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}
