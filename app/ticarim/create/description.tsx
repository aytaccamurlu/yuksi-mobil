import TicarimBottomSheet from '@/components/TicarimBottomSheet';
import { BottomSheetFlatList, BottomSheetFlatListMethods, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import TicarimStepIndicator from '@/components/TicarimStepIndicator';
import { patchTicarimDraft, resetTicarimDraft } from '@/store/feature/ticarim/actions';
import { useTicarimDraft } from '@/store/feature/ticarim/hooks';
import { TicarimDraft } from '@/store/feature/ticarim/slice';
import { useUserSession } from '@/store/feature/user/hooks';
import { Feather } from '@expo/vector-icons';
import { useCreateListingMutation, usePublishListingMutation, useUpdateListingMutation } from '@/service/ticarim.service';
import { useUploadMediaMutation } from '@/service/createLoad.service';
import { FUEL_TYPE_OPTIONS, attributeDefinitionId, conditionToApi, fuelTypeToApi } from '@/utils/ticarim';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const COMMON_COLORS: { name: string; hex: string }[] = [
    { name: 'Beyaz', hex: '#FFFFFF' },
    { name: 'Siyah', hex: '#111827' },
    { name: 'Gri', hex: '#9CA3AF' },
    { name: 'Gümüş', hex: '#C0C0C0' },
    { name: 'Kırmızı', hex: '#DC2626' },
    { name: 'Mavi', hex: '#2563EB' },
    { name: 'Lacivert', hex: '#1E3A8A' },
    { name: 'Yeşil', hex: '#16A34A' },
    { name: 'Sarı', hex: '#EAB308' },
    { name: 'Turuncu', hex: '#FF5B04' },
    { name: 'Kahverengi', hex: '#78350F' },
    { name: 'Bej', hex: '#D6C9A8' },
    { name: 'Mor', hex: '#7C3AED' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => String(CURRENT_YEAR - i));

const KIMDEN_OPTIONS = ['Sahibinden', 'Galeriden'];
const TAKAS_OPTIONS = ['Olur', 'Olmaz'];
const GEAR_OPTIONS = ['Manuel', 'Otomatik', 'Yarı Otomatik'];
const COOLING_OPTIONS = ['Hava', 'Sıvı'];
const FUEL_OPTIONS = FUEL_TYPE_OPTIONS.map((o) => o.label);

const formatThousands = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('tr-TR');
};

function Field({
    label,
    required,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    textContentType,
    maxLength,
    multiline,
    suffix,
}: {
    label: string;
    required?: boolean;
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'number-pad' | 'decimal-pad' | 'email-address' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoCorrect?: boolean;
    textContentType?: React.ComponentProps<typeof TextInput>['textContentType'];
    maxLength?: number;
    multiline?: boolean;
    suffix?: string;
}) {
    return (
        <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] text-gray-700">
                    {label} {required && <Text className="text-red-500">*</Text>}
                </Text>
                {!!maxLength && <Text className="text-[11px] text-gray-300">{value.length}/{maxLength}</Text>}
            </View>
            <View
                className={`flex-row bg-gray-50 border border-gray-200 rounded-2xl px-4 ${
                    multiline ? 'items-start py-3 h-24' : 'items-center h-14'
                }`}
            >
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder || 'İçeriği Doldurun'}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    textContentType={textContentType}
                    maxLength={maxLength}
                    multiline={multiline}
                    className="flex-1 text-[14px] text-gray-900"
                    textAlignVertical={multiline ? 'top' : 'center'}
                />
                {!!suffix && <Text className="text-gray-400 text-[14px] font-semibold ml-2">{suffix}</Text>}
            </View>
        </View>
    );
}

