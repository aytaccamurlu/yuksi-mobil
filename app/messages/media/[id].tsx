import type { Conversation } from '@/components/ConversationRow';
import RemoteImage from '@/components/RemoteImage';
import {
  useGetConversationMediaQuery,
  useGetConversationsQuery,
} from '@/service/messages.service';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const GAP = 4;
const COL = Math.floor((W - 32 - GAP * 2) / 3);

type Tab = 'media' | 'links';

export default function ConversationMediaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const convId = String(id);

  const { data: convData } = useGetConversationsQuery();
  const { data, isLoading } = useGetConversationMediaQuery(convId);

  const conversation: Conversation | undefined = (convData?.data || convData || []).find(
    (c: Conversation) => c.id === convId,
  );
  const media: string[] = data?.data?.media || data?.media || [];
  const links: { title: string; url: string; date: string }[] =
    data?.data?.links || data?.links || [];

  const [tab, setTab] = useState<Tab>('media');
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Tappable onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-left" size={26} color="#FF5B04" />
        </Tappable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Medya, Bağlantılar</Text>
          {!!conversation?.name && <Text style={s.subtitle}>{conversation.name}</Text>}
        </View>
      </View>

      <View style={s.tabs}>
        {(['media', 'links'] as Tab[]).map((t) => (
          <Tappable
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'media' ? `Medya${media.length ? ` (${media.length})` : ''}` : `Bağlantılar${links.length ? ` (${links.length})` : ''}`}
            </Text>
          </Tappable>
        ))}
      </View>

      {isLoading ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Yükleniyor…</Text>
        </View>
      ) : tab === 'media' ? (
        media.length === 0 ? (
          <View style={s.empty}>
            <Feather name="image" size={28} color="#D1D5DB" />
            <Text style={s.emptyText}>Bu sohbette medya yok.</Text>
          </View>
        ) : (
          <FlatList
            key="media-grid"
            data={media}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            numColumns={3}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={{ padding: 16, gap: GAP }}
            renderItem={({ item }) => (
              <Pressable onPress={() => setPreview(item)}>
                <RemoteImage uri={item} style={s.thumb} iconSize={20} />
              </Pressable>
            )}
          />
        )
      ) : links.length === 0 ? (
        <View style={s.empty}>
          <Feather name="link" size={28} color="#D1D5DB" />
          <Text style={s.emptyText}>Bu sohbette bağlantı yok.</Text>
        </View>
      ) : (
        <FlatList
          key="links-list"
          data={links}
          keyExtractor={(l, i) => `${l.url}-${i}`}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Tappable
              style={s.linkRow}
              activeOpacity={0.7}
              onPress={() =>
                Linking.openURL(item.url).catch(() =>
                  Alert.alert('Bağlantı açılamadı', item.url),
                )
              }
            >
              <View style={s.linkIcon}>
                <Feather name="link-2" size={16} color="#FF5B04" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={s.linkUrl} numberOfLines={1}>
                  {item.url}
                </Text>
              </View>
              <Text style={s.linkDate}>{item.date}</Text>
            </Tappable>
          )}
        />
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
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#FF5B04' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  thumb: { width: COL, height: COL, borderRadius: 8, backgroundColor: '#F3F4F6' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7F7F8',
    borderRadius: 14,
    padding: 12,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  linkUrl: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  linkDate: { fontSize: 11, color: '#9CA3AF' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: W, height: W },
  previewClose: { position: 'absolute', top: 52, right: 24 },
});
