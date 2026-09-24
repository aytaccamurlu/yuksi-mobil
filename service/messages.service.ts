import { createApi } from "@reduxjs/toolkit/query/react";
import { UPLOAD_TIMEOUT_MS, yuksiBaseQuery } from "./api";
import { getPersistedQueryData } from "@/utils/queryCacheStorage";

export const MESSAGES_PAGE_SIZE = 30;

const CALL_DIRECTION_TO_API: Record<string, number> = { in: 0, out: 1 };
const CALL_STATUS_TO_API: Record<string, number> = {
    completed: 0,
    missed: 1,
    cancelled: 2,
    declined: 3,
};

// Mock katmanı hazır şekilli veri döndürüyor, gerçek backend camelCase DTO.
const isPreShaped = (o: any, tellTale: string) => o && typeof o === "object" && tellTale in o;

const formatConvTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Dün";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};

const looksLikeUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

const fromApiConversation = (c: any) => {
    if (isPreShaped(c, "lastMessage")) return c;
    const isOnline = !!(c.otherUserIsOnline ?? c.other_user_is_online);
    const rawPreview: string = c.lastMessagePreview ?? c.last_message_preview ?? "";
    return {
        id: c.id,
        otherUserId: c.otherUserId ?? c.other_user_id,
        name: c.otherUserName || c.other_user_name || "Kullanıcı",
        avatar: c.otherUserAvatarUrl || c.other_user_avatar_url || null,
        lastMessage: looksLikeUrl(rawPreview) ? "" : rawPreview,
        lastMessageSenderId: c.lastMessageSenderId ?? c.last_message_sender_id ?? null,
        lastMessageDelivered: !!(c.lastMessageDelivered ?? c.last_message_delivered),
        time: formatConvTime(c.lastMessageAt ?? c.last_message_at),
        unread: c.unreadCount ?? c.unread_count ?? 0,
        status: (isOnline ? "online" : "offline") as "online" | "offline",
        blocked: false,
        muted: false,
    };
};

const fromApiMessage = (m: any) => {
    if (isPreShaped(m, "side")) return m;
    const mediaUrls = m.mediaImageUrls ?? m.media_image_urls;
    const callDirection = m.callDirection ?? m.call_direction;
    const callStatus = m.callStatus ?? m.call_status;
    const replyPreview = m.replyPreview ?? m.reply_preview;
    const readAt = m.readAt ?? m.read_at;
    const deliveredAt = m.deliveredAt ?? m.delivered_at;
    return {
        id: m.id,
        senderId: m.senderId ?? m.sender_id,
        text: m.text || undefined,
        images: mediaUrls?.length ? mediaUrls : undefined,
        audioUri: m.audioUrl ?? m.audio_url ?? undefined,
        audioDuration: m.audioDurationSec ?? m.audio_duration_sec ?? undefined,
        call:
            callDirection || callStatus
                ? {
                      direction: String(callDirection).toLowerCase() === "out" ? "out" : "in",
                      status: String(callStatus || "").toLowerCase(),
                      durationSec: m.callDurationSec ?? m.call_duration_sec ?? 0,
                  }
                : null,
        createdAt: m.createdAt ?? m.created_at,
        replyTo: replyPreview ? { text: replyPreview, side: "them" as const } : null,
        status: readAt ? "read" : deliveredAt ? "delivered" : "sent",
    };
};

