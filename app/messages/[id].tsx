import Avatar from '@/components/Avatar';
import CameraCaptureModal from '@/components/CameraCaptureModal';
import { planCameraSend } from '@/utils/cameraSendPlan';
import ChatImageViewer from '@/components/ChatImageViewer';
import type { Conversation } from '@/components/ConversationRow';
import { FOREGROUND_POLL_INTERVAL_MS } from '@/constants/polling';
import ImageGrid, { GRID_W } from '@/components/ImageGrid';
import MapMessageCard, { parseMapsLink, stripMapsLink } from '@/components/MapMessageCard';
import SwipeToReply from '@/components/SwipeToReply';
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useLazyGetMessagesPageQuery,
  useSendMessageMutation,
  useUnblockUserMutation,
} from '@/service/messages.service';
import { useGetUserPresenceQuery } from '@/service/presence.service';
import { useUserSession } from '@/store/feature/user/hooks';
import { useGuardedPress } from '@/hooks/useGuardedPress';
import { setActiveConversationId } from '@/utils/notifications/activeConversation';
import { subscribePendingCallLog, takePendingCallLogs } from '@/utils/pendingCallLog';
import { Feather, Ionicons } from '@expo/vector-icons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, Keyboard, LayoutAnimation, Platform, Pressable, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import Tappable from '@/components/Tappable';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BUBBLE_MOTION_MS = 280;
const BUBBLE_EASING = Easing.out(Easing.cubic);
const BUBBLE_TRANSITION = LinearTransition.duration(BUBBLE_MOTION_MS).easing(BUBBLE_EASING);
const BUBBLE_ENTER = FadeInDown.duration(BUBBLE_MOTION_MS).easing(BUBBLE_EASING);

type Reply = { image?: string; text?: string; side: 'me' | 'them'; messageId?: string };
type MsgLoc = { label: string; lat: number; lng: number; url: string };
type MsgCall = {
  direction: 'out' | 'in';
  status: 'completed' | 'missed' | 'cancelled' | 'declined';
  durationSec: number;
  isVideo?: boolean;
};
type DeliveryStatus = 'sent' | 'delivered' | 'read';
type ChatMessage = {
  id: string;
  text?: string;
  images?: string[];
  audioUri?: string;
  audioDuration?: number;
  location?: MsgLoc | null;
  call?: MsgCall | null;
  side: 'me' | 'them';
  createdAt?: string;
  replyTo?: Reply | null;
  status?: DeliveryStatus;
};

function Ticks({ status, tight }: { status: DeliveryStatus; tight?: boolean }) {
  const read = status === 'read';
  return (
    <Ionicons
      name={status === 'sent' ? 'checkmark' : 'checkmark-done'}
      size={tight ? 13 : 14}
      color={read ? '#4FC3F7' : 'rgba(255,255,255,0.75)'}
    />
  );
}

const MAX_CHAT_IMAGES = 6;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const dayKey = (iso?: string) => (iso ? new Date(iso) : new Date()).toDateString();

const dayLabel = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Bugün';
  if (sameDay(d, yesterday)) return 'Dün';
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
};

const timeLabel = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type SepRow = { _sep: string; id: string };
const isSep = (r: ChatMessage | SepRow): r is SepRow => '_sep' in r;

function ReplyQuote({
  reply,
  mine,
  peerName,
}: {
  reply: Reply;
  mine: boolean;
  peerName?: string;
}) {
  return (
    <View style={[s.quote, mine ? s.quoteMine : s.quoteThem]}>
      {reply.image ? <Image source={{ uri: reply.image }} style={s.quoteThumb} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.quoteName} numberOfLines={1}>
          {reply.side === 'me' ? 'Sen' : peerName || 'Karşı taraf'}
        </Text>
        <Text style={s.quoteText} numberOfLines={1}>
          {reply.text || '📷 Fotoğraf'}
        </Text>
      </View>
    </View>
  );
}

const formatVoiceDuration = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

function PulsingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.25, { duration: 550 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[s.recordingDot, style]} />;
}

