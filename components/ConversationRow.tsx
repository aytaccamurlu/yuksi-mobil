import Avatar from '@/components/Avatar';
import Skeleton from '@/components/Skeleton';
import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { GestureResponderEvent, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { useGetLastMessageQuery } from '@/service/messages.service';
import { FOREGROUND_POLL_INTERVAL_MS } from '@/constants/polling';

const describeFallbackMessage = (m: any): string => {
  if (!m) return '';
  if (m.text) return m.text;
  if (m.images?.length) return 'Fotoğraf';
  if (m.audioUri) return 'Sesli mesaj';
  if (m.call) return 'Arama';
  return '';
};

export type Conversation = {
  id: string;
  name: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageSenderId?: string | null;
  lastMessageDelivered?: boolean;
  time: string;
  unread: number;
  status: 'online' | 'away' | 'offline';
  blocked?: boolean;
  muted?: boolean;
};

function Highlighted({
  text,
  term,
  style,
  numberOfLines,
}: {
  text: string;
  term?: string;
  style: any;
  numberOfLines?: number;
}) {
  const i = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (i < 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {text.slice(0, i)}
      <Text style={s.highlight}>{text.slice(i, i + term!.length)}</Text>
      {text.slice(i + term!.length)}
    </Text>
  );
}

export default React.memo(function ConversationRow({
  conversation,
  currentUserId,
  onPress,
  onLongPress,
  searchTerm,
  searchSnippet,
  searchCount,
}: {
  conversation: Conversation;
  currentUserId?: string;
  onPress: () => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  searchTerm?: string;
  searchSnippet?: string;
  searchCount?: number;
}) {
  const { name, avatar, lastMessage, lastMessageSenderId, lastMessageDelivered, time, unread, blocked, muted, status } = conversation;
  const showSnippet = !blocked && !!searchSnippet;

  const needsFallback = !blocked && !showSnippet && !lastMessage;
  const { data: fallbackMessage } = useGetLastMessageQuery(conversation.id, {
    skip: !needsFallback,
    pollingInterval: FOREGROUND_POLL_INTERVAL_MS,
  });

  const previewText = lastMessage || describeFallbackMessage(fallbackMessage);
  const previewSenderId = lastMessageSenderId || fallbackMessage?.senderId || null;
  const previewDelivered = lastMessage
    ? !!lastMessageDelivered
    : fallbackMessage?.status === 'delivered' || fallbackMessage?.status === 'read';
  const isOwnLastMessage = !!currentUserId && !!previewSenderId && previewSenderId === currentUserId;

  return (
    <Tappable
      style={s.row}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
    >
      <View style={blocked && s.dim}>
        <Avatar
          name={name}
          uri={blocked ? null : avatar}
          size={46}
          ring={blocked ? '#B0B0B0' : '#FF5B04'}
          online={!blocked && status === 'online'}
        />
      </View>

      <View style={s.body}>
        <View style={s.topLine}>
          <View style={s.nameWrap}>
            <Highlighted
              text={name}
              term={searchTerm}
              style={[s.name, blocked && s.blockedName]}
              numberOfLines={1}
            />
            {muted && <Feather name="bell-off" size={12} color="#9CA3AF" />}
            {blocked && <Feather name="slash" size={12} color="#9CA3AF" />}
          </View>
          <Text style={s.time}>{time}</Text>
        </View>
        {showSnippet ? (
          <View style={s.snippetRow}>
            <Feather name="message-circle" size={11} color="#9CA3AF" />
            <Highlighted
              text={searchSnippet!}
              term={searchTerm}
              style={s.snippet}
              numberOfLines={1}
            />
            {searchCount && searchCount > 1 ? (
              <Text style={s.snippetCount}>{searchCount} mesaj</Text>
            ) : null}
          </View>
        ) : (
          <View style={s.previewRow}>
            {!blocked && isOwnLastMessage && previewText ? (
              <Ionicons
                name={previewDelivered ? 'checkmark-done' : 'checkmark'}
                size={14}
                color="#9CA3AF"
                style={s.previewTick}
              />
            ) : null}
            <Text style={[s.preview, blocked && s.blockedPreview]} numberOfLines={2}>
              {blocked ? 'Engellendi' : previewText}
            </Text>
          </View>
        )}
      </View>

      {!blocked && unread > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Tappable>
  );
});

export function ConversationRowSkeleton() {
  return (
    <View style={s.row}>
      <Skeleton style={s.skeletonAvatar} />
      <View style={s.body}>
        <View style={s.topLine}>
          <Skeleton style={s.skeletonName} />
          <Skeleton style={s.skeletonTime} />
        </View>
        <Skeleton style={s.skeletonPreview} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EDEDED',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dim: { opacity: 0.55 },
  body: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#4B5563', flexShrink: 1 },
  blockedName: { color: '#9CA3AF' },
  time: { fontSize: 11, color: '#9CA3AF' },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  previewTick: { marginRight: 4 },
  preview: { flex: 1, fontSize: 12, color: '#FF5B04', lineHeight: 16 },
  blockedPreview: { color: '#9CA3AF', fontStyle: 'italic' },
  highlight: { color: '#FF5B04', fontWeight: '800', backgroundColor: '#FFE9DC' },
  snippetRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  snippet: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 16 },
  snippetCount: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#4B5563' },

  skeletonAvatar: { width: 46, height: 46, borderRadius: 23 },
  skeletonName: { width: '40%', height: 13, borderRadius: 4 },
  skeletonTime: { width: 30, height: 11, borderRadius: 4 },
  skeletonPreview: { width: '70%', height: 12, borderRadius: 4, marginTop: 6 },
});