function PickerField({
    label,
    required,
    value,
    placeholder,
    onPress,
}: {
    label: string;
    required?: boolean;
    value: string;
    placeholder?: string;
    onPress: () => void;
}) {
    return (
        <View className="mb-4">
            <Text className="text-[13px] text-gray-700 mb-2">
                {label} {required && <Text className="text-red-500">*</Text>}
            </Text>
            <Tappable
                onPress={onPress}
                activeOpacity={0.7}
                className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14"
            >
                <Text className={value ? 'text-gray-900 text-[14px]' : 'text-gray-400 text-[14px]'}>
                    {value || placeholder || 'Seç'}
                </Text>
                <Feather name="chevron-down" size={18} color="#9CA3AF" />
            </Tappable>
        </View>
    );
}

function PillSelectField({
    label,
    required,
    options,
    value,
    onChange,
}: {
    label: string;
    required?: boolean;
    options: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <View className="mb-4">
            <Text className="text-[13px] text-gray-700 mb-2">
                {label} {required && <Text className="text-red-500">*</Text>}
            </Text>
            <View className="flex-row flex-wrap">
                {options.map((opt) => {
                    const active = value === opt;
                    return (
                        <Tappable
                            key={opt}
                            onPress={() => onChange(active ? '' : opt)}
                            activeOpacity={0.7}
                            className={`px-5 py-2.5 rounded-full border mr-2 mb-2 ${
                                active ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                            }`}
                        >
                            <Text className={active ? 'text-white font-bold text-[13px]' : 'text-gray-700 text-[13px]'}>
                                {opt}
                            </Text>
                        </Tappable>
                    );
                })}
            </View>
        </View>
    );
}

function ColorPickerModal({
    visible,
    value,
    onClose,
    onSelect,
}: {
    visible: boolean;
    value: string;
    onClose: () => void;
    onSelect: (color: string) => void;
}) {
    const [customColor, setCustomColor] = useState('');

    return (
        <TicarimBottomSheet visible={visible} onClose={onClose} heightClassName="h-[75%]">
            <View className="flex-row items-center justify-between mb-5">
                <Text className="text-gray-900 text-lg font-bold">Renk Seç</Text>
                <Tappable onPress={onClose} className="p-2 bg-gray-50 rounded-full">
                    <Feather name="x" size={18} color="#374151" />
                </Tappable>
            </View>
            <BottomSheetScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap justify-between">
                    {COMMON_COLORS.map((c) => {
                        const active = value === c.name;
                        return (
                            <Tappable
                                key={c.name}
                                onPress={() => onSelect(c.name)}
                                activeOpacity={0.7}
                                style={{ width: '23%' }}
                                className="items-center mb-4"
                            >
                                <View
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: c.hex,
                                        borderWidth: active ? 3 : 1,
                                        borderColor: active ? '#FF5B04' : '#E5E7EB',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {active && (
                                        <Feather
                                            name="check"
                                            size={16}
                                            color={['#FFFFFF', '#EAB308', '#D6C9A8', '#C0C0C0'].includes(c.hex) ? '#111827' : '#FFFFFF'}
                                        />
                                    )}
                                </View>
                                <Text className="text-gray-700 text-[11px] mt-1.5 text-center">{c.name}</Text>
                            </Tappable>
                        );
                    })}
                </View>

                <Text className="text-[12px] text-gray-400 mb-2 mt-1">Listede yok mu? Özel renk yaz</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                    <TextInput
                        value={customColor}
                        onChangeText={setCustomColor}
                        placeholder="Örn. Mat Antrasit"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="words"
                        className="flex-1 text-[14px] text-gray-900"
                        onSubmitEditing={() => customColor.trim() && onSelect(customColor.trim())}
                        returnKeyType="done"
                    />
                    <Tappable
                        onPress={() => customColor.trim() && onSelect(customColor.trim())}
                        className="ml-2"
                    >
                        <Feather name="check-circle" size={22} color="#FF5B04" />
                    </Tappable>
                </View>
            </BottomSheetScrollView>
        </TicarimBottomSheet>
    );
}

