import Avatar from '@/components/Avatar';
import { useCreateComplaintMutation } from '@/service/complaints.service';
import { useGetConversationsQuery } from '@/service/messages.service';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_IMAGES = 4;

const COMPLAINT_REASONS = [
  'Spam veya istenmeyen mesaj',
  'Taciz, hakaret veya tehdit',
  'Uygunsuz veya rahatsız edici içerik',
  'Sahte hesap veya kimlik',
  'Dolandırıcılık girişimi',
  'Diğer',
];

export default function NewComplaintScreen() {
  const router = useRouter();
  const { conversationId, name } = useLocalSearchParams<{ conversationId?: string; name?: string }>();
  const targetName = name || 'Kullanıcı';

  const { data: convData } = useGetConversationsQuery();
  const conversation = (convData?.data || convData || []).find(
    (c: any) => c.id === conversationId,
  );
  const targetAvatar: string | null = conversation?.avatar ?? null;

  const [createComplaint, { isLoading }] = useCreateComplaintMutation();

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [kbHeight, setKbHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const descY = useRef(0);
  const descFocused = useRef(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      setKbHeight(e.endCoordinates?.height ?? 0);
      if (descFocused.current) {
        requestAnimationFrame(() =>
          scrollRef.current?.scrollTo({ y: Math.max(descY.current - 12, 0), animated: true }),
        );
      }
    });
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf eklemek için galeri erişimine izin ver.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (!res.canceled) {
      setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (uri: string) => setImages((prev) => prev.filter((u) => u !== uri));

  const canSubmit = reason.length > 0 && !isLoading;

  const submit = async () => {
    if (!canSubmit) return;
    if (reason === 'Diğer' && description.trim().length < 5) {
      Alert.alert('Açıklama Gerekli', '"Diğer" seçtiğinde durumu kısaca açıklaman gerekiyor.');
      return;
    }
    try {
      const res = await createComplaint({
        conversationId: conversationId ?? null,
        targetName,
        targetAvatar,
        reason,
        description: description.trim(),
        images,
      }).unwrap();
      const id = res?.data?.id;
      if (id) router.replace(`/complaint/${id}`);
      else router.replace('/complaints');
    } catch {
      Alert.alert('Hata', 'Şikayet gönderilemedi, lütfen tekrar dene.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Tappable onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-left" size={26} color="#FF5B04" />
        </Tappable>
        <Text style={s.headerTitle}>Şikayet Oluştur</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 + kbHeight }}
      >
        <Text style={s.label}>Şikayet edilen kişi</Text>
        <View style={s.targetCard}>
          <Avatar name={targetName} uri={targetAvatar} size={40} ring="#FF5B04" />
          <Text style={s.targetName}>{targetName}</Text>
        </View>

        <Text style={s.label}>Şikayet nedeni</Text>
        <View style={s.card}>
          {COMPLAINT_REASONS.map((r, i) => {
            const active = r === reason;
            return (
              <Tappable
                key={r}
                style={[s.reasonRow, i !== COMPLAINT_REASONS.length - 1 && s.reasonBorder]}
                activeOpacity={0.7}
                onPress={() => setReason(r)}
              >
                <View style={[s.radio, active && s.radioActive]}>
                  {active && <View style={s.radioDot} />}
                </View>
                <Text style={[s.reasonText, active && s.reasonTextActive]}>{r}</Text>
              </Tappable>
            );
          })}
        </View>

        <View onLayout={(e) => (descY.current = e.nativeEvent.layout.y)}>
          <Text style={s.label}>Açıklama</Text>
          <View style={s.card}>
            <TextInput
              style={s.textArea}
              placeholder="Yaşadığın durumu detaylı anlat…"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              onFocus={() => {
                descFocused.current = true;
                scrollRef.current?.scrollTo({ y: Math.max(descY.current - 12, 0), animated: true });
              }}
              onBlur={() => (descFocused.current = false)}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>
        </View>

        <Text style={s.label}>Kanıt ekle (opsiyonel)</Text>
        <View style={s.imageRow}>
          {images.map((uri) => (
            <View key={uri} style={s.thumbWrap}>
              <Image source={{ uri }} style={s.thumb} />
              <Tappable haptic="light" style={s.thumbRemove} onPress={() => removeImage(uri)} hitSlop={6}>
                <Feather name="x" size={12} color="#FFFFFF" />
              </Tappable>
            </View>
          ))}
          {images.length < MAX_IMAGES && (
            <Tappable style={s.addImage} onPress={pickImages} activeOpacity={0.7}>
              <Feather name="camera" size={20} color="#FF5B04" />
              <Text style={s.addImageText}>Ekle</Text>
            </Tappable>
          )}
        </View>

        <Text style={s.hint}>
          Şikayetin müşteri hizmetleri ekibine iletilir. Durumu Profil › Şikayetlerim'den takip
          edebilirsin.
        </Text>

        <Tappable haptic="medium"
          style={[s.submit, !canSubmit && s.submitDisabled]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.submitText}>Şikayeti Gönder</Text>
          )}
        </Tappable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 18,
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  targetName: { fontSize: 15, fontWeight: '700', color: '#111827' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F2F6',
    overflow: 'hidden',
  },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  reasonBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#FF5B04' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5B04' },
  reasonText: { fontSize: 14, color: '#374151', flex: 1 },
  reasonTextActive: { color: '#111827', fontWeight: '600' },

  textArea: { minHeight: 110, fontSize: 14, color: '#111827', padding: 14 },

  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { width: 72, height: 72 },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#E5E7EB' },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF5B04',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addImageText: { fontSize: 11, fontWeight: '700', color: '#FF5B04' },

  hint: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, marginTop: 18 },

  submit: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FF5B04',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitDisabled: { backgroundColor: '#E5E7EB' },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
