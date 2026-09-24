import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

export type PresenceMode = "auto" | "always_online" | "always_offline";

type PresenceStatus = { mode: PresenceMode; isOnline: boolean };

const toPresenceStatus = (response: any): PresenceStatus => {
    const d = response?.data ?? response ?? {};
    return {
        mode: (d.mode ?? "auto") as PresenceMode,
        isOnline: !!(d.isOnline ?? d.is_online),
    };
};

const PresenceService = createApi({
    reducerPath: "PresenceService",
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ["Presence"],
    endpoints: (builder) => ({
        getPresence: builder.query<PresenceStatus, void>({
            query: () => ({ url: "/api/User/presence", method: "GET" }),
            transformResponse: toPresenceStatus,
            providesTags: ["Presence"],
        }),
        getUserPresence: builder.query<{ userId: string; isOnline: boolean }, string>({
            query: (userId) => ({ url: `/api/User/presence/${userId}`, method: "GET" }),
            transformResponse: (response: any) => {
                const d = response?.data ?? response ?? {};
                return {
                    userId: d.userId ?? d.user_id,
                    isOnline: !!(d.isOnline ?? d.is_online),
                };
            },
        }),
        sendHeartbeat: builder.mutation<PresenceStatus, void>({
            query: () => ({ url: "/api/User/presence/heartbeat", method: "PUT" }),
            transformResponse: toPresenceStatus,
        }),
        setPresenceMode: builder.mutation<PresenceStatus, { mode: PresenceMode }>({
            query: (body) => ({ url: "/api/User/presence/mode", method: "PUT", body }),
            transformResponse: toPresenceStatus,
            invalidatesTags: ["Presence"],
        }),
    }),
});

export const {
    useGetPresenceQuery,
    useGetUserPresenceQuery,
    useSendHeartbeatMutation,
    useSetPresenceModeMutation,
} = PresenceService;
export default PresenceService;
