import { useLazyGetIceConfigQuery } from '@/service/calls.service';
import {
    acceptCall,
    endCallSignal,
    initiateCall,
    onCallEvent,
    rejectCall,
    sendAnswer,
    sendIceCandidate,
    sendOffer,
} from '@/service/callSignaling';
import { setPendingCallLog } from '@/utils/pendingCallLog';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
    MediaStream,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
    mediaDevices,
} from 'react-native-webrtc';

export type CallPhase = 'starting' | 'ringing' | 'connecting' | 'active' | 'ended' | 'unavailable';

const VIDEO_CONSTRAINTS = {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: 'user',
};

const VIDEO_MAX_BITRATE = 1200000;

const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
};

const cloneEncoding = (enc: any) => (typeof enc?.toJSON === 'function' ? enc.toJSON() : { active: true, ...enc });

const applyVideoSenderQuality = (sender: any) => {
    if (!sender?.getParameters || !sender?.setParameters) return;
    try {
        const params = sender.getParameters() ?? {};
        params.degradationPreference = 'maintain-framerate';
        params.encodings = (params.encodings?.length ? params.encodings : [{ active: true }]).map((enc: any) => ({
            ...cloneEncoding(enc),
            maxBitrate: VIDEO_MAX_BITRATE,
            maxFramerate: 30,
        }));
        const result = sender.setParameters(params);
        if (result && typeof result.catch === 'function') {
            result.catch((e: unknown) => console.error('[call] applyVideoSenderQuality failed:', e));
        }
    } catch (e) {
        console.error('[call] applyVideoSenderQuality failed:', e);
    }
};

export type CallRole = 'caller' | 'callee';

export type CallParams = {
    role: CallRole;
    conversationId: string;
    initialCallId?: string;
    isVideo: boolean;
    name: string;
    avatar: string | null;
};

type Store = {
    params: CallParams | null;
    phase: CallPhase;
    seconds: number;
    muted: boolean;
    cameraOn: boolean;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    screenFocused: boolean;
    videoRequestPending: boolean;
};

let store: Store = {
    params: null,
    phase: 'starting',
    seconds: 0,
    muted: false,
    cameraOn: false,
    videoRequestPending: false,
    localStream: null,
    remoteStream: null,
    screenFocused: false,
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const patch = (p: Partial<Store>) => {
    store = { ...store, ...p };
    notify();
};
const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
};
const getSnapshot = () => store;

let callIdCurrent: string | undefined;
let pc: RTCPeerConnection | null = null;
let videoTransceiver: any = null;
let remoteAudioTrack: any = null;
let remoteVideoTrack: any = null;
let localStreamNative: MediaStream | null = null;
let pendingCandidates: string[] = [];
let remoteDescSet = false;
let ended = true;
let secondsTimer: ReturnType<typeof setInterval> | null = null;
let unsubscribeEvents: (() => void) | null = null;

const stopSecondsTimer = () => {
    if (secondsTimer) clearInterval(secondsTimer);
    secondsTimer = null;
};

const cleanupNative = () => {
    stopSecondsTimer();
    localStreamNative?.getTracks().forEach((t) => t.stop());
    localStreamNative = null;
    pc?.close();
    pc = null;
    videoTransceiver = null;
    remoteAudioTrack = null;
    remoteVideoTrack = null;
    pendingCandidates = [];
    remoteDescSet = false;
};

const finish = (nextPhase: CallPhase) => {
    console.log('[call] finish() called', { nextPhase, currentPhase: store.phase, seconds: store.seconds, ended });
    if (ended) return;
    ended = true;
    const params = store.params;
    const wasActive = store.phase === 'active';
    const finalSeconds = store.seconds;
    cleanupNative();
    patch({ phase: nextPhase });
    // Aramayı yalnızca arayan taraf kaydediyor; karşı taraf da kendi kaydını
    // oluştursaydı sohbette her arama için iki mesaj (bubble) düşerdi.
    if (params && params.role === 'caller') {
        const log = {
            convId: params.conversationId,
            direction: 'out' as const,
            status: nextPhase === 'unavailable' ? ('cancelled' as const) : wasActive ? ('completed' as const) : ('cancelled' as const),
            durationSec: finalSeconds,
            createdAt: new Date().toISOString(),
            isVideo: params.isVideo,
        };
        console.log('[call] setPendingCallLog', log);
        setPendingCallLog(log);
    }
};