const MessagesService = createApi({
    reducerPath: "MessagesService",
    keepUnusedDataFor: 300,
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ["Conversations", "Messages"],
    endpoints: (builder) => ({
        getConversations: builder.query<any, void>({
            async queryFn(_arg, _api, _extra, fetchWithBQ) {
                const res: any = await fetchWithBQ({ url: "/api/messages/conversations", method: "GET" });
                if (res.error) {
                    const userId = (_api.getState() as any)?.userSlice?.userSession?.userId;
                    const cached = await getPersistedQueryData(userId, "MessagesService", "getConversations", undefined);
                    if (cached) return { data: cached as any };
                    return { error: res.error };
                }
                const r = res.data;
                const list = r?.conversations ?? r?.data ?? (Array.isArray(r) ? r : []);
                const converted = list.map(fromApiConversation);
                if (list.every((c: any) => isPreShaped(c, "lastMessage"))) {
                    return { data: { data: converted } };
                }

                const blockedRes: any = await fetchWithBQ({ url: "/api/messages/blocked", method: "GET" });
                const blockedList = blockedRes.data?.users ?? blockedRes.data?.data ?? (Array.isArray(blockedRes.data) ? blockedRes.data : []);
                const blockedIds = new Set(blockedList.map((u: any) => u.id));

                return {
                    data: {
                        data: converted.map((c: any) => (blockedIds.has(c.otherUserId) ? { ...c, blocked: true } : c)),
                    },
                };
            },
            providesTags: ["Conversations"],
        }),

        // Get-or-create: aynı kullanıcıyla var olan konuşma varsa onu döner.
        createConversation: builder.mutation<any, { otherUserId: string }>({
            query: ({ otherUserId }) => ({
                url: "/api/messages/conversations",
                method: "POST",
                body: { other_user_id: otherUserId },
            }),
            transformResponse: (r: any) => ({
                data: fromApiConversation(r?.conversation ?? r?.data ?? r),
            }),
            invalidatesTags: ["Conversations"],
        }),

        getBlockedConversations: builder.query<any, void>({
            query: () => ({ url: "/api/messages/blocked", method: "GET" }),
            transformResponse: (r: any) => {
                const list = r?.users ?? r?.data ?? (Array.isArray(r) ? r : []);
                return {
                    data: list.map((u: any) =>
                        isPreShaped(u, "name")
                            ? { id: u.id, name: u.name, avatar: u.avatar ?? null }
                            : {
                                  id: u.id,
                                  name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Kullanıcı",
                                  avatar: null,
                              },
                    ),
                };
            },
            providesTags: ["Conversations"],
        }),

        blockUser: builder.mutation<any, { targetUserId: string }>({
            query: ({ targetUserId }) => ({
                url: "/api/messages/block",
                method: "POST",
                body: { target_user_id: targetUserId },
            }),
            invalidatesTags: ["Conversations"],
        }),

        unblockUser: builder.mutation<any, { targetUserId: string }>({
            query: ({ targetUserId }) => ({
                url: `/api/messages/block?targetUserId=${targetUserId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Conversations"],
        }),

        getMessages: builder.query<any, string>({
            async queryFn(id, _api, _extra, fetchWithBQ) {
                const res: any = await fetchWithBQ({
                    url: `/api/messages/conversations/${id}/messages?page=1&pageSize=${MESSAGES_PAGE_SIZE}`,
                    method: "GET",
                });
                if (res.error) {
                    const userId = (_api.getState() as any)?.userSlice?.userSession?.userId;
                    const cached = await getPersistedQueryData(userId, "MessagesService", "getMessages", id);
                    if (cached) return { data: cached as any };
                    return { error: res.error };
                }
                const r = res.data;
                const list = r?.messages ?? r?.data ?? (Array.isArray(r) ? r : []);
                return { data: { data: list.map(fromApiMessage), totalPages: r?.pagination?.total_pages ?? 1 } };
            },
            providesTags: (_r, _e, id) => [{ type: "Messages", id }],
            async onQueryStarted(_id, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(MessagesService.util.invalidateTags(["Conversations"]));
                } catch {
                    // yoksay
                }
            },
        }),

        getLastMessage: builder.query<any, string>({
            query: (id) => ({
                url: `/api/messages/conversations/${id}/messages?page=1&pageSize=1`,
                method: "GET",
            }),
            transformResponse: (r: any) => {
                const list = r?.messages ?? r?.data ?? (Array.isArray(r) ? r : []);
                return list.length ? fromApiMessage(list[0]) : null;
            },
            providesTags: (_r, _e, id) => [{ type: "Messages", id }],
        }),

        getMessagesPage: builder.query<any, { id: string; page: number }>({
            query: ({ id, page }) => ({
                url: `/api/messages/conversations/${id}/messages?page=${page}&pageSize=${MESSAGES_PAGE_SIZE}`,
                method: "GET",
            }),
            transformResponse: (r: any) => {
                const list = r?.messages ?? r?.data ?? (Array.isArray(r) ? r : []);
                return { data: list.map(fromApiMessage), totalPages: r?.pagination?.total_pages ?? 1 };
            },
            keepUnusedDataFor: 300,
        }),

        // Backend tam olarak bir içerik türü istiyor: metin | resim(ler) | ses | çağrı kaydı.
        sendMessage: builder.mutation<
            any,
            {
                id: string;
                text?: string;
                images?: string[];
                audio?: { uri: string; durationSec: number } | null;
                replyToId?: string | null;
                call?: {
                    direction: "out" | "in";
                    status: "completed" | "missed" | "cancelled" | "declined";
                    durationSec: number;
                } | null;
            }
        >({
            async queryFn({ id, text, images, audio, replyToId, call }, _api, _extra, fetchWithBQ) {
                const body: Record<string, unknown> = {};
                if (text) body.text = text;

                if (images?.length) {
                    const formData = new FormData();
                    images.forEach((uri, i) => {
                        formData.append("files", {
                            uri,
                            type: "image/jpeg",
                            name: `msg_${Date.now()}_${i}.jpg`,
                        } as any);
                    });
                    const uploadRes: any = await fetchWithBQ({
                        url: "/api/media/upload",
                        method: "POST",
                        body: formData,
                        headers: { "X-Is-Upload": "true" },
                        timeout: UPLOAD_TIMEOUT_MS,
                    });
                    if (uploadRes.error) return { error: uploadRes.error };
                    const uploaded = uploadRes.data?.images ?? uploadRes.data?.data ?? [];
                    body.media_image_ids = uploaded.map((im: any) => im.id);
                }

                if (audio) {
                    const ext = audio.uri.split(".").pop() || "m4a";
                    const formData = new FormData();
                    formData.append("audioFile", {
                        uri: audio.uri,
                        type: ext === "m4a" ? "audio/mp4" : `audio/${ext}`,
                        name: `voice_${Date.now()}.${ext}`,
                    } as any);
                    formData.append("audioDurationSec", String(Math.round(audio.durationSec)));
                    const voiceRes: any = await fetchWithBQ({
                        url: `/api/messages/conversations/${id}/voice`,
                        method: "POST",
                        body: formData,
                        headers: { "X-Is-Upload": "true" },
                        timeout: UPLOAD_TIMEOUT_MS,
                    });
                    if (voiceRes.error) return { error: voiceRes.error };
                    return { data: { data: fromApiMessage(voiceRes.data?.sent_message ?? voiceRes.data) } };
                }

                if (call) {
                    body.call_direction = CALL_DIRECTION_TO_API[call.direction];
                    body.call_status = CALL_STATUS_TO_API[call.status];
                    if (call.status === "completed") body.call_duration_sec = call.durationSec;
                }

                if (replyToId) body.reply_to_message_id = replyToId;

                const res: any = await fetchWithBQ({
                    url: `/api/messages/conversations/${id}/messages`,
                    method: "POST",
                    body,
                });
                if (res.error) return { error: res.error };
                return { data: { data: fromApiMessage(res.data?.sent_message ?? res.data) } };
            },
            invalidatesTags: (_r, _e, { id }) => [{ type: "Messages", id }, "Conversations"],
        }),

        updateConversation: builder.mutation<any, { id: string; blocked?: boolean; muted?: boolean }>({
            query: ({ id, ...patch }) => ({
                url: `/api/messages/conversations/${id}/flags`,
                method: "POST",
                body: patch,
            }),
            invalidatesTags: ["Conversations"],
        }),

        deleteConversation: builder.mutation<any, string>({
            query: (id) => ({
                url: `/api/messages/conversations/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Conversations"],
        }),

        reportConversation: builder.mutation<any, { id: string; reason: number; details?: string }>({
            query: ({ id, reason, details }) => ({
                url: `/api/messages/conversations/${id}/report`,
                method: "POST",
                body: { reason, details },
            }),
        }),

        // Backend'de karşılığı yok (mock-only "geri al" özelliği).
        restoreConversations: builder.mutation<any, void>({
            query: () => ({
                url: "/api/messages/conversations/restore",
                method: "POST",
            }),
            invalidatesTags: ["Conversations"],
        }),

        searchMessages: builder.query<any, string>({
            query: (q) => ({
                url: "/api/messages/search",
                method: "POST",
                body: { query: q, page: 1, page_size: 50 },
            }),
            extraOptions: { retryable: true },
            transformResponse: (r: any) => {
                const list = r?.messages ?? r?.data ?? (Array.isArray(r) ? r : []);
                if (list.every((m: any) => isPreShaped(m, "snippet"))) return { data: list };

                const byConversation: Record<string, { text: string; count: number }> = {};
                list.forEach((m: any) => {
                    const cid = m.conversation_id;
                    if (!cid) return;
                    if (!byConversation[cid]) byConversation[cid] = { text: m.text || "", count: 0 };
                    byConversation[cid].count += 1;
                });
                return {
                    data: Object.entries(byConversation).map(([conversationId, v]) => ({
                        conversationId,
                        snippet: v.text,
                        count: v.count,
                    })),
                };
            },
        }),

        getConversationMedia: builder.query<any, string>({
            query: (id) => ({
                url: `/api/messages/conversations/${id}/media`,
                method: "GET",
            }),
            transformResponse: (r: any) => {
                const raw = r?.data ?? r;
                if (raw && !Array.isArray(raw) && "media" in raw) return { data: raw }; // mock zaten hazır
                const list = r?.media ?? (Array.isArray(raw) ? raw : []);
                const media = list.flatMap((m: any) => m.mediaImageUrls ?? m.media_image_urls ?? []);
                return { data: { media, links: [] } };
            },
        }),

        // Backend'de karşılığı yok (mock-only "geri al" özelliği).
        restoreMessages: builder.mutation<any, void>({
            query: () => ({
                url: "/api/messages/restore",
                method: "POST",
            }),
            invalidatesTags: ["Conversations", "Messages"],
        }),
    }),
});

export const {
    useGetConversationsQuery,
    useCreateConversationMutation,
    useGetBlockedConversationsQuery,
    useBlockUserMutation,
    useUnblockUserMutation,
    useGetMessagesQuery,
    useGetLastMessageQuery,
    useLazyGetMessagesPageQuery,
    useSendMessageMutation,
    useUpdateConversationMutation,
    useDeleteConversationMutation,
    useReportConversationMutation,
    useRestoreConversationsMutation,
    useGetConversationMediaQuery,
    useRestoreMessagesMutation,
    useSearchMessagesQuery,
} = MessagesService;
export default MessagesService;
