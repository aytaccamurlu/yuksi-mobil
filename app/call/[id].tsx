import Avatar from '@/components/Avatar';
import { useGetConversationsQuery } from '@/service/messages.service';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { haptic } from '@/utils/haptics';
import { useGuardedPress } from '@/hooks/useGuardedPress';
import { CallPhase, setCallScreenFocused, useCallSession } from '@/hooks/useCallSession';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { RTCView } from 'react-native-webrtc';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PREVIEW_W = 88;
const PREVIEW_H = 118;
const PREVIEW_MARGIN = 20;
const PREVIEW_TOP = 96;

const PHASE_TEXT: Record<CallPhase, string> = {
  starting: 'Hazırlanıyor…',
  ringing: 'Aranıyor…',
  connecting: 'Bağlanıyor…',
  active: '',
  ended: 'Görüşme sonlandı',
  unavailable: 'Arama servisi şu anda kullanılamıyor',
};

function Ring({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, []);
  const style = useAnimatedStyle(() => {
    const t = (p.value + delay) % 1;
    return {
      opacity: 0.35 * (1 - t),
      transform: [{ scale: 1 + t * 0.9 }],
    };
  });
  return <Animated.View style={[s.ring, style]} pointerEvents="none" />;
}

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};

const PREVIEW_BASE_LEFT = SCREEN_W - PREVIEW_W - PREVIEW_MARGIN;
const PREVIEW_TOP_HIDDEN_OFFSET = -56;
const SNAP_DURATION = 220;
const MIN_PREVIEW_SCALE = 1;
const MAX_PREVIEW_SCALE = 1.3;
const PREVIEW_PEEK = 16;
const PREVIEW_HIDE_TRIGGER = 0.4;

