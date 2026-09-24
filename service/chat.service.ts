import { createApi } from "@reduxjs/toolkit/query/react";
import { UPLOAD_TIMEOUT_MS, yuksiBaseQuery } from "./api";

type CargoChatResult = { response: string; sessionId: string | null };

const ChatService = createApi({
    reducerPath: 'ChatService',
    baseQuery: yuksiBaseQuery,
    endpoints: (builder) => ({
        sendMessage: builder.mutation<CargoChatResult, { message: string; sessionId?: string | null; images?: string[] }>({
            async queryFn({ message, sessionId, images }, _api, _extra, fetchWithBQ) {
                let imageUrls: string[] = [];

                if (images?.length) {
                    const formData = new FormData();
                    images.forEach((uri, i) => {
                        formData.append("files", {
                            uri,
                            type: "image/jpeg",
                            name: `kanguru_${Date.now()}_${i}.jpg`,
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
                    imageUrls = uploaded.map((im: any) => im.url).filter(Boolean);
                }

                const chatRes: any = await fetchWithBQ({
                    url: '/api/cargo/chat',
                    method: 'POST',
                    body: { message, session_id: sessionId ?? null, image_urls: imageUrls.length ? imageUrls : null },
                });
                if (chatRes.error) return { error: chatRes.error };

                const d = chatRes.data?.data ?? chatRes.data ?? {};
                return {
                    data: {
                        response: d.response ?? d.reply ?? '',
                        sessionId: d.session_id ?? d.sessionId ?? null,
                    },
                };
            },
        }),
    }),
});

export const {
    useSendMessageMutation,
} = ChatService;

export default ChatService;