const WHEEL_ITEM_H = 46;
const WHEEL_VISIBLE_ROWS = 5;
const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE_ROWS;

function YearWheel({ value, onChange }: { value: string; onChange: (y: string) => void }) {
    const listRef = React.useRef<BottomSheetFlatListMethods>(null);
    const initialIndex = Math.max(YEARS.indexOf(value), 0);
    const [centerIndex, setCenterIndex] = useState(initialIndex);

    const commitIndex = (rawIndex: number) => {
        const clamped = Math.min(Math.max(rawIndex, 0), YEARS.length - 1);
        setCenterIndex(clamped);
        onChange(YEARS[clamped]);
    };

    return (
        <View style={{ height: WHEEL_H }}>
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE_ROWS / 2),
                    left: 16,
                    right: 16,
                    height: WHEEL_ITEM_H,
                    backgroundColor: '#FFF1EA',
                    borderRadius: 14,
                }}
            />
            <BottomSheetFlatList
                ref={listRef}
                data={YEARS}
                keyExtractor={(y: string) => y}
                showsVerticalScrollIndicator={false}
                snapToInterval={WHEEL_ITEM_H}
                decelerationRate="fast"
                getItemLayout={(_d: ArrayLike<string> | null | undefined, i: number) => ({ length: WHEEL_ITEM_H, offset: WHEEL_ITEM_H * i, index: i })}
                initialScrollIndex={initialIndex}
                contentContainerStyle={{ paddingVertical: WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE_ROWS / 2) }}
                onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => commitIndex(Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H))}
                renderItem={({ item, index }: { item: string; index: number }) => {
                    const active = index === centerIndex;
                    return (
                        <Tappable
                            activeOpacity={0.6}
                            style={{ height: WHEEL_ITEM_H, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => {
                                listRef.current?.scrollToIndex({ index, animated: true });
                                commitIndex(index);
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: active ? 20 : 16,
                                    fontWeight: active ? '800' : '500',
                                    color: active ? '#111827' : '#B4BAC4',
                                }}
                            >
                                {item}
                            </Text>
                        </Tappable>
                    );
                }}
            />
        </View>
    );
}

function YearPickerModal({
    visible,
    value,
    onClose,
    onConfirm,
}: {
    visible: boolean;
    value: string;
    onClose: () => void;
    onConfirm: (year: string) => void;
}) {
    const [pendingYear, setPendingYear] = useState(value || String(CURRENT_YEAR));

    useEffect(() => {
        if (visible) setPendingYear(value || String(CURRENT_YEAR));
    }, [visible, value]);

    return (
        <TicarimBottomSheet visible={visible} onClose={onClose} heightClassName="">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-900 text-lg font-bold">Yıl Seç</Text>
                <Tappable onPress={onClose} className="p-2 bg-gray-50 rounded-full">
                    <Feather name="x" size={18} color="#374151" />
                </Tappable>
            </View>

            <YearWheel value={pendingYear} onChange={setPendingYear} />

            <Tappable
                onPress={() => onConfirm(pendingYear)}
                activeOpacity={0.85}
                className="bg-primary rounded-full py-4 items-center mt-4"
                style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
            >
                <Text className="text-white font-bold text-[15px]">Onayla</Text>
            </Tappable>
        </TicarimBottomSheet>
    );
}