const goUnavailable = (error?: unknown) => {
    if (error) console.error('[call] unavailable:', error);
    if (callIdCurrent) endCallSignal(callIdCurrent).catch(() => {});
    finish('unavailable');
};

const flushPendingCandidates = async () => {
    if (!pc) return;
    const queued = pendingCandidates;
    pendingCandidates = [];
    for (const raw of queued) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(raw)));
        } catch {
            // yoksay
        }
    }
};

const setupPeerConnection = async (
    isVideo: boolean,
    iceServers: { urls: string; username?: string | null; credential?: string | null }[],
) => {
    const mutableIceServers = iceServers.map((s) => ({ ...s }));
    const conn = new RTCPeerConnection({ iceServers: mutableIceServers as any });
    pc = conn;

    const stream = await mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: isVideo ? VIDEO_CONSTRAINTS : false,
    });
    localStreamNative = stream as unknown as MediaStream;
    patch({ localStream: stream as unknown as MediaStream });

    stream.getAudioTracks().forEach((track: any) => conn.addTrack(track, stream as any));

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
        const sender = conn.addTrack(videoTrack, stream as any);
        videoTransceiver = (conn as any).getTransceivers().find((t: any) => t.sender === sender) ?? null;
        applyVideoSenderQuality(sender);
    } else {
        // m-line sırası sonradan bozulmasın diye video m-line'ı baştan (inactive) rezerve ediyoruz.
        videoTransceiver = (conn as any).addTransceiver('video', { direction: 'inactive' });
    }

    const rebuildRemoteStream = () => {
        const tracks = [remoteAudioTrack, remoteVideoTrack].filter(Boolean);
        patch({ remoteStream: new MediaStream(tracks as any) });
    };

    (conn as any).ontrack = (event: any) => {
        console.log('[call] ontrack', { kind: event.track?.kind, streams: event.streams?.length ?? 0 });
        if (!event.track) return;
        if (event.track.kind === 'audio') remoteAudioTrack = event.track;
        if (event.track.kind === 'video') {
            remoteVideoTrack = event.track;
            event.track.onmute = () => {
                console.log('[call] remote video track muted');
                if (remoteVideoTrack === event.track) {
                    remoteVideoTrack = null;
                    rebuildRemoteStream();
                }
            };
            event.track.onunmute = () => {
                console.log('[call] remote video track unmuted');
                remoteVideoTrack = event.track;
                rebuildRemoteStream();
            };
        }
        rebuildRemoteStream();
    };

    (conn as any).onicecandidate = (event: any) => {
        if (event.candidate && callIdCurrent) {
            sendIceCandidate(callIdCurrent, JSON.stringify(event.candidate)).catch(() => {});
        }
    };

    const markActive = () => {
        if (store.phase === 'active') return;
        console.log('[call] markActive()', { fromPhase: store.phase });
        patch({ phase: 'active' });
        if (!secondsTimer) {
            secondsTimer = setInterval(() => patch({ seconds: store.seconds + 1 }), 1000);
        }
    };

    (conn as any).onconnectionstatechange = () => {
        const state = conn.connectionState;
        console.log('[call] connectionstatechange', state);
        if (state === 'connected') {
            markActive();
        } else if (state === 'failed' || state === 'closed') {
            finish('ended');
        }
    };

    (conn as any).oniceconnectionstatechange = () => {
        const iceState = conn.iceConnectionState;
        console.log('[call] iceconnectionstatechange', iceState);
        if (iceState === 'connected' || iceState === 'completed') {
            markActive();
        }
    };

    return conn;
};

