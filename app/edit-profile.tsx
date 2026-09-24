import { BASE_URL } from '@/service/api';
import ProfileService, { useUpdateProfileMutation, useUploadProfilePictureMutation } from '@/service/profile.service';
import { store } from '@/store/app';
import { setUserSession } from '@/store/feature/user/actions';
import { useUserSession } from '@/store/feature/user/hooks';
import { useAvatarSource } from '@/hooks/useAvatarSource';
import { confirmImportantChange } from '@/utils/confirm';
import { setUserSessionToStorage } from '@/utils/storage';
import { validateName, validatePhone } from '@/utils/validation';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
    const userSession = useUserSession();
    const router = useRouter();

    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [uploadProfilePic, { isLoading: isUploading }] = useUploadProfilePictureMutation();

    const [firstName, setFirstName] = useState(userSession?.first_name ?? '');
    const [lastName, setLastName] = useState(userSession?.last_name ?? '');
    const [phone, setPhone] = useState(userSession?.phone ?? '');
    const [email, setEmail] = useState(userSession?.email ?? '');

    const [pickedUri, setPickedUri] = useState<string | null>(null);
    const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [pickedFailed, setPickedFailed] = useState(false);
    const [errs, setErrs] = useState<Record<string, string | null>>({});
    const [formErr, setFormErr] = useState<string | null>(null);

    const clearErr = (key: string) => {
        if (errs[key]) setErrs((p) => ({ ...p, [key]: null }));
        if (formErr) setFormErr(null);
    };

    const formatAvatarUrl = (urlStr?: string) => {
        if (!urlStr) return null;
        if (urlStr.startsWith('http') || urlStr.startsWith('data:')) return urlStr;
        if (urlStr.startsWith('/')) return `${BASE_URL}${urlStr}`;
        return `data:image/jpeg;base64,${urlStr}`;
    };

    const getInitials = () => {
        const a = firstName.trim().charAt(0);
        const b = lastName.trim().charAt(0);
        return `${a}${b}`.toUpperCase() || 'K';
    };

    const sessionAvatar = useAvatarSource(formatAvatarUrl(userSession?.photo_url), userSession?.local_photo_uri);
    const avatarUri = pickedUri && !pickedFailed ? pickedUri : sessionAvatar.uri;
    const onAvatarError = pickedUri && !pickedFailed ? () => setPickedFailed(true) : sessionAvatar.onError;

    useEffect(() => {
        if (userSession) {
            setFirstName(userSession.first_name || '');
            setLastName(userSession.last_name || '');
            setPhone(userSession.phone || '');
            setEmail(userSession.email || '');
        }
    }, [userSession]);

    const handlePickFromGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
                return;
            }

            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!res.canceled && res.assets[0]) {
                const asset = res.assets[0];
                setPickedImage(asset);
                setPickedFailed(false);
                setPickedUri(asset.uri);
            }
        } catch {
            // Galeri seçimi iptal edildi
        }
    };

    const handlePickFromCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermeniz gerekiyor.');
                return;
            }

            const res = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!res.canceled && res.assets[0]) {
                const asset = res.assets[0];
                setPickedImage(asset);
                setPickedFailed(false);
                setPickedUri(asset.uri);
            }
        } catch {
            // Kamera çekimi iptal edildi
        }
    };

    const handleChoosePhoto = () => {
        Alert.alert('Fotoğraf Seç', undefined, [
            { text: 'Kameradan Çek', onPress: handlePickFromCamera },
            { text: 'Galeriden Seç', onPress: handlePickFromGallery },
            { text: 'İptal', style: 'cancel' },
        ]);
    };

    const handleSave = async () => {
        const next: Record<string, string | null> = {
            firstName: validateName(firstName, 'Ad'),
            lastName: validateName(lastName, 'Soyad'),
            phone: validatePhone(phone),
        };
        setErrs(next);
        setFormErr(null);
        if (Object.values(next).some(Boolean)) return;

        confirmImportantChange('Profil bilgileriniz güncellenecek. Devam etmek istiyor musunuz?', async () => {
            let latestPhotoUrl = userSession?.photo_url;
            let latestLocalPhotoUri = userSession?.local_photo_uri;

            if (pickedImage) {
                if (pickedImage.base64) {
                    latestLocalPhotoUri = `data:image/jpeg;base64,${pickedImage.base64}`;
                    await setUserSessionToStorage({ ...userSession!, local_photo_uri: latestLocalPhotoUri });
                    setUserSession({ ...userSession!, local_photo_uri: latestLocalPhotoUri });
                }

                try {
                    const formData = new FormData();
                    formData.append('file', {
                        uri: avatarUri,
                        type: pickedImage.mimeType || 'image/jpeg',
                        name: pickedImage.fileName || `avatar_${Date.now()}.jpg`
                    } as any);

                    const uploadRes = await uploadProfilePic(formData).unwrap();
                    const d = uploadRes?.data || uploadRes;
                    let uploadedUrl = d?.photo_url || d?.photoUrl || d?.avatar_url || d?.avatarUrl || d?.url;

                    if (!uploadedUrl) {
                        const fresh = await store
                            .dispatch(ProfileService.endpoints.getProfile.initiate(undefined, { forceRefetch: true }))
                            .unwrap()
                            .catch(() => null);
                        const fp = fresh?.data || fresh;
                        uploadedUrl = fp?.photo_url || fp?.photoUrl || fp?.avatar_url || fp?.avatarUrl;
                    }

                    latestPhotoUrl = uploadedUrl ? formatAvatarUrl(uploadedUrl) ?? uploadedUrl : latestPhotoUrl;
                } catch {}
            }

            try {
                let formattedPhone = phone.trim().replace(/\s+/g, '').replace(/-/g, '');
                if (formattedPhone && !formattedPhone.startsWith('+')) {
                    if (formattedPhone.startsWith('0')) {
                        formattedPhone = formattedPhone.substring(1);
                    }
                    if (formattedPhone.startsWith('90')) {
                        formattedPhone = '+' + formattedPhone;
                    } else {
                        formattedPhone = '+90' + formattedPhone;
                    }
                }

                const body = {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    phone: formattedPhone.replace(/^\+/, ''),
                };

                await updateProfile(body).unwrap();

                const updated = {
                    ...userSession!,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    phone: formattedPhone,
                    email: email.trim(),
                    photo_url: latestPhotoUrl,
                    local_photo_uri: latestLocalPhotoUri,
                };

                await setUserSessionToStorage(updated);
                setUserSession(updated);

                Alert.alert('Başarılı', 'Profiliniz başarıyla güncellendi.', [
                    { text: 'Tamam', onPress: () => router.back() },
                ]);
            } catch (err: any) {
                setFormErr(err?.data?.message || err?.message || 'Bir hata oluştu.');
            }
        });
    };

    const isLoading = isUpdating || isUploading;

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            {/* Native Header */}
            <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-100 flex-row items-center">
                <Tappable
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 mr-3"
                >
                    <Feather name="arrow-left" size={20} color="#374151" />
                </Tappable>
                <Text className="text-gray-900 text-xl font-bold tracking-tight">Profili Düzenle</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

                    {/* Avatar Upload UI */}
                    <View className="items-center mb-8 mt-2">
                        <Tappable
                            onPress={handleChoosePhoto}
                            activeOpacity={0.8}
                            className="relative shadow-xl shadow-gray-200/50"
                        >
                            <View className="w-28 h-28 rounded-full bg-white items-center justify-center border-4 border-white overflow-hidden">
                                {avatarUri ? (
                                    <Image
                                        source={{ uri: avatarUri }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                        onError={onAvatarError}
                                    />
                                ) : (
                                    <View className="w-full h-full bg-primary items-center justify-center">
                                        <Text className="text-white text-3xl font-bold tracking-tight">{getInitials()}</Text>
                                    </View>
                                )}
                            </View>
                            <View className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full items-center justify-center border-2 border-white">
                                <Feather name="camera" size={14} color="white" />
                            </View>
                        </Tappable>
                        <Text className="text-xs font-semibold text-gray-400 mt-3 pt-1 uppercase tracking-widest">Fotoğrafı Değiştir</Text>
                    </View>

                    {/* Form Card */}
                    <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 shadow-gray-200/40">

                        {/* Ad */}
                        <View className="mb-4">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Adınız</Text>
                            <View className={`flex-row items-center bg-gray-50 rounded-2xl border px-4 h-14 ${errs.firstName ? 'border-red-500' : 'border-gray-100'}`}>
                                <Feather name="user" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={firstName}
                                    onChangeText={(t) => { setFirstName(t); clearErr('firstName'); }}
                                    placeholder="Adınız"
                                    placeholderTextColor="#9CA3AF"
                                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                                />
                            </View>
                            {!!errs.firstName && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{errs.firstName}</Text>}
                        </View>

                        {/* Soyad */}
                        <View className="mb-4">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Soyadınız</Text>
                            <View className={`flex-row items-center bg-gray-50 rounded-2xl border px-4 h-14 ${errs.lastName ? 'border-red-500' : 'border-gray-100'}`}>
                                <Feather name="user" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={lastName}
                                    onChangeText={(t) => { setLastName(t); clearErr('lastName'); }}
                                    placeholder="Soyadınız"
                                    placeholderTextColor="#9CA3AF"
                                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                                />
                            </View>
                            {!!errs.lastName && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{errs.lastName}</Text>}
                        </View>

                        {/* Telefon */}
                        <View className="mb-4">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">Telefon Numarası</Text>
                            <View className={`flex-row items-center bg-gray-50 rounded-2xl border px-4 h-14 ${errs.phone ? 'border-red-500' : 'border-gray-100'}`}>
                                <Feather name="phone" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={phone}
                                    onChangeText={(t) => { setPhone(t); clearErr('phone'); }}
                                    placeholder="5XX XXX XX XX"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    className="flex-1 font-semibold text-[15px] text-gray-900 ml-3"
                                />
                            </View>
                            {!!errs.phone && <Text className="text-red-500 text-xs font-medium mt-1.5 ml-1">{errs.phone}</Text>}
                        </View>

                        {/* E-posta */}
                        <View className="mb-2">
                            <Text className="text-[13px] font-bold text-gray-400 mb-2 ml-1">E-posta Adresi</Text>
                            <View className="flex-row items-center bg-gray-100 rounded-2xl border border-gray-100 px-4 h-14">
                                <Feather name="mail" size={18} color="#9CA3AF" />
                                <TextInput
                                    value={email}
                                    editable={false}
                                    placeholderTextColor="#9CA3AF"
                                    className="flex-1 font-semibold text-[15px] text-gray-400 ml-3"
                                />
                            </View>
                            <Text className="text-gray-400 text-xs mt-1.5 ml-1">
                                E-postanı Ayarlar {'>'} E-posta Adresi'nden değiştirebilirsin.
                            </Text>
                        </View>
                    </View>

                    {!!formErr && <Text className="text-red-500 text-sm font-medium mt-3 text-center">{formErr}</Text>}

                    {/* Save Button */}
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
                            {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </Text>
                    </Tappable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