export default function TicarimDescriptionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const draft = useTicarimDraft();
    const userSession = useUserSession();
    const [createListing, { isLoading: isCreating }] = useCreateListingMutation();
    const [publishListing] = usePublishListingMutation();
    const [updateListing, { isLoading: isUpdating }] = useUpdateListingMutation();
    const isEditing = !!draft.editingId;
    const [uploadMedia, { isLoading: isUploading }] = useUploadMediaMutation();
    const isLoading = isCreating || isUploading || isUpdating;
    const listingDate = new Date().toLocaleDateString('tr-TR');
    const [colorModalOpen, setColorModalOpen] = useState(false);
    const [yearModalOpen, setYearModalOpen] = useState(false);
    const [useProfileOwner, setUseProfileOwner] = useState(true);

    const profileName = `${userSession?.first_name || ''} ${userSession?.last_name || ''}`.trim();
    const profilePhone = userSession?.phone || '';
    const profileEmail = userSession?.email || '';
    const profilePhoto = userSession?.photo_url || null;
    const profileInitials =
        `${(userSession?.first_name || '').charAt(0)}${(userSession?.last_name || '').charAt(0)}`.toUpperCase() || '?';

    const patch = (field: keyof TicarimDraft) => (value: string) => patchTicarimDraft({ [field]: value });

    const pickExtraPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!res.canceled && res.assets[0]) patchTicarimDraft({ extraPhoto: res.assets[0].uri });
    };

    const switchToDifferentOwner = () => {
        patchTicarimDraft({ ownerName: '', phone: '', email: '', extraPhoto: null });
        setUseProfileOwner(false);
    };

    const refillFromProfile = () => setUseProfileOwner(true);

    const handleSubmit = async () => {
        const missing: string[] = [];
        if (!draft.price.trim()) missing.push('Fiyat');
        if (!draft.fuelType.trim()) missing.push('Yakıt Tipi');
        if (!draft.year.trim()) missing.push('Yıl');

        if (missing.length > 0) {
            const list = missing.length > 1
                ? `${missing.slice(0, -1).join(', ')} ve ${missing[missing.length - 1]}`
                : missing[0];
            Alert.alert('Eksik Bilgi', `Zorunlu alanları (${list}) doldurmalısın.`);
            return;
        }
        if (draft.title.trim().length < 10) {
            Alert.alert('Başlık Çok Kısa', 'İlan başlığı en az 10 karakter olmalı.');
            return;
        }
        if (draft.description.trim().length < 5) {
            Alert.alert('Açıklama Çok Kısa', 'Açıklama en az 5 karakter olmalı.');
            return;
        }
        if (isEditing) {
            try {
                const attributes: { attribute_definition_id: string; value: string }[] = [];
                const engineCcDefId = attributeDefinitionId(draft.categoryId, 'engine_capacity');
                const transmissionDefId = attributeDefinitionId(draft.categoryId, 'transmission');
                if (engineCcDefId && draft.engineCc.trim()) {
                    attributes.push({ attribute_definition_id: engineCcDefId, value: draft.engineCc.trim() });
                }
                if (transmissionDefId && draft.transmissionType.trim()) {
                    attributes.push({ attribute_definition_id: transmissionDefId, value: draft.transmissionType.trim() });
                }
                const extraNotes = [
                    !engineCcDefId && draft.engineCc.trim() ? `Motor Hacmi: ${draft.engineCc.trim()}cc` : '',
                    !transmissionDefId && draft.transmissionType.trim() ? `Zamanlama Tipi: ${draft.transmissionType.trim()}` : '',
                    draft.cylinderCount.trim() ? `Silindir Sayısı: ${draft.cylinderCount.trim()}` : '',
                    draft.gear.trim() ? `Vites: ${draft.gear.trim()}` : '',
                    draft.cooling.trim() ? `Soğutma: ${draft.cooling.trim()}` : '',
                    draft.color.trim() ? `Renk: ${draft.color.trim()}` : '',
                    draft.origin.trim() ? `Menşei: ${draft.origin.trim()}` : '',
                    draft.plateNationality.trim() ? `Plaka/Uyruk: ${draft.plateNationality.trim()}` : '',
                    draft.from.trim() ? `Kimden: ${draft.from.trim()}` : '',
                    draft.tradeAccepted.trim() ? `Takas: ${draft.tradeAccepted.trim()}` : '',
                    draft.securityInfo.trim() ? `Güvenlik: ${draft.securityInfo.trim()}` : '',
                    draft.accessoryInfo.trim() ? `Aksesuar: ${draft.accessoryInfo.trim()}` : '',
                ].filter(Boolean);
                const finalDescription = [draft.description.trim(), ...extraNotes].join(' | ');
                const [district, city] = draft.location.split('/');

                await updateListing({
                    id: draft.editingId as string,
                    body: {
                        category_id: draft.categoryId,
                        brand_id: draft.brandId,
                        model_id: draft.modelId,
                        vehicle_type_id: draft.vehicleTypeId,
                        title: draft.title.trim(),
                        description: finalDescription,
                        year: draft.year ? Number(draft.year) : 0,
                        kilometer: draft.km ? Number(draft.km.replace(/\D/g, '')) : 0,
                        fuel_type: fuelTypeToApi(draft.fuelType),
                        vehicle_condition: conditionToApi(draft.condition),
                        condition_score: draft.conditionScore ? Number(draft.conditionScore.split('/')[1]) || 0 : 0,
                        price: Number(draft.price.replace(/\D/g, '')) || 0,
                        currency: 'TRY',
                        city: city || draft.location,
                        district: district || '',
                        allow_message: true,
                        allow_phone: true,
                        attributes,
                    },
                }).unwrap();

                resetTicarimDraft();
                router.dismiss(2);
                Alert.alert('Güncellendi', 'İlan bilgileri güncellendi.');
            } catch {
                Alert.alert('Hata', 'İlan güncellenemedi, lütfen tekrar dene.');
            }
            return;
        }

        if (!draft.photos.length) {
            Alert.alert('Fotoğraf Gerekli', 'Devam etmek için en az bir fotoğraf ekle.');
            return;
        }

        try {
            const formData = new FormData();
            draft.photos.forEach((uri, i) => {
                formData.append('files', {
                    uri,
                    type: 'image/jpeg',
                    name: `ticarim_${Date.now()}_${i}.jpg`,
                } as any);
            });
            const uploadRes = await uploadMedia(formData).unwrap();
            const uploadedImages = uploadRes?.images || uploadRes?.data?.images || [];
            if (!uploadedImages.length) {
                Alert.alert('Hata', 'Fotoğraflar yüklenemedi, lütfen tekrar deneyin.');
                return;
            }

            const images = uploadedImages.map((img: any, i: number) => ({
                media_image_id: img.id,
                image_url: img.url,
                sort_order: i,
                is_cover: i === 0,
            }));

            const attributes: { attribute_definition_id: string; value: string }[] = [];
            const engineCcDefId = attributeDefinitionId(draft.categoryId, 'engine_capacity');
            const transmissionDefId = attributeDefinitionId(draft.categoryId, 'transmission');
            if (engineCcDefId && draft.engineCc.trim()) {
                attributes.push({ attribute_definition_id: engineCcDefId, value: draft.engineCc.trim() });
            }
            if (transmissionDefId && draft.transmissionType.trim()) {
                attributes.push({ attribute_definition_id: transmissionDefId, value: draft.transmissionType.trim() });
            }

            const extraNotes = [
                !engineCcDefId && draft.engineCc.trim() ? `Motor Hacmi: ${draft.engineCc.trim()}cc` : '',
                !transmissionDefId && draft.transmissionType.trim() ? `Zamanlama Tipi: ${draft.transmissionType.trim()}` : '',
                draft.cylinderCount.trim() ? `Silindir Sayısı: ${draft.cylinderCount.trim()}` : '',
                draft.gear.trim() ? `Vites: ${draft.gear.trim()}` : '',
                draft.cooling.trim() ? `Soğutma: ${draft.cooling.trim()}` : '',
                draft.color.trim() ? `Renk: ${draft.color.trim()}` : '',
                draft.origin.trim() ? `Menşei: ${draft.origin.trim()}` : '',
                draft.plateNationality.trim() ? `Plaka/Uyruk: ${draft.plateNationality.trim()}` : '',
                draft.from.trim() ? `Kimden: ${draft.from.trim()}` : '',
                draft.tradeAccepted.trim() ? `Takas: ${draft.tradeAccepted.trim()}` : '',
                draft.securityInfo.trim() ? `Güvenlik: ${draft.securityInfo.trim()}` : '',
                draft.accessoryInfo.trim() ? `Aksesuar: ${draft.accessoryInfo.trim()}` : '',
            ].filter(Boolean);

            const finalDescription = [draft.description.trim(), ...extraNotes].join(' | ');
            const [district, city] = draft.location.split('/');

            const created = await createListing({
                category_id: draft.categoryId,
                brand_id: draft.brandId,
                model_id: draft.modelId,
                vehicle_type_id: draft.vehicleTypeId,
                title: draft.title.trim(),
                description: finalDescription,
                year: draft.year ? Number(draft.year) : 0,
                kilometer: draft.km ? Number(draft.km.replace(/\D/g, '')) : 0,
                fuel_type: fuelTypeToApi(draft.fuelType),
                vehicle_condition: conditionToApi(draft.condition),
                condition_score: draft.conditionScore ? Number(draft.conditionScore.split('/')[1]) || 0 : 0,
                price: Number(draft.price.replace(/\D/g, '')) || 0,
                currency: 'TRY',
                city: city || draft.location,
                district: district || '',
                allow_message: true,
                allow_phone: true,
                images,
                attributes,
                brand_name: draft.brand,
                model_name: draft.model,
                vehicle_type_name: draft.vehicleType,
                ownerName: useProfileOwner ? profileName : draft.ownerName.trim(),
                ownerPhoto: useProfileOwner ? profilePhoto : draft.extraPhoto,
                phone: (useProfileOwner ? profilePhone : draft.phone).trim(),
                email: (useProfileOwner ? profileEmail : draft.email).trim(),
            }).unwrap();

            const listingId = created?.listing_id || created?.data?.listing_id || created?.listing?.id;
            if (listingId) {
                await publishListing(listingId).unwrap().catch(() => {});
            }

            resetTicarimDraft();
            router.dismiss(3);
            router.push('/ticarim/create/success');
        } catch {
            Alert.alert('Hata', 'İlan oluşturulamadı, lütfen tekrar deneyin.');
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
                <Text className="text-white text-lg font-bold flex-1 text-center mr-9">
                    {isEditing ? 'İlanı Düzenle' : 'İlan Açıklama/Detay'}
                </Text>
            </View>

            <View className="flex-1 bg-white">
            <TicarimStepIndicator step={3} />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    className="flex-1 px-5"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 24 }}
                >
                    <Text className="text-gray-900 text-[16px] font-bold mb-1">İlan Detaylarını Doldur</Text>
                    <Text className="text-red-500 text-[12px] mb-4">Zorunlu alanlar * ile işaretlidir</Text>

                    <Field
                        label="İlan Başlığı"
                        value={draft.title}
                        onChangeText={patch('title')}
                        maxLength={70}
                        autoCapitalize="sentences"
                        required
                    />
                    <Field
                        label="Açıklama"
                        value={draft.description}
                        onChangeText={patch('description')}
                        maxLength={500}
                        autoCapitalize="sentences"
                        multiline
                        required
                    />
                    <Field
                        label="Fiyat (TL)"
                        value={draft.price}
                        onChangeText={(v) => patchTicarimDraft({ price: formatThousands(v) })}
                        keyboardType="number-pad"
                        required
                    />

                    <View className="mb-4">
                        <Text className="text-[13px] text-gray-700 mb-2">İlan Tarihi</Text>
                        <View className="bg-gray-100 rounded-2xl px-4 h-14 justify-center">
                            <Text className="text-gray-500 text-[14px]">{listingDate}</Text>
                        </View>
                    </View>

                    <PillSelectField
                        label="Yakıt Tipi"
                        options={FUEL_OPTIONS}
                        value={draft.fuelType}
                        onChange={patch('fuelType')}
                        required
                    />
                    <PickerField
                        label="Yıl"
                        value={draft.year}
                        placeholder="Seç"
                        onPress={() => setYearModalOpen(true)}
                        required
                    />
                    <Field
                        label="Kilometre"
                        value={draft.km}
                        onChangeText={(v) => patchTicarimDraft({ km: formatThousands(v) })}
                        placeholder="Örn. 45.000"
                        keyboardType="number-pad"
                    />
                    <Field
                        label="Motor Hacmi"
                        value={draft.engineCc}
                        onChangeText={(v) => patchTicarimDraft({ engineCc: v.replace(/[^0-9]/g, '') })}
                        placeholder="Örn. 125"
                        keyboardType="number-pad"
                        suffix="cc"
                        required
                    />
                    <Field
                        label="Zamanlama Tipi"
                        value={draft.transmissionType}
                        onChangeText={patch('transmissionType')}
                        placeholder="Örn. 4 Zamanlı"
                        autoCapitalize="words"
                    />
                    <Field
                        label="Silindir Sayısı"
                        value={draft.cylinderCount}
                        onChangeText={patch('cylinderCount')}
                        keyboardType="number-pad"
                    />
                    <PillSelectField
                        label="Vites"
                        options={GEAR_OPTIONS}
                        value={draft.gear}
                        onChange={patch('gear')}
                    />
                    <PillSelectField
                        label="Soğutma"
                        options={COOLING_OPTIONS}
                        value={draft.cooling}
                        onChange={patch('cooling')}
                    />
                    <View className="mb-4">
                        <Text className="text-[13px] text-gray-700 mb-2">Renk</Text>
                        <Tappable
                            onPress={() => setColorModalOpen(true)}
                            activeOpacity={0.7}
                            className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14"
                        >
                            <View className="flex-row items-center">
                                {!!COMMON_COLORS.find((c) => c.name === draft.color) && (
                                    <View
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: 9,
                                            backgroundColor: COMMON_COLORS.find((c) => c.name === draft.color)?.hex,
                                            borderWidth: 1,
                                            borderColor: '#E5E7EB',
                                            marginRight: 8,
                                        }}
                                    />
                                )}
                                <Text className={draft.color ? 'text-gray-900 text-[14px]' : 'text-gray-400 text-[14px]'}>
                                    {draft.color || 'Seç'}
                                </Text>
                            </View>
                            <Feather name="chevron-down" size={18} color="#9CA3AF" />
                        </Tappable>
                    </View>
                    <Field
                        label="Menşei"
                        value={draft.origin}
                        onChangeText={patch('origin')}
                        placeholder="Örn. Türkiye"
                        autoCapitalize="words"
                    />
                    <Field
                        label="Plaka/Uyruk"
                        value={draft.plateNationality}
                        onChangeText={patch('plateNationality')}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                    <PillSelectField
                        label="Kimden"
                        options={KIMDEN_OPTIONS}
                        value={draft.from}
                        onChange={patch('from')}
                    />
                    <PillSelectField
                        label="Takas"
                        options={TAKAS_OPTIONS}
                        value={draft.tradeAccepted}
                        onChange={patch('tradeAccepted')}
                    />
                    <Field
                        label="Güvenlik Bilgilerini Girin"
                        value={draft.securityInfo}
                        onChangeText={patch('securityInfo')}
                        autoCapitalize="sentences"
                        multiline
                    />
                    <Field
                        label="Aksesuar Bilgilerini Girin"
                        value={draft.accessoryInfo}
                        onChangeText={patch('accessoryInfo')}
                        autoCapitalize="sentences"
                        multiline
                    />

                    <View className="flex-row items-center justify-between mb-3 mt-2">
                        <Text className="text-gray-900 text-[15px] font-bold">Araç Sahibi</Text>
                        <Tappable
                            onPress={useProfileOwner ? switchToDifferentOwner : refillFromProfile}
                            activeOpacity={0.7}
                            className="flex-row items-center"
                        >
                            <Feather name={useProfileOwner ? 'user-x' : 'refresh-ccw'} size={13} color="#FF5B04" />
                            <Text className="text-primary text-[12px] font-bold ml-1.5">
                                {useProfileOwner ? 'Farklı Araç Sahibi' : 'Profilden Doldur'}
                            </Text>
                        </Tappable>
                    </View>

                    {useProfileOwner ? (
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-4">
                            {profilePhoto ? (
                                <Image
                                    source={{ uri: profilePhoto }}
                                    style={{ width: 52, height: 52, borderRadius: 26 }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View
                                    style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FF5B04' }}
                                    className="items-center justify-center"
                                >
                                    <Text className="text-white font-bold text-[16px]">{profileInitials}</Text>
                                </View>
                            )}
                            <View className="flex-1 ml-3">
                                <Text className="text-gray-900 font-bold text-[14px]">{profileName || 'İsim yok'}</Text>
                                {!!profileEmail && (
                                    <Text className="text-gray-400 text-[12px] mt-0.5">{profileEmail}</Text>
                                )}
                                {!!profilePhone && (
                                    <Text className="text-gray-400 text-[12px] mt-0.5">{profilePhone}</Text>
                                )}
                            </View>
                        </View>
                    ) : (
                        <>
                            <View className="flex-row items-center mb-4">
                                <Tappable
                                    onPress={pickExtraPhoto}
                                    activeOpacity={0.7}
                                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 items-center justify-center overflow-hidden bg-gray-50 mr-3"
                                >
                                    {draft.extraPhoto ? (
                                        <Image source={{ uri: draft.extraPhoto }} style={{ width: 80, height: 80 }} resizeMode="cover" />
                                    ) : (
                                        <Feather name="camera" size={18} color="#9CA3AF" />
                                    )}
                                </Tappable>
                                <Text className="flex-1 text-gray-400 text-[12px]">İsteğe bağlı görsel ekleyebilirsiniz.</Text>
                            </View>

                            <Field
                                label="İsim Soyisim"
                                value={draft.ownerName}
                                onChangeText={patch('ownerName')}
                                placeholder="Örn. Ahmet Yılmaz"
                                autoCapitalize="words"
                            />
                            <Field
                                label="Telefon Numarası"
                                value={draft.phone}
                                onChangeText={patch('phone')}
                                keyboardType="phone-pad"
                                textContentType="telephoneNumber"
                            />
                            <Field
                                label="E-mail Adresi"
                                value={draft.email}
                                onChangeText={patch('email')}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                textContentType="emailAddress"
                            />
                        </>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>

            <View
                className="px-5 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
            >
                <Tappable haptic="medium"
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.85}
                    className={`rounded-full py-4 items-center ${isLoading ? 'bg-orange-300' : 'bg-primary'}`}
                    style={{ shadowColor: '#FF5B04', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white font-bold text-[15px]">
                            {isEditing ? 'Kaydet' : 'İlanı Yayınla'}
                        </Text>
                    )}
                </Tappable>
            </View>
            </View>

            <ColorPickerModal
                visible={colorModalOpen}
                value={draft.color}
                onClose={() => setColorModalOpen(false)}
                onSelect={(color) => {
                    patchTicarimDraft({ color });
                    setColorModalOpen(false);
                }}
            />

            <YearPickerModal
                visible={yearModalOpen}
                value={draft.year}
                onClose={() => setYearModalOpen(false)}
                onConfirm={(year) => {
                    patchTicarimDraft({ year });
                    setYearModalOpen(false);
                }}
            />
        </SafeAreaView>
    );
}