function VoiceMessageBubble({ uri, duration, mine }: { uri: string; duration?: number; mine: boolean }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) player.seekTo(0);
    player.play();
  };

  const total = duration ?? Math.ceil(status.duration);
  const secondsLeft = status.playing || status.currentTime > 0
    ? Math.max(0, Math.ceil(status.duration - status.currentTime))
    : total;

  return (
    <View style={s.voiceRow}>
      <Tappable onPress={toggle} style={s.voicePlayBtn}>
        <Feather name={status.playing ? 'pause' : 'play'} size={14} color={mine ? '#FF5B04' : '#2F6BFF'} />
      </Tappable>
      <View style={s.voiceWave}>
        {VOICE_WAVE_PATTERN.map((h, i) => (
          <View key={i} style={[s.voiceBar, { height: 4 + h * 14 }]} />
        ))}
      </View>
      <Text style={s.voiceDuration}>{formatVoiceDuration(secondsLeft)}</Text>
    </View>
  );
}

const VOICE_WAVE_PATTERN = [0.3, 0.7, 0.4, 1, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.5];

const callDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = sec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} sa`);
  if (m > 0) parts.push(`${m} dk`);
  if (r > 0 || parts.length === 0) parts.push(`${r} sn`);
  return parts.join(' ');
};

const callWhen = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const t = timeLabel(iso);
  if (sameDay(d, now)) return `Bugün ${t}`;
  if (sameDay(d, yesterday)) return `Dün ${t}`;
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${t}`;
};

