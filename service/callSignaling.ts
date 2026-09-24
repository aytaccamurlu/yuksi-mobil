import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { store } from '@/store/app';
import { BASE_URL } from './api';

export type IncomingCallPayload = { call_id: string; conversation_id: string; caller_id: string; is_video: boolean };
export type CallIdPayload = { call_id: string };
export type OfferPayload = { call_id: string; sdp_offer: string };
export type AnswerPayload = { call_id: string; sdp_answer: string };
export type IceCandidatePayload = { call_id: string; candidate: string };

type EventMap = {
    IncomingCall: IncomingCallPayload;
    CallInitiated: CallIdPayload;
    CallAccepted: CallIdPayload;
    CallRejected: CallIdPayload;
    CallEnded: CallIdPayload;
    ReceiveOffer: OfferPayload;
    ReceiveAnswer: AnswerPayload;
    ReceiveIceCandidate: IceCandidatePayload;
};

type EventName = keyof EventMap;

const EVENT_NAMES: EventName[] = [
    'IncomingCall',
    'CallInitiated',
    'CallAccepted',
    'CallRejected',
    'CallEnded',
    'ReceiveOffer',
    'ReceiveAnswer',
    'ReceiveIceCandidate',
];

let connection: HubConnection | null = null;
let connecting: Promise<void> | null = null;
const handlers: Partial<Record<EventName, Set<(payload: any) => void>>> = {};

export function onCallEvent<K extends EventName>(event: K, cb: (payload: EventMap[K]) => void): () => void {
    if (!handlers[event]) handlers[event] = new Set();
    handlers[event]!.add(cb);
    return () => handlers[event]!.delete(cb);
}

export const isCallHubConnected = (): boolean => connection?.state === 'Connected';

export async function connectCallHub(): Promise<void> {
    if (connection || connecting) return connecting ?? undefined;

    const conn = new HubConnectionBuilder()
        .withUrl(`${BASE_URL}/hubs/call`, {
            accessTokenFactory: () => (store.getState() as any)?.userSlice?.userSession?.accessToken ?? '',
            transport: HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

    EVENT_NAMES.forEach((name) => {
        conn.on(name, (payload: any) => {
            handlers[name]?.forEach((cb) => (cb as (p: any) => void)(payload));
        });
    });

    connecting = conn
        .start()
        .then(() => {
            connection = conn;
        })
        .finally(() => {
            connecting = null;
        });

    return connecting;
}

export async function disconnectCallHub(): Promise<void> {
    const conn = connection;
    connection = null;
    await conn?.stop().catch(() => {});
}

async function invoke(method: string, ...args: unknown[]): Promise<void> {
    if (!connection || connection.state !== 'Connected') {
        throw new Error('call_hub_not_connected');
    }
    await connection.invoke(method, ...args);
}

export const initiateCall = (conversationId: string, isVideo: boolean): Promise<void> =>
    invoke('InitiateCall', conversationId, isVideo);
export const acceptCall = (callId: string): Promise<void> => invoke('AcceptCall', callId);
export const rejectCall = (callId: string): Promise<void> => invoke('RejectCall', callId);
export const endCallSignal = (callId: string): Promise<void> => invoke('EndCall', callId);
export const sendOffer = (callId: string, sdpOffer: string): Promise<void> => invoke('SendOffer', callId, sdpOffer);
export const sendAnswer = (callId: string, sdpAnswer: string): Promise<void> => invoke('SendAnswer', callId, sdpAnswer);
export const sendIceCandidate = (callId: string, candidate: string): Promise<void> =>
    invoke('SendIceCandidate', callId, candidate);
