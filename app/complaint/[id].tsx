import Avatar from '@/components/Avatar';
import ComplaintStatusBadge from '@/components/ComplaintStatus';
import { FOREGROUND_POLL_INTERVAL_MS } from '@/constants/polling';
import { useGetComplaintQuery, useSendComplaintMessageMutation } from '@/service/complaints.service';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Keyboard, LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

export default function ComplaintDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useGetComplaintQuery(String(id), { pollingInterval: FOREGROUND_POLL_INTERVAL_MS });
  const [sendComplaintMessage, { isLoading: sending }] = useSendComplaintMessageMutation();

  const [preview, setPreview] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [kbHeight, setKbHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  const complaint = data?.data || data;
  const updates: any[] = complaint?.updates || [];

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKbHeight(e.endCoordinates?.height ?? 0);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKbHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (updates.length) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [updates.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    try {
      await sendComplaintMessage({ id: String(id), text }).unwrap();
    } catch {
      setInput(text);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Tappable onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-left" size={26} color="#FF5B04" />
        </Tappable>
        <Text style={s.headerTitle}>Şikayet Detayı</Text>
      </View>

      {isLoading && !complaint?.id ? (
        <View style={s.center}>
          <ActivityIndicator color="#FF5B04" />
        </View>
      ) : !complaint?.id ? (
        <View style={s.center}>
          <Text style={s.muted}>Şikayet bulunamadı.</Text>
        </View>
      ) : (
        <View style={[s.flex, { paddingBottom: kbHeight > 0 ? kbHeight + insets.bottom : 0 }]}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
          >
            <View style={s.statusRow}>
              <ComplaintStatusBadge status={complaint.status} large />
              <Text style={s.createdAt}>{fmtDate(complaint.createdAt)}</Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardLabel}>Şikayet edilen</Text>
              <View style={s.targetRow}>
                <Avatar
                  name={complaint.targetName}
                  uri={complaint.targetAvatar}
                  size={38}
                  ring="#FF5B04"
                />
                <Text style={s.targetName}>{complaint.targetName}</Text>
              </View>
              <View style={s.reasonChip}>
                <Feather name="flag" size={13} color="#B45309" />
                <Text style={s.reasonChipText}>{complaint.reason}</Text>
              </View>
              {!!complaint.description && <Text style={s.description}>{complaint.description}</Text>}
              {complaint.images?.length > 0 && (
                <View style={s.imageRow}>
                  {complaint.images.map((uri: string) => (
                    <Pressable key={uri} onPress={() => setPreview(uri)}>
                      <Image source={{ uri }} style={s.thumb} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Text style={s.chatHeading}>Müşteri hizmetleri</Text>

            {updates.map((u: any) => {
              if (u.from === 'system') {
                return (
                  <View key={u.id} style={s.systemWrap}>
                    <Text style={s.systemText}>{u.text}</Text>
                    <Text style={s.systemTime}>{fmtTime(u.createdAt)}</Text>
                  </View>
                );
              }
              const mine = u.from === 'user';
              return (
                <View
                  key={u.id}
                  style={[s.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}
                >
                  <View style={[s.bubble, mine ? s.bubbleMe : s.bubbleThem]}>
                    {!mine && <Text style={s.bubbleFrom}>Müşteri Hizmetleri</Text>}
                    <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{u.text}</Text>
                    <Text style={[s.bubbleTime, mine && s.bubbleTimeMine]}>{fmtTime(u.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={[s.inputBar, { paddingBottom: (kbHeight > 0 ? 0 : insets.bottom) + 8 }]}>
            <TextInput
              style={s.textInput}
              placeholder="Müşteri hizmetlerine yaz…"
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
            />
            <Tappable
              style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
              onPress={send}
              disabled={!input.trim() || sending}
              hitSlop={6}
            >
              <Feather name="send" size={18} color="#FFFFFF" />
            </Tappable>
          </View>
        </View>
      )}

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={s.previewBackdrop} onPress={() => setPreview(null)}>
          {preview && <Image source={{ uri: preview }} style={s.previewImage} resizeMode="contain" />}
          <View style={s.previewClose}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 13, color: '#9CA3AF' },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  createdAt: { fontSize: 12, color: '#9CA3AF' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  targetName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  reasonChipText: { fontSize: 12, fontWeight: '700', color: '#B45309' },
  description: { fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 12 },

  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  thumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: '#E5E7EB' },

  chatHeading: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 24, marginBottom: 14 },

  systemWrap: { alignItems: 'center', marginBottom: 14 },
  systemText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    backgroundColor: '#EDEFF5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: '86%',
    lineHeight: 17,
  },
  systemTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  bubbleRow: { width: '100%', flexDirection: 'row', marginBottom: 10 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleThem: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#ECEDF3' },
  bubbleMe: { backgroundColor: '#FF5B04', borderBottomRightRadius: 5 },
  bubbleFrom: { fontSize: 11, fontWeight: '800', color: '#FF5B04', marginBottom: 3 },
  bubbleText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.8)' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  textInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FF5B04',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E5E7EB' },

  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: W, height: W },
  previewClose: { position: 'absolute', top: 52, right: 24 },
});