function CallLogBubble({
  call,
  createdAt,
  mine,
  onPress,
}: {
  call: MsgCall;
  createdAt?: string;
  mine: boolean;
  onPress: () => void;
}) {
  const missed = call.status === 'missed' || call.status === 'declined';
  // call.direction karşı tarafa aitse bakış açımıza göre ters çevrilir.
  const outgoing = mine ? call.direction === 'out' : call.direction === 'in';
  const icon = missed ? 'phone-missed' : outgoing ? 'arrow-up-right' : 'arrow-down-left';
  const kind = call.isVideo ? 'görüntülü' : 'sesli';
  const title = outgoing ? `Giden ${kind} arama` : `Gelen ${kind} arama`;
  const detail =
    call.status === 'completed'
      ? `${callWhen(createdAt)} · ${callDuration(call.durationSec)} görüşüldü`
      : call.status === 'declined'
        ? `${callWhen(createdAt)} · Reddedildi`
        : missed
          ? `${callWhen(createdAt)} · Cevapsız`
          : `${callWhen(createdAt)} · Yanıtlanmadı`;

  return (
    <Tappable onPress={onPress} style={s.call}>
      <View style={[s.callIcon, missed ? s.callIconMissed : s.callIconOk]}>
        <Feather name={icon} size={17} color={missed ? '#DC2626' : '#16A34A'} />
      </View>
      <View style={s.callBody}>
        <Text style={[s.callTitle, missed && s.callTitleMissed]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.callDetail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
      <View style={s.callAction}>
        <Feather name="phone" size={16} color="#FF5B04" />
      </View>
    </Tappable>
  );
}

const MessageRow = React.memo(function MessageRow({
  item,
  fresh,
  peerName,
  onReply,
  onOpenImages,
  onOpenCall,
}: {
  item: ChatMessage;
  fresh: boolean;
  peerName?: string;
  onReply: (m: ChatMessage) => void;
  onOpenImages: (images: string[], index: number) => void;
  onOpenCall: () => void;
}) {
  const enter = fresh ? BUBBLE_ENTER : undefined;
  const mine = item.side === 'me';

  if (item.call) {
    const outgoing = mine ? item.call.direction === 'out' : item.call.direction === 'in';
    return (
      <Animated.View entering={enter} style={[s.bubbleRow, { justifyContent: outgoing ? 'flex-end' : 'flex-start' }]}>
        <CallLogBubble call={item.call} createdAt={item.createdAt} mine={mine} onPress={onOpenCall} />
      </Animated.View>
    );
  }

  const hasImages = !!item.images?.length;
  const parsed = item.location ? null : parseMapsLink(item.text);
  const loc = item.location || parsed;
  const bodyText = parsed ? stripMapsLink(item.text) : item.text;
  const tight = hasImages || !!loc;

  return (
    <Animated.View entering={enter} style={s.bubbleRow}>
      <SwipeToReply align={mine ? 'me' : 'them'} onReply={() => onReply(item)}>
        <View style={[tight ? s.imageBubble : s.bubble, mine ? s.bubbleMe : s.bubbleThem]}>
          {item.replyTo ? <ReplyQuote reply={item.replyTo} mine={mine} peerName={peerName} /> : null}
          {loc ? <MapMessageCard location={loc} width={GRID_W} /> : null}
          {hasImages ? <ImageGrid images={item.images!} onOpen={(i) => onOpenImages(item.images!, i)} /> : null}
          {!!item.audioUri && <VoiceMessageBubble uri={item.audioUri} duration={item.audioDuration} mine={mine} />}
          {!!bodyText && <Text style={[s.bubbleText, tight && s.caption]}>{bodyText}</Text>}
          <View style={[s.metaRow, tight && s.timeTight]}>
            <Text style={[s.time, mine ? s.timeMe : s.timeThem]}>{timeLabel(item.createdAt)}</Text>
            {mine ? <Ticks status={item.status ?? 'read'} tight={tight} /> : null}
          </View>
        </View>
      </SwipeToReply>
    </Animated.View>
  );
});

const DaySeparator = React.memo(function DaySeparator({ label }: { label: string }) {
  return (
    <View style={s.sepRow}>
      <Text style={s.sepText}>{label}</Text>
    </View>
  );
});

export default function ConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name: pName, avatar: pAvatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const convId = String(id);
  const myUserId = useUserSession()?.userId;

  const { data: convData } = useGetConversationsQuery();
  const { data: msgData } = useGetMessagesQuery(convId, {
    pollingInterval: FOREGROUND_POLL_INTERVAL_MS,
    refetchOnMountOrArgChange: true,
  });
  const [sendMessage] = useSendMessageMutation();
  const [unblockUser] = useUnblockUserMutation();
  const [fetchOlderPage] = useLazyGetMessagesPageQuery();
  const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
  const nextOlderPageRef = useRef(2);
  const loadingOlderRef = useRef(false);
  const totalPages: number = msgData?.totalPages ?? 1;
  const hasOlder = nextOlderPageRef.current <= totalPages;

  useEffect(() => {
    setOlderMessages([]);
    nextOlderPageRef.current = 2;
    loadingOlderRef.current = false;
  }, [convId]);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || nextOlderPageRef.current > totalPages) return;
    loadingOlderRef.current = true;
    const page = nextOlderPageRef.current;
    try {
      const res: any = await fetchOlderPage({ id: convId, page }, true).unwrap();
      const list: any[] = res?.data ?? [];
      nextOlderPageRef.current = page + 1;
      setOlderMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...prev, ...list.filter((m) => !known.has(m.id))];
      });
    } catch {
      // yoksay
    } finally {
      loadingOlderRef.current = false;
    }
  }, [convId, fetchOlderPage, totalPages]);
  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true },
    (status) => {
      if (status.hasError) {
        Alert.alert('Sesli Mesaj', 'Kayıt sırasında bir hata oluştu, lütfen tekrar dene.');
      }
    },
  );
  const recorderState = useAudioRecorderState(recorder, 100);

  const sidedCacheRef = useRef(new WeakMap<object, ChatMessage>());
  const serverMessages = useMemo<ChatMessage[]>(() => {
    const seed = msgData?.data || msgData;
    const latest: any[] = Array.isArray(seed) ? seed : [];
    const cache = sidedCacheRef.current;
    const withSide = (m: any): ChatMessage => {
      if ('side' in m) return m;
      const hit = cache.get(m);
      if (hit) return hit;
      const sided = { ...m, side: m.senderId && m.senderId === myUserId ? 'me' : 'them' };
      cache.set(m, sided);
      return sided;
    };
    const latestIds = new Set(latest.map((m) => m.id));
    const older = olderMessages.filter((m) => !latestIds.has(m.id));
    const chronological = [...older].reverse().concat([...latest].reverse());
    return chronological.map(withSide);
  }, [msgData, olderMessages, myUserId]);

  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const messages = useMemo(() => {
    const serverIds = new Set(serverMessages.map((m) => m.id));
    return [...serverMessages, ...pendingMessages.filter((p) => !serverIds.has(p.id))];
  }, [serverMessages, pendingMessages]);

  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const historySeededRef = useRef(false);
  if (!historySeededRef.current && messages.length > 0) {
    messages.forEach((m) => seenMessageIdsRef.current.add(m.id));
    historySeededRef.current = true;
  }
  useEffect(() => {
    messages.forEach((m) => seenMessageIdsRef.current.add(m.id));
  }, [messages]);

  useEffect(() => {
    if (!pendingMessages.length) return;
    const serverIds = new Set(serverMessages.map((m) => m.id));
    if (pendingMessages.some((p) => serverIds.has(p.id))) {
      setPendingMessages((prev) => prev.filter((p) => !serverIds.has(p.id)));
    }
  }, [serverMessages, pendingMessages]);

  useEffect(() => {
    setActiveConversationId(convId);
    return () => setActiveConversationId(null);
  }, [convId]);

  const [input, setInput] = useState('');
  const [kbHeight, setKbHeight] = useState(0);
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null);
  const [replyingTo, setReplyingTo] = useState<Reply | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<any>(null);
  const wantScrollRef = useRef(false);

  const scrollToEnd = useCallback(() => {
    wantScrollRef.current = true;
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKbHeight(e.endCoordinates?.height ?? 0);
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

  const foundConversation: Conversation | undefined = (convData?.data || convData || []).find(
    (c: Conversation) => c.id === convId,
  );
  const conversation: Conversation | undefined =
    foundConversation ||
    (pName
      ? {
          id: convId,
          name: pName,
          avatar: pAvatar || null,
          lastMessage: '',
          time: '',
          unread: 0,
          status: 'offline',
        }
      : undefined);
  const blocked = !!conversation?.blocked;
  const otherUserId = (conversation as any)?.otherUserId as string | undefined;
  const { data: otherUserPresence } = useGetUserPresenceQuery(otherUserId ?? '', {
    skip: !otherUserId,
    pollingInterval: 7_000,
  });

  const handleSend = useCallback(() => {
    const text = input.trim();
    const images = pending;
    if (blocked || (!text && images.length === 0)) return;
    const replyTo = replyingTo;
    const localId = `local-${Date.now()}`;
    setPendingMessages((prev) => [
      ...prev,
      {
        id: localId,
        text: text || undefined,
        images: images.length ? images : undefined,
        side: 'me',
        replyTo,
        createdAt: new Date().toISOString(),
        status: 'sent',
      },
    ]);
    setInput('');
    setReplyingTo(null);
    setPending([]);
    scrollToEnd();
    sendMessage({
      id: convId,
      text,
      images: images.length ? images : undefined,
      replyToId: replyTo?.messageId ?? null,
    })
      .unwrap()
      .then((res: any) => {
        const realId = res?.data?.id;
        if (!realId) return;
        seenMessageIdsRef.current.add(realId);
        setPendingMessages((prev) => prev.map((p) => (p.id === localId ? { ...p, id: realId } : p)));
      })
      .catch(() => {
        setPendingMessages((prev) => prev.filter((p) => p.id !== localId));
        Alert.alert('Mesaj gönderilemedi', 'Lütfen tekrar dene.');
      });
  }, [input, pending, convId, sendMessage, blocked, replyingTo, scrollToEnd]);

  const guardedSend = useGuardedPress(handleSend);

  const addImages = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: MAX_CHAT_IMAGES - pending.length,
      });
      if (!res.canceled) {
        setPending((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, MAX_CHAT_IMAGES));
      }
    } catch {
      Alert.alert('Hata', 'Galeri açılamadı, lütfen tekrar dene.');
    }
  }, [pending.length]);
  const guardedAddImages = useGuardedPress(addImages);

  const openCamera = useCallback(() => setCameraModalVisible(true), []);

  const handleCameraCapture = useCallback((photos: { uri: string }[]) => {
    setCameraModalVisible(false);
    if (!photos.length) return;
    setPending((prev) => [...prev, ...photos.map((p) => p.uri)].slice(0, MAX_CHAT_IMAGES));
  }, []);

  const sendCameraPhoto = useCallback(async (photos: { uri: string; caption?: string }[]) => {
    if (blocked || !photos.length) return;
    const replyTo = replyingTo;
    setReplyingTo(null);

    // Fotoğraflar her zaman çekildikleri sırayla, sırayla (paralel değil) gönderilir.
    for (const item of planCameraSend(photos)) {
      const localId = `local-${Date.now()}`;
      setPendingMessages((prev) => [
        ...prev,
        {
          id: localId,
          text: item.text || undefined,
          images: item.images,
          side: 'me',
          replyTo,
          createdAt: new Date().toISOString(),
          status: 'sent',
        },
      ]);
      scrollToEnd();
      try {
        const res: any = await sendMessage({
          id: convId,
          text: item.text,
          images: item.images,
          replyToId: replyTo?.messageId ?? null,
        }).unwrap();
        const realId = res?.data?.id;
        if (realId) {
          seenMessageIdsRef.current.add(realId);
          setPendingMessages((prev) => prev.map((p) => (p.id === localId ? { ...p, id: realId } : p)));
        }
      } catch {
        setPendingMessages((prev) => prev.filter((p) => p.id !== localId));
        Alert.alert('Mesaj gönderilemedi', 'Lütfen tekrar dene.');
      }
    }
  }, [blocked, convId, sendMessage, replyingTo, scrollToEnd]);

  const cancelingRecordingRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Mikrofon izni gerekli', 'Sesli mesaj gönderebilmek için mikrofon iznine izin ver.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('Hata', 'Kayıt başlatılamadı, lütfen tekrar dene.');
    }
  }, [recorder]);

  const cancelRecording = useCallback(async () => {
    cancelingRecordingRef.current = true;
    try {
      await recorder.stop();
    } catch {
      // yoksay
    }
  }, [recorder]);

  const stopAndSendRecording = useCallback(async () => {
    const durationSec = recorderState.durationMillis / 1000;
    try {
      await recorder.stop();
    } catch {
      // yoksay — süre/uri altta zaten kontrol ediliyor
    }
    if (cancelingRecordingRef.current) {
      cancelingRecordingRef.current = false;
      return;
    }
    const uri = recorder.uri;
    if (!uri || durationSec < 1) return;

    const localId = `local-${Date.now()}`;
    setPendingMessages((prev) => [
      ...prev,
      {
        id: localId,
        audioUri: uri,
        audioDuration: Math.round(durationSec),
        side: 'me',
        createdAt: new Date().toISOString(),
        status: 'sent',
      },
    ]);
    scrollToEnd();
    sendMessage({ id: convId, audio: { uri, durationSec } })
      .unwrap()
      .then((res: any) => {
        const realId = res?.data?.id;
        if (!realId) return;
        seenMessageIdsRef.current.add(realId);
        setPendingMessages((prev) => prev.map((p) => (p.id === localId ? { ...p, id: realId } : p)));
      })
      .catch(() => {
        setPendingMessages((prev) => prev.filter((p) => p.id !== localId));
        Alert.alert('Ses mesajı gönderilemedi', 'Lütfen tekrar dene.');
      });
  }, [recorder, recorderState.durationMillis, convId, sendMessage, scrollToEnd]);

  const handleMicPress = useCallback(() => {
    if (recorderState.isRecording) {
      stopAndSendRecording();
      return;
    }
    startRecording();
  }, [recorderState.isRecording, startRecording, stopAndSendRecording]);

  const openViewer = useCallback((images: string[], index: number) => {
    setViewer({ images, index });
  }, []);

  const replyToImage = useCallback((uri: string) => {
    setReplyingTo({ image: uri, side: 'them' });
    setTimeout(() => inputRef.current?.focus(), 250);
  }, []);

  const collectPendingCallLogs = useCallback(() => {
    const logs = takePendingCallLogs(convId);
    console.log('[calllog] collect', { convId, count: logs.length });
    if (!logs.length) return;
    logs.forEach((log, i) => {
      const call = {
        direction: log.direction,
        status: log.status,
        durationSec: log.durationSec,
        isVideo: log.isVideo,
      };
      const localId = `call-${Date.now()}-${i}`;
      setPendingMessages((prev) => [
        ...prev,
        { id: localId, call, side: 'me', createdAt: log.createdAt },
      ]);
      console.log('[calllog] sendMessage start', { convId, call });
      sendMessage({ id: convId, call })
        .unwrap()
        .then((res: any) => {
          console.log('[calllog] sendMessage OK', res);
          const realId = res?.data?.id;
          if (!realId) return;
          seenMessageIdsRef.current.add(realId);
          setPendingMessages((prev) => prev.map((p) => (p.id === localId ? { ...p, id: realId } : p)));
        })
        .catch((e: any) => {
          console.log('[calllog] sendMessage FAILED', e);
          setPendingMessages((prev) => prev.filter((p) => p.id !== localId));
        });
    });
    scrollToEnd();
  }, [convId, sendMessage, scrollToEnd]);

  useFocusEffect(collectPendingCallLogs);

  useEffect(() => {
    console.log('[calllog] subscribe effect mounted', { convId });
    return subscribePendingCallLog(collectPendingCallLogs);
  }, [collectPendingCallLogs, convId]);

  const replyToMessage = useCallback((m: ChatMessage) => {
    const loc = m.location || parseMapsLink(m.text);
    if (m.images?.length) {
      setReplyingTo({ image: m.images[0], text: m.text, side: m.side, messageId: m.id });
    } else if (loc) {
      setReplyingTo({ text: `📍 ${loc.label}`, side: m.side, messageId: m.id });
    } else {
      setReplyingTo({ text: m.text, side: m.side, messageId: m.id });
    }
    setTimeout(() => inputRef.current?.focus(), 250);
  }, []);

  const ordered = useMemo(() => {
    const rows: (ChatMessage | SepRow)[] = [];
    let lastDay = '';
    for (const m of messages) {
      const k = dayKey(m.createdAt);
      if (k !== lastDay) {
        rows.push({ _sep: dayLabel(m.createdAt), id: `sep-${k}` });
        lastDay = k;
      }
      rows.push(m);
    }
    return rows.reverse();
  }, [messages]);
  const typing = input.trim().length > 0 || pending.length > 0;

  const peerName = conversation?.name;
  const openCall = useCallback(
    () =>
      router.push({
        pathname: '/call/[id]',
        params: { id: convId, name: peerName ?? '', avatar: conversation?.avatar ?? '' },
      }),
    [router, convId, peerName, conversation?.avatar],
  );
  const keyExtractor = useCallback((item: ChatMessage | SepRow) => item.id, []);
  const renderItem = useCallback(
    ({ item }: { item: ChatMessage | SepRow }) => {
      if (isSep(item)) return <DaySeparator label={item._sep} />;
      const fresh = historySeededRef.current && !seenMessageIdsRef.current.has(item.id);
      return (
        <MessageRow
          item={item}
          fresh={fresh}
          peerName={peerName}
          onReply={replyToMessage}
          onOpenImages={openViewer}
          onOpenCall={openCall}
        />
      );
    },
    [peerName, replyToMessage, openViewer, openCall],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Tappable onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-left" size={26} color="#FF5B04" />
        </Tappable>
        <Tappable
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/messages/contact/[id]',
              params: {
                id: convId,
                name: conversation?.name ?? '',
                avatar: conversation?.avatar ?? '',
              },
            })
          }
        >
          <Avatar
            name={conversation?.name || '?'}
            uri={blocked ? null : conversation?.avatar}
            size={40}
            ring="#FF5B04"
            online={!blocked && !!otherUserPresence?.isOnline}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.headerName} numberOfLines={1}>
              {conversation?.name || 'Sohbet'}
            </Text>
            {blocked ? (
              <Text style={s.headerStatus}>Engellendi</Text>
            ) : otherUserPresence?.isOnline ? (
              <Text style={s.headerOnline}>Çevrimiçi</Text>
            ) : null}
          </View>
        </Tappable>
        <View style={s.callPill}>
          <Tappable
            style={s.callPillBtn}
            hitSlop={4}
            onPress={() =>
              router.push({
                pathname: '/call/[id]',
                params: {
                  id: convId,
                  name: conversation?.name ?? '',
                  avatar: conversation?.avatar ?? '',
                  type: 'video',
                },
              })
            }
          >
            <Feather name="video" size={16} color="#FF5B04" />
          </Tappable>
          <View style={s.callPillDivider} />
          <Tappable
            style={s.callPillBtn}
            hitSlop={4}
            onPress={() =>
              router.push({
                pathname: '/call/[id]',
                params: {
                  id: convId,
                  name: conversation?.name ?? '',
                  avatar: conversation?.avatar ?? '',
                  type: 'voice',
                },
              })
            }
          >
            <Feather name="phone" size={16} color="#FF5B04" />
          </Tappable>
        </View>
      </View>

      <ImageBackground
        source={require('@/assets/background-motor-grey.jpg')}
        style={[s.flex, { paddingBottom: kbHeight > 0 ? kbHeight + insets.bottom : 0 }]}
        resizeMode="cover"
      >
        <Animated.FlatList
          ref={listRef}
          data={ordered}
          inverted
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          itemLayoutAnimation={BUBBLE_TRANSITION}
          initialNumToRender={14}
          maxToRenderPerBatch={10}
          windowSize={9}
          onEndReached={hasOlder ? loadOlder : undefined}
          onEndReachedThreshold={0.4}
          onContentSizeChange={() => {
            if (wantScrollRef.current) {
              wantScrollRef.current = false;
              listRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
          }}
        />

        {blocked ? (
          <View style={[s.blockedBar, { paddingBottom: 16 + (kbHeight > 0 ? 0 : insets.bottom) }]}>
            <Feather name="slash" size={15} color="#9CA3AF" />
            <Text style={s.blockedText}>Bu kişiye mesaj gönderemezsiniz.</Text>
            <Tappable
              onPress={() => {
                const otherUserId = (conversation as any)?.otherUserId;
                if (otherUserId) unblockUser({ targetUserId: otherUserId });
              }}
              hitSlop={8}
            >
              <Text style={s.unblockText}>Engeli kaldır</Text>
            </Tappable>
          </View>
        ) : (
          <View style={{ paddingBottom: kbHeight > 0 ? 0 : insets.bottom }}>
            {replyingTo ? (
              <View style={s.replyStrip}>
                {replyingTo.image ? (
                  <Image source={{ uri: replyingTo.image }} style={s.replyStripThumb} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={s.replyStripLabel}>
                    {replyingTo.side === 'me' ? 'Sen' : conversation?.name || 'Karşı taraf'}
                  </Text>
                  <Text style={s.replyStripText} numberOfLines={1}>
                    {replyingTo.text || '📷 Fotoğraf'}
                  </Text>
                </View>
                <Tappable onPress={() => setReplyingTo(null)} hitSlop={8}>
                  <Feather name="x" size={18} color="#9CA3AF" />
                </Tappable>
              </View>
            ) : null}

            {pending.length > 0 ? (
              <View style={s.pendingStrip}>
                {pending.map((uri) => (
                  <View key={uri} style={s.pendingThumbWrap}>
                    <Image source={{ uri }} style={s.pendingThumb} />
                    <Tappable
                      style={s.pendingRemove}
                      onPress={() => setPending((p) => p.filter((u) => u !== uri))}
                      hitSlop={6}
                    >
                      <Feather name="x" size={11} color="#FFFFFF" />
                    </Tappable>
                  </View>
                ))}
                {pending.length < MAX_CHAT_IMAGES ? (
                  <Tappable style={s.pendingAdd} onPress={guardedAddImages}>
                    <Feather name="plus" size={20} color="#FF5B04" />
                  </Tappable>
                ) : null}
              </View>
            ) : null}

            <Animated.View style={s.inputBar} layout={LinearTransition.duration(160)}>
              <View style={s.inputPill}>
                {recorderState.isRecording ? (
                  <View style={s.recordingRow}>
                    <Tappable onPress={cancelRecording} hitSlop={8}>
                      <Feather name="trash-2" size={18} color="#9CA3AF" />
                    </Tappable>
                    <PulsingDot />
                    <Text style={s.recordingTime}>
                      {formatVoiceDuration(Math.floor(recorderState.durationMillis / 1000))}
                    </Text>
                    <Text style={s.recordingHint}>Kaydediliyor…</Text>
                  </View>
                ) : (
                  <>
                    <Tappable onPress={guardedAddImages} hitSlop={6}>
                      <Feather name="paperclip" size={19} color="#FF5B04" />
                    </Tappable>
                    <Pressable style={{ flex: 1 }} onPress={focusInput}>
                      <TextInput
                        ref={inputRef}
                        style={s.textInput}
                        placeholder="Mesaj..."
                        placeholderTextColor="#9CA3AF"
                        value={input}
                        onChangeText={setInput}
                        returnKeyType="send"
                        onSubmitEditing={guardedSend}
                        blurOnSubmit={false}
                      />
                    </Pressable>
                    {!typing ? (
                      <Tappable onPress={openCamera} hitSlop={6}>
                        <Feather name="camera" size={19} color="#FF5B04" />
                      </Tappable>
                    ) : null}
                  </>
                )}
              </View>
              {typing && !recorderState.isRecording ? (
                <Animated.View
                  key="send"
                  entering={FadeIn.duration(130)}
                  exiting={FadeOut.duration(110)}
                >
                  <Tappable haptic="light" style={s.sendBtn} onPress={guardedSend} activeOpacity={0.85}>
                    <Feather name="send" size={19} color="#FFFFFF" />
                  </Tappable>
                </Animated.View>
              ) : (
                <Animated.View
                  key="mic"
                  entering={FadeIn.duration(130)}
                  exiting={FadeOut.duration(110)}
                >
                  <Tappable
                    style={[s.micBtn, recorderState.isRecording && s.micBtnActive]}
                    activeOpacity={0.85}
                    onPress={handleMicPress}
                  >
                    <Feather name={recorderState.isRecording ? 'square' : 'mic'} size={20} color="#FFFFFF" />
                  </Tappable>
                </Animated.View>
              )}
            </Animated.View>
          </View>
        )}
      </ImageBackground>

      <ChatImageViewer
        images={viewer?.images ?? []}
        startIndex={viewer?.index ?? 0}
        visible={!!viewer}
        name={conversation?.name}
        onClose={() => setViewer(null)}
        onReply={replyToImage}
      />

      <CameraCaptureModal
        visible={cameraModalVisible}
        onClose={() => setCameraModalVisible(false)}
        onCapture={handleCameraCapture}
        sendMode={{ onSend: sendCameraPhoto, placeholder: 'Mesaj yazın...' }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#EDEDED' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E2E2E2',
    borderRadius: 18,
  },
  headerName: { fontSize: 16, fontWeight: '800', color: '#4B5563' },
  headerStatus: { fontSize: 11, fontWeight: '600', color: '#FF5B04', marginTop: 1 },
  headerOnline: { fontSize: 11, fontWeight: '600', color: '#22C55E', marginTop: 1 },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 34,
    paddingHorizontal: 4,
  },
  callPillBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  callPillDivider: { width: 1, height: 16, backgroundColor: '#E5E7EB' },

  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  bubbleRow: { width: '100%', flexDirection: 'row', marginBottom: 12 },
  bubble: { maxWidth: '78%', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 22 },
  imageBubble: { maxWidth: '80%', padding: 0, borderRadius: 18, overflow: 'hidden', gap: 4 },
  bubbleMe: { backgroundColor: '#FF5B04', borderBottomRightRadius: 6 },
  bubbleThem: { backgroundColor: '#2F6BFF', borderBottomLeftRadius: 6 },
  bubbleText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  caption: { paddingHorizontal: 10, paddingTop: 2 },

  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    maxWidth: '94%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEDF3',
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  callIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIconOk: { backgroundColor: '#E7F6EC' },
  callIconMissed: { backgroundColor: '#FDE4E4' },
  callBody: { flexShrink: 1 },
  callTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  callTitleMissed: { color: '#DC2626' },
  callDetail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  callAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#FFD9C2',
    backgroundColor: '#FFF3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  time: { fontSize: 10 },
  timeTight: { paddingHorizontal: 10, paddingBottom: 4, marginTop: 0 },
  timeMe: { color: 'rgba(255,255,255,0.75)' },
  timeThem: { color: 'rgba(255,255,255,0.75)' },

  sepRow: { alignItems: 'center', marginVertical: 10 },
  sepText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B5B5B',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },

  quote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingVertical: 6,
    paddingRight: 10,
    paddingLeft: 8,
    marginBottom: 4,
  },
  quoteMine: { backgroundColor: 'rgba(0,0,0,0.15)', borderLeftColor: '#FFD9C2' },
  quoteThem: { backgroundColor: 'rgba(255,255,255,0.18)', borderLeftColor: '#FFFFFF' },
  quoteThumb: { width: 30, height: 30, borderRadius: 4 },
  quoteName: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', opacity: 0.95, marginBottom: 1 },
  quoteText: { color: '#FFFFFF', fontSize: 12, opacity: 0.9 },

  replyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5B04',
  },
  replyStripThumb: { width: 34, height: 34, borderRadius: 6 },
  replyStripLabel: { fontSize: 11, fontWeight: '700', color: '#FF5B04' },
  replyStripText: { fontSize: 12, color: '#6B7280', marginTop: 1 },

  pendingStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  pendingThumbWrap: { width: 56, height: 56 },
  pendingThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#E5E7EB' },
  pendingRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAdd: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FF5B04',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#F3F4F6',
  },
  blockedText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  unblockText: { fontSize: 13, color: '#FF5B04', fontWeight: '700' },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF5B04',
    borderRadius: 26,
    paddingHorizontal: 16,
    height: 48,
  },
  textInput: { fontSize: 15, color: '#111827', padding: 0 },
  recordingRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#DC2626' },
  recordingTime: { fontSize: 15, color: '#111827', fontWeight: '700' },
  recordingHint: { fontSize: 13, color: '#9CA3AF', flex: 1 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 180, paddingVertical: 2 },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  voiceBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.8)' },
  voiceDuration: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF5B04',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5B04',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  micBtnActive: { backgroundColor: '#DC2626', shadowColor: '#DC2626' },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF5B04',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5B04',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});