const bindEvents = (params: CallParams, fetchIceConfig: ReturnType<typeof useLazyGetIceConfigQuery>[0]) => {
    unsubscribeEvents?.();

    const offCallInitiated = onCallEvent('CallInitiated', (p) => {
        if (params.role !== 'caller') return;
        callIdCurrent = p.call_id;
        patch({ phase: 'ringing' });
    });

    const offAccepted = onCallEvent('CallAccepted', async (p) => {
        if (params.role !== 'caller' || p.call_id !== callIdCurrent) return;
        try {
            const iceServers = await fetchIceConfig().unwrap();
            const conn = await setupPeerConnection(params.isVideo, iceServers);
            const offer = await conn.createOffer({});
            await conn.setLocalDescription(offer);
            await sendOffer(p.call_id, JSON.stringify(offer));
            patch({ phase: 'connecting' });
        } catch (e) {
            goUnavailable(e);
        }
    });

    const offRejected = onCallEvent('CallRejected', (p) => {
        if (p.call_id !== callIdCurrent) return;
        finish('ended');
    });

    const offEnded = onCallEvent('CallEnded', (p) => {
        if (p.call_id !== callIdCurrent) return;
        finish('ended');
    });

    const offOffer = onCallEvent('ReceiveOffer', async (p) => {
        if (p.call_id !== callIdCurrent || !pc) return;
        try {
            const offerDesc = JSON.parse(p.sdp_offer);
            const videoSection: string =
                (typeof offerDesc?.sdp === 'string' && offerDesc.sdp.match(/m=video[\s\S]*?(?=\r?\nm=|$)/)?.[0]) || '';
            const offerWantsVideo =
                !!videoSection &&
                !/a=inactive/.test(videoSection) &&
                !/a=recvonly/.test(videoSection) &&
                !/^m=video 0 /.test(videoSection);
            console.log('[call] offOffer', { offerWantsVideo, alreadyVideo: !!store.params?.isVideo, videoSection: videoSection.slice(0, 80) });
            await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
            remoteDescSet = true;
            await flushPendingCandidates();
            if (offerWantsVideo && !store.params?.isVideo) {
                patch({
                    params: { ...store.params!, isVideo: true },
                    videoRequestPending: true,
                });
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendAnswer(p.call_id, JSON.stringify(answer));
        } catch (e) {
            goUnavailable(e);
        }
    });

    const offAnswer = onCallEvent('ReceiveAnswer', async (p) => {
        if (p.call_id !== callIdCurrent || !pc) return;
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(p.sdp_answer)));
            remoteDescSet = true;
            await flushPendingCandidates();
        } catch (e) {
            goUnavailable(e);
        }
    });

    const offIce = onCallEvent('ReceiveIceCandidate', async (p) => {
        if (p.call_id !== callIdCurrent) return;
        if (!remoteDescSet) {
            pendingCandidates.push(p.candidate);
            return;
        }
        try {
            await pc?.addIceCandidate(new RTCIceCandidate(JSON.parse(p.candidate)));
        } catch {
            // yoksay
        }
    });

    unsubscribeEvents = () => {
        offCallInitiated();
        offAccepted();
        offRejected();
        offEnded();
        offOffer();
        offAnswer();
        offIce();
    };
};

const startCall = (params: CallParams, fetchIceConfig: ReturnType<typeof useLazyGetIceConfigQuery>[0]) => {
    console.log('[call] startCall()', params);
    callIdCurrent = params.initialCallId;
    ended = false;
    // Karşı taraf (callee) her zaman sesli olarak katılır; kamerası ancak
    // ayrı bir "Kamerayı aç" onayından sonra açılır (2 aşamalı onay).
    const initialIsVideo = params.role === 'caller' ? params.isVideo : false;
    const effectiveParams: CallParams = { ...params, isVideo: initialIsVideo };
    store = {
        params: effectiveParams,
        phase: 'starting',
        seconds: 0,
        muted: false,
        cameraOn: initialIsVideo,
        videoRequestPending: false,
        localStream: null,
        remoteStream: null,
        screenFocused: true,
    };
    notify();

    bindEvents(effectiveParams, fetchIceConfig);

    if (params.role === 'caller') {
        initiateCall(params.conversationId, params.isVideo).catch((e) => goUnavailable(e));
    } else if (params.initialCallId) {
        acceptCall(params.initialCallId)
            .then(() => fetchIceConfig().unwrap())
            .then((iceServers) => setupPeerConnection(false, iceServers))
            .then(() => patch({ phase: 'connecting' }))
            .catch((e) => goUnavailable(e));
    }
};

export const hasActiveCall = () => !!store.params && store.phase !== 'ended' && store.phase !== 'unavailable';

const renegotiate = async () => {
    if (!pc || !callIdCurrent) return;
    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    await sendOffer(callIdCurrent, JSON.stringify(offer));
};

const ensureLocalVideoTrack = async () => {
    if (!pc) return;
    if ((localStreamNative?.getVideoTracks().length ?? 0) > 0) return;
    const camStream = await mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
    const videoTrack = camStream.getVideoTracks()[0];
    if (!videoTrack) return;
    if (videoTransceiver) {
        await videoTransceiver.sender.replaceTrack(videoTrack);
        videoTransceiver.direction = 'sendrecv';
        applyVideoSenderQuality(videoTransceiver.sender);
    } else {
        const sender = pc.addTrack(videoTrack, localStreamNative as any);
        applyVideoSenderQuality(sender);
    }
    localStreamNative = new MediaStream([...(localStreamNative?.getTracks() ?? []), videoTrack]) as unknown as MediaStream;
    patch({ localStream: localStreamNative, cameraOn: true });
};

