import ConversationMenu, { ConversationMenuAction } from '@/components/ConversationMenu';
import ConversationRow, { Conversation, ConversationRowSkeleton } from '@/components/ConversationRow';
import {
  useDeleteConversationMutation,
  useGetConversationsQuery,
  useSearchMessagesQuery,
  useUpdateConversationMutation,
} from '@/service/messages.service';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { useUserSession } from '@/store/feature/user/hooks';
import { FOREGROUND_POLL_INTERVAL_MS } from '@/constants/polling';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const norm = (v: string) => v.toLowerCase();

const ROW_TRANSITION = LinearTransition.springify().damping(20).stiffness(170).mass(0.6);

export default function MessagesScreen() {
  const router = useRouter();
  const currentUserId = useUserSession()?.userId;
  const { data, isLoading, refetch } = useGetConversationsQuery(undefined, {
    pollingInterval: FOREGROUND_POLL_INTERVAL_MS,
  });
  const [updateConversation] = useUpdateConversationMutation();
  const [deleteConversation] = useDeleteConversationMutation();

  const conversations: Conversation[] = data?.data || data || [];

  const [menu, setMenu] = useState<{ x: number; y: number; conv: Conversation } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  const { data: searchData } = useSearchMessagesQuery(trimmed, { skip: !searching });
  const bodyMatches = useMemo(
    () =>
      ((searchData?.data || searchData || []) as {
        conversationId: string;
        snippet: string;
        count: number;
      }[]),
    [searchData],
  );

  const snippets = useMemo(() => {
    const m: Record<string, { text: string; count: number }> = {};
    if (searching) bodyMatches.forEach((b) => (m[b.conversationId] = { text: b.snippet, count: b.count }));
    return m;
  }, [bodyMatches, searching]);

  const unreadCount = useMemo(
    () => conversations.filter((c) => !c.blocked && c.unread > 0).length,
    [conversations],
  );

  const visible = useMemo(() => {
    const q = norm(trimmed);
    let list = conversations;
    if (unreadOnly) list = list.filter((c) => !c.blocked && c.unread > 0);
    if (q.length >= 2) {
      const bodyIds = new Set(bodyMatches.map((b) => b.conversationId));
      list = list.filter(
        (c) => norm(c.name).includes(q) || norm(c.lastMessage).includes(q) || bodyIds.has(c.id),
      );
    }
    return list;
  }, [conversations, trimmed, unreadOnly, bodyMatches]);

  const onMenuSelect = (action: ConversationMenuAction) => {
    const conv = menu?.conv;
    if (!conv) return;
    if (action === 'block') {
      updateConversation({ id: conv.id, blocked: !conv.blocked });
    } else if (action === 'mute') {
      updateConversation({ id: conv.id, muted: !conv.muted });
    } else if (action === 'media') {
      router.push(`/messages/media/${conv.id}`);
    } else if (action === 'delete') {
      Alert.alert('Sohbeti sil', `${conv.name} ile olan sohbet ve mesajlar silinecek. Devam edilsin mi?`, [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteConversation(conv.id),
        },
      ]);
    } else if (action === 'report') {
      router.push({ pathname: '/complaint/new', params: { conversationId: conv.id, name: conv.name } });
    } else {
      Alert.alert('Konum görüntüle', 'Bu özellik yakında.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#FF5B04' }}>Mesajlarım</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Tappable
              onPress={() => setUnreadOnly((v) => !v)}
              hitSlop={8}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: unreadOnly ? '#FF5B04' : '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="message-circle" size={17} color={unreadOnly ? '#FFFFFF' : '#FF5B04'} />
              {!unreadOnly && unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    minWidth: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#FF5B04',
                  }}
                />
              )}
            </Tappable>
            <Tappable
              onPress={() => {
                setSearchOpen((v) => !v);
                setQuery('');
              }}
              hitSlop={8}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: searchOpen ? '#FFF0E8' : '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name={searchOpen ? 'x' : 'search'} size={18} color="#FF5B04" />
            </Tappable>
          </View>
        </View>

        {unreadOnly && (
          <Animated.View
            entering={FadeInUp.duration(180)}
            exiting={FadeOutUp.duration(140)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              alignSelf: 'flex-start',
              backgroundColor: '#FFF0E8',
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Feather name="message-circle" size={13} color="#FF5B04" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF5B04' }}>
              Sadece okunmayanlar{unreadCount > 0 ? ` · ${unreadCount}` : ''}
            </Text>
          </Animated.View>
        )}

        {searchOpen && (
          <Animated.View
            entering={FadeInUp.duration(180)}
            exiting={FadeOutUp.duration(140)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              backgroundColor: '#F3F4F6',
              borderRadius: 14,
              paddingHorizontal: 12,
              height: 44,
            }}
          >
            <Feather name="search" size={16} color="#9CA3AF" />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: '#111827' }}
              placeholder="İsim veya mesaj ara"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
          </Animated.View>
        )}
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ConversationRowSkeleton key={i} />
          ))}
        </View>
      ) : (
        <Animated.FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onRefresh={refetch}
          refreshing={false}
          itemLayoutAnimation={ROW_TRANSITION}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: 8 }}
          renderItem={({ item }) => (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(140)}>
              <ConversationRow
                conversation={item}
                currentUserId={currentUserId}
                searchTerm={searching ? trimmed : undefined}
                searchSnippet={snippets[item.id]?.text}
                searchCount={snippets[item.id]?.count}
                onPress={() => router.push(`/messages/${item.id}`)}
                onLongPress={(e) =>
                  setMenu({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, conv: item })
                }
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <Animated.Text
              entering={FadeIn.duration(200)}
              style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 40 }}
            >
              {query.trim().length >= 2
                ? 'Sonuç bulunamadı.'
                : unreadOnly
                  ? 'Okunmamış mesaj yok.'
                  : 'Henüz mesajın yok.'}
            </Animated.Text>
          }
        />
      )}

      <ConversationMenu
        visible={!!menu}
        anchor={menu}
        state={{ blocked: menu?.conv.blocked, muted: menu?.conv.muted }}
        onClose={() => setMenu(null)}
        onSelect={onMenuSelect}
      />
    </SafeAreaView>
  );
}
