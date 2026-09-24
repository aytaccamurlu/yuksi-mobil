import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

type NewComplaint = {
    conversationId?: string | null;
    targetName?: string;
    targetAvatar?: string | null;
    reason: string;
    description?: string;
    images?: string[];
};

// Backend'in bu uçlar için dönüş şeması swagger'da tanımlı değil (sadece "200 OK").
// İstek gövdesi snake_case olduğuna göre cevap da öyle kabul edip, mock katmanının
// ürettiği camelCase şekle burada çeviriyoruz — CLAUDE.md'deki "p.first_name || p.firstName"
// savunmacı erişim kuralına uygun, her iki yazımı da destekliyor.
const mapUpdate = (u: any) => {
    let from: string;
    if (typeof u?.is_admin === "boolean") {
        from = u.is_admin ? "support" : "user";
    } else {
        const raw = String(u?.from ?? u?.sender ?? u?.author_type ?? u?.role ?? "support").toLowerCase();
        from = raw.includes("system") ? "system" : raw.includes("user") || raw.includes("customer") ? "user" : "support";
    }
    return {
        id: u?.id,
        from,
        text: u?.text ?? u?.message ?? u?.content ?? "",
        createdAt: u?.createdAt ?? u?.created_at,
    };
};

const mapComplaint = (raw: any) => {
    if (!raw) return raw;
    const updates = (raw.updates ?? raw.messages ?? []).map(mapUpdate);
    return {
        id: raw.id,
        conversationId: raw.conversationId ?? raw.conversation_id ?? null,
        targetName: raw.targetName ?? raw.target_name,
        targetAvatar: raw.targetAvatar ?? raw.target_avatar ?? null,
        reason: raw.reason,
        description: raw.description,
        images: raw.images ?? [],
        status: raw.status,
        createdAt: raw.createdAt ?? raw.created_at,
        updates,
        lastUpdate: updates[updates.length - 1],
    };
};

const ComplaintsService = createApi({
    reducerPath: "ComplaintsService",
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ["Complaints"],
    endpoints: (builder) => ({
        getComplaints: builder.query<any, void>({
            query: () => ({ url: "/api/complaints", method: "GET" }),
            transformResponse: (r: any) => {
                const list = r?.complaints ?? r?.data ?? (Array.isArray(r) ? r : []);
                return { data: list.map(mapComplaint) };
            },
            providesTags: ["Complaints"],
        }),

        getComplaint: builder.query<any, string>({
            query: (id) => ({ url: `/api/complaints/${id}`, method: "GET" }),
            transformResponse: (r: any) => ({ data: mapComplaint(r?.complaint ?? r?.data ?? r) }),
            providesTags: (_r, _e, id) => [{ type: "Complaints", id }],
        }),

        createComplaint: builder.mutation<any, NewComplaint>({
            query: (body) => ({
                url: "/api/complaints",
                method: "POST",
                body: {
                    conversation_id: body.conversationId ?? null,
                    target_name: body.targetName || "Kullanıcı",
                    target_avatar: body.targetAvatar || "",
                    reason: body.reason,
                    description: body.description || "",
                    images: body.images ?? [],
                },
            }),
            transformResponse: (r: any) => ({ data: mapComplaint(r?.complaint ?? r?.data ?? r) }),
            invalidatesTags: ["Complaints"],
        }),

        sendComplaintMessage: builder.mutation<any, { id: string; text: string }>({
            query: ({ id, text }) => ({
                url: `/api/complaints/${id}/messages`,
                method: "POST",
                body: { text },
            }),
            invalidatesTags: (_r, _e, { id }) => [{ type: "Complaints", id }, "Complaints"],
        }),

        restoreComplaints: builder.mutation<any, void>({
            query: () => ({ url: "/api/complaints/restore", method: "POST" }),
            invalidatesTags: ["Complaints"],
        }),
    }),
});

export const {
    useGetComplaintsQuery,
    useGetComplaintQuery,
    useCreateComplaintMutation,
    useSendComplaintMessageMutation,
    useRestoreComplaintsMutation,
} = ComplaintsService;

export default ComplaintsService;