const disableLocalVideoTrack = async () => {
    if (!pc || !videoTransceiver) return;
    const track = localStreamNative?.getVideoTracks()[0];
    track?.stop();
    try {
        await videoTransceiver.sender.replaceTrack(null);
    } catch {
        // yoksay
    }
    videoTransceiver.direction = 'recvonly';
    localStreamNative = new MediaStream(
        (localStreamNative?.getTracks() ?? []).filter((t: any) => t.kind !== 'video'),
    ) as unknown as MediaStream;
    patch({ localStream: localStreamNative, cameraOn: false });
};

export const upgradeToVideo = async () => {
    if (!pc || !store.params || store.params.isVideo) return;
    try {
        await ensureLocalVideoTrack();
        if (store.params) patch({ params: { ...store.params, isVideo: true } });
        await renegotiate();
        console.log('[call] upgradeToVideo done');
    } catch (e) {
        console.error('[call] upgradeToVideo failed:', e);
    }
};

export const acceptVideoRequest = async () => {
    if (!store.videoRequestPending) return;
    patch({ videoRequestPending: false });
    try {
        await ensureLocalVideoTrack();
        await renegotiate();
        console.log('[call] acceptVideoRequest done');
    } catch (e) {
        console.error('[call] acceptVideoRequest failed:', e);
    }
};

export const toggleCamera = async () => {
    if (!pc) return;
    try {
        if (store.cameraOn) {
            await disableLocalVideoTrack();
        } else {
            await ensureLocalVideoTrack();
        }
        await renegotiate();
        console.log('[call] toggleCamera done', { cameraOn: store.cameraOn });
    } catch (e) {
        console.error('[call] toggleCamera failed:', e);
    }
};

export const declineVideoRequest = () => {
    patch({ videoRequestPending: false });
};

export const flipCamera = () => {
    const track: any = localStreamNative?.getVideoTracks?.()[0];
    try {
        const result = track?._switchCamera?.();
        if (result && typeof result.catch === 'function') {
            result.catch((e: unknown) => console.error('[call] flipCamera failed:', e));
        }
    } catch (e) {
        console.error('[call] flipCamera failed:', e);
    }
};

export const setCallScreenFocused = (focused: boolean) => patch({ screenFocused: focused });

export const useActiveCallBadge = () => {
    const snap = useSyncExternalStore(subscribe, getSnapshot);
    const visible = hasActiveCall() && !snap.screenFocused;
    return {
        visible,
        params: snap.params,
        phase: snap.phase,
        seconds: snap.seconds,
        remoteStream: snap.remoteStream,
        localStream: snap.localStream,
    };
};

export function useCallSession(params: CallParams | null) {
    const snap = useSyncExternalStore(subscribe, getSnapshot);
    const [fetchIceConfig] = useLazyGetIceConfigQuery();

    useEffect(() => {
        if (!params) return;
        const sameCall = store.params?.conversationId === params.conversationId && !ended;
        console.log('[call] useCallSession effect', { sameCall, ended, storeConvId: store.params?.conversationId, newConvId: params.conversationId });
        if (sameCall) {
            bindEvents(store.params!, fetchIceConfig);
            return;
        }
        startCall(params, fetchIceConfig);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params?.conversationId]);

    const toggleMute = useCallback(() => {
        const next = !store.muted;
        patch({ muted: next });
        localStreamNative?.getAudioTracks().forEach((t) => (t.enabled = !next));
    }, []);

    const hangUp = useCallback(() => {
        if (callIdCurrent) endCallSignal(callIdCurrent).catch(() => {});
        finish('ended');
    }, []);

    const decline = useCallback(() => {
        if (store.params?.initialCallId) rejectCall(store.params.initialCallId).catch(() => {});
        finish('ended');
    }, []);

    return {
        phase: snap.phase,
        seconds: snap.seconds,
        muted: snap.muted,
        cameraOn: snap.cameraOn,
        isVideo: snap.params?.isVideo ?? false,
        videoRequestPending: snap.videoRequestPending,
        localStream: snap.localStream,
        remoteStream: snap.remoteStream,
        toggleMute,
        toggleCamera,
        upgradeToVideo,
        acceptVideoRequest,
        declineVideoRequest,
        flipCamera,
        hangUp,
        decline,
    };
}