function DraggableSelfPreview({
  onTap,
  chromeVisible,
  children,
}: {
  onTap: () => void;
  chromeVisible: boolean;
  children: React.ReactNode;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const hiddenSide = useSharedValue(0);

  const dragClampX = (x: number) => {
    'worklet';
    const abs = PREVIEW_BASE_LEFT + x;
    const minAbs = -PREVIEW_W * 0.8;
    const maxAbs = SCREEN_W - PREVIEW_W * 0.2;
    return Math.min(maxAbs, Math.max(minAbs, abs)) - PREVIEW_BASE_LEFT;
  };
  const clampY = (y: number) => {
    'worklet';
    return Math.min(SCREEN_H - PREVIEW_H - 220 - PREVIEW_TOP, Math.max(-PREVIEW_TOP + 8, y));
  };
  const cornerX = (goLeft: boolean) => {
    'worklet';
    return goLeft ? -PREVIEW_BASE_LEFT + PREVIEW_MARGIN : SCREEN_W - PREVIEW_W - PREVIEW_BASE_LEFT - PREVIEW_MARGIN;
  };

  useEffect(() => {
    if (hiddenSide.value !== 0) return;
    translateY.value = withTiming(chromeVisible ? 0 : PREVIEW_TOP_HIDDEN_OFFSET, {
      duration: SNAP_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chromeVisible]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = dragClampX(startX.value + e.translationX);
      translateY.value = clampY(startY.value + e.translationY);
    })
    .onEnd(() => {
      const abs = PREVIEW_BASE_LEFT + translateX.value;
      const offLeftRatio = -abs / PREVIEW_W;
      const offRightRatio = (abs + PREVIEW_W - SCREEN_W) / PREVIEW_W;
      if (offLeftRatio > PREVIEW_HIDE_TRIGGER) {
        hiddenSide.value = -1;
        translateX.value = withTiming(PREVIEW_PEEK - PREVIEW_W - PREVIEW_BASE_LEFT, {
          duration: SNAP_DURATION,
          easing: Easing.out(Easing.cubic),
        });
      } else if (offRightRatio > PREVIEW_HIDE_TRIGGER) {
        hiddenSide.value = 1;
        translateX.value = withTiming(SCREEN_W - PREVIEW_PEEK - PREVIEW_BASE_LEFT, {
          duration: SNAP_DURATION,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        hiddenSide.value = 0;
        const goLeft = translateX.value + PREVIEW_BASE_LEFT < SCREEN_W / 2;
        translateX.value = withTiming(cornerX(goLeft), { duration: SNAP_DURATION, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(chromeVisible ? 0 : PREVIEW_TOP_HIDDEN_OFFSET, {
          duration: SNAP_DURATION,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_PREVIEW_SCALE, Math.max(MIN_PREVIEW_SCALE, startScale.value * e.scale));
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (hiddenSide.value !== 0) {
      const goLeft = hiddenSide.value < 0;
      hiddenSide.value = 0;
      translateX.value = withTiming(cornerX(goLeft), { duration: SNAP_DURATION, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(chromeVisible ? 0 : PREVIEW_TOP_HIDDEN_OFFSET, {
        duration: SNAP_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      runOnJS(onTap)();
    }
  });

  const gesture = Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[s.selfPreview, animStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function ZoomableVideo({ children, onSingleTap }: { children: React.ReactNode; onSingleTap?: () => void }) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < MIN_ZOOM + 0.02) scale.value = withSpring(MIN_ZOOM);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(scale.value > MIN_ZOOM ? MIN_ZOOM : 2);
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      if (onSingleTap) runOnJS(onSingleTap)();
    });

  const gesture = Gesture.Race(pinch, Gesture.Exclusive(doubleTap, singleTap));

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

export default function CallScreen() {
  const router = useRouter();
  const { id, name: pName, avatar: pAvatar, type, role: pRole, callId } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatar?: string;
    type?: 'voice' | 'video';
    role?: 'caller' | 'callee';
    callId?: string;
  }>();
  const initialIsVideo = type === 'video';
  const role = pRole === 'callee' ? 'callee' : 'caller';

  const { data } = useGetConversationsQuery();
  const conv = (data?.data || data || []).find((c: any) => c.id === id);
  const name = conv?.name || pName || 'Kişi';
  const avatar: string | null = conv?.avatar ?? pAvatar ?? null;

  const {
    phase,
    seconds,
    muted,
    cameraOn,
    isVideo,
    videoRequestPending,
    localStream,
    remoteStream,
    toggleMute,
    toggleCamera,
    upgradeToVideo,
    acceptVideoRequest,
    declineVideoRequest,
    flipCamera,
    hangUp,
  } = useCallSession({
    role,
    conversationId: String(id),
    initialCallId: callId,
    isVideo: initialIsVideo,
    name,
    avatar,
  });

  useFocusEffect(
    useCallback(() => {
      setCallScreenFocused(true);
      return () => setCallScreenFocused(false);
    }, []),
  );

  const leave = useCallback(() => {
    router.back();
  }, [router]);

  const endCall = () => {
    haptic('medium');
    hangUp();
    setTimeout(() => router.back(), 900);
  };

  useEffect(() => {
    if (phase !== 'ended' && phase !== 'unavailable') return;
    const t = setTimeout(() => router.back(), phase === 'unavailable' ? 1800 : 900);
    return () => clearTimeout(t);
  }, [phase, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => sub.remove();
  }, [leave]);

  const ringing = phase === 'starting' || phase === 'ringing' || phase === 'connecting';
  const status = phase === 'active' ? fmt(seconds) : PHASE_TEXT[phase];
  const guardedLeave = useGuardedPress(leave);
  const guardedEndCall = useGuardedPress(endCall);

  const [swapped, setSwapped] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hasRemoteVideo =
    isVideo &&
    phase !== 'ended' &&
    phase !== 'unavailable' &&
    !!(remoteStream as any)?.toURL &&
    (remoteStream?.getVideoTracks?.().length ?? 0) > 0;
  const hasLocalVideo = isVideo && cameraOn && !!(localStream as any)?.toURL;
  const bigIsLocal = swapped && hasLocalVideo;
  const bigStream = bigIsLocal ? localStream : remoteStream;
  const showBigVideo = bigIsLocal ? hasLocalVideo : hasRemoteVideo;
  const cornerStream = bigIsLocal ? remoteStream : localStream;
  const cornerHasVideo = bigIsLocal ? hasRemoteVideo : hasLocalVideo;
  const showCornerPreview =
    isVideo && phase !== 'ended' && phase !== 'unavailable' && (bigIsLocal ? hasRemoteVideo : cameraOn);

  useEffect(() => {
    if (!showBigVideo) setControlsVisible(true);
  }, [showBigVideo]);

  const chromeVisible = !showBigVideo || controlsVisible;

  return (
    <View style={s.root}>
      {showBigVideo ? (
        <ZoomableVideo onSingleTap={() => setControlsVisible((v) => !v)}>
          <RTCView
            streamURL={(bigStream as any).toURL()}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            mirror={bigIsLocal}
          />
        </ZoomableVideo>
      ) : (
        <>
          {avatar ? <Animated.Image source={{ uri: avatar }} style={s.backdrop} blurRadius={30} /> : null}
          <LinearGradient
            colors={['rgba(20,18,16,0.72)', 'rgba(26,17,10,0.92)', '#160D06']}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}

      <SafeAreaView style={s.safe}>
        {chromeVisible && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)}>
        <View style={[s.top, showBigVideo && s.topOnVideo]}>
          <Pressable onPress={guardedLeave} hitSlop={10} style={[s.minBtn, s.minBtnCircle]}>
            <Feather name="chevron-down" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={s.headerCenter}>
            {showBigVideo ? (
              <>
                <Text style={s.headerName} numberOfLines={1}>
                  {bigIsLocal ? 'Sen' : name}
                </Text>
                <Text style={s.headerStatus}>{status}</Text>
              </>
            ) : (
              <View style={s.brandRow}>
                <Feather name="shield" size={12} color="#FF8A4C" />
                <Text style={s.brandText}>
                  {isVideo ? 'Yüksi üzerinden görüntülü arama' : 'Yüksi üzerinden sesli arama'}
                </Text>
              </View>
            )}
          </View>
          <View style={s.minBtn} />
        </View>
        </Animated.View>
        )}

        {!showBigVideo ? (
          <View style={s.center}>
            <View style={s.avatarWrap}>
              {ringing ? (
                <>
                  <Ring delay={0} />
                  <Ring delay={0.5} />
                </>
              ) : null}
              <View style={s.avatarRing}>
                <Avatar name={name} uri={avatar} size={132} />
              </View>
            </View>

            <Text style={s.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[s.status, phase === 'active' && s.statusActive]}>{status}</Text>
          </View>
        ) : (
          <View style={s.center} pointerEvents="none" />
        )}

        {showCornerPreview ? (
          <DraggableSelfPreview onTap={() => setSwapped((v) => !v)} chromeVisible={chromeVisible}>
            {cornerHasVideo ? (
              <RTCView
                streamURL={(cornerStream as any).toURL()}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
                mirror={!bigIsLocal}
                zOrder={1}
              />
            ) : (
              <>
                <Feather name="user" size={28} color="rgba(255,255,255,0.5)" />
                <Text style={s.selfPreviewText}>{bigIsLocal ? name : 'Sen'}</Text>
              </>
            )}
          </DraggableSelfPreview>
        ) : null}

        {chromeVisible && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)}>
        <View style={s.controls}>
          <View style={s.pillRow}>
            <CtrlButton
              icon={muted ? 'mic-off' : 'mic'}
              label={muted ? 'Aç' : 'Sessize al'}
              active={muted}
              onPress={toggleMute}
            />
            {isVideo ? (
              <CtrlButton
                icon={cameraOn ? 'video' : 'video-off'}
                label="Video"
                active={cameraOn}
                onPress={toggleCamera}
              />
            ) : (
              <CtrlButton icon="video" label="Video'ya geç" onPress={upgradeToVideo} />
            )}
            {isVideo && cameraOn ? (
              <CtrlButton icon="refresh-ccw" label="Kamera" onPress={flipCamera} />
            ) : null}
          </View>

          <Pressable
            onPress={guardedEndCall}
            style={({ pressed }) => [s.endBtn, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <Feather name="phone" size={28} color="#EF3B3B" style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>
        </View>
        </Animated.View>
        )}
      </SafeAreaView>

      {videoRequestPending ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          style={s.requestBackdrop}
        >
          <Animated.View entering={ZoomIn.duration(220)} exiting={ZoomOut.duration(150)} style={s.requestCard}>
            <View style={s.requestIconWrap}>
              <Feather name="video" size={24} color="#FF5B04" />
            </View>
            <Text style={s.requestTitle}>{name} kamerasını açtı</Text>
            <Text style={s.requestSubtitle}>Sen de açmak ister misin?</Text>
            <View style={s.requestActions}>
              <Pressable onPress={declineVideoRequest} style={s.requestBtnTouch}>
                <View style={[s.requestBtn, s.requestBtnGhost]}>
                  <Text style={s.requestBtnGhostText}>Reddet</Text>
                </View>
              </Pressable>
              <Pressable onPress={acceptVideoRequest} style={s.requestBtnTouch}>
                <View style={[s.requestBtn, s.requestBtnFilled]}>
                  <Text style={s.requestBtnFilledText}>Kamerayı aç</Text>
                </View>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function CtrlButton({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const guardedPress = useGuardedPress(onPress);
  return (
    <Pressable
      onPress={guardedPress}
      disabled={disabled}
      style={s.ctrl}
    >
      <View style={[s.ctrlCircle, active && s.ctrlCircleActive, disabled && s.ctrlCircleDisabled]}>
        <Feather
          name={icon}
          size={22}
          color={active ? '#160D06' : disabled ? 'rgba(255,255,255,0.35)' : '#FFFFFF'}
        />
      </View>
      <Text style={[s.ctrlLabel, disabled && s.ctrlLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#160D06' },
  backdrop: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  safe: { flex: 1, justifyContent: 'space-between' },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topOnVideo: { paddingBottom: 6 },
  minBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  minBtnCircle: {
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  headerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  headerStatus: {
    color: '#FF8A4C',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  requestBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  requestCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  requestIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,91,4,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  requestTitle: { fontSize: 16, fontWeight: '800', color: '#160D06', textAlign: 'center' },
  requestSubtitle: { fontSize: 13.5, color: '#6B7280', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  requestActions: { flexDirection: 'row', width: '100%', gap: 12 },
  requestBtnTouch: { flex: 1 },
  requestBtn: { width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  requestBtnGhost: { backgroundColor: '#F3F4F6' },
  requestBtnGhostText: { color: '#374151', fontSize: 14, fontWeight: '700' },
  requestBtnFilled: {
    backgroundColor: '#FF5B04',
    shadowColor: '#FF5B04',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  requestBtnFilledText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 40 },
  avatarWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  selfPreview: {
    position: 'absolute',
    top: 96,
    right: 20,
    width: 88,
    height: 118,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: '#FF5B04',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  selfPreviewText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FF5B04',
  },
  avatarRing: {
    padding: 5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', maxWidth: '80%' },
  status: { color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },
  statusActive: { color: '#FF8A4C', fontVariant: ['tabular-nums'] },

  controls: { paddingHorizontal: 28, paddingBottom: 18, alignItems: 'center', gap: 26 },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(8,6,4,0.6)',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  ctrl: { alignItems: 'center', gap: 7, flex: 1 },
  ctrlCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlCircleActive: { backgroundColor: '#FFFFFF' },
  ctrlCircleDisabled: { backgroundColor: 'rgba(255,255,255,0.06)' },
  ctrlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  ctrlLabelDisabled: { color: 'rgba(255,255,255,0.3)' },

  endBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
