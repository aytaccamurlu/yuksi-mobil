import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

const NotificationsService = createApi({
    reducerPath: "NotificationsService",
    keepUnusedDataFor: 300,
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ["Notifications"],
    endpoints: (builder) => ({
        getNotifications: builder.query<any, void>({
            query: () => ({
                url: "/api/Notifications",
                method: "GET",
            }),
            transformResponse: (response: any) => response?.notifications ?? response?.data ?? (Array.isArray(response) ? response : []),
            providesTags: ["Notifications"],
        }),

        deleteNotifications: builder.mutation<any, { ids: string[] }>({
            queryFn: async ({ ids }, _api, _extra, baseQuery) => {
                const results = await Promise.all(
                    ids.map((id) => baseQuery({ url: `/api/Notifications/${id}`, method: "DELETE" })),
                );
                const failed = results.find((r) => r.error);
                if (failed) return { error: failed.error as any };
                return { data: { success: true } };
            },
            invalidatesTags: ["Notifications"],
        }),

        restoreNotifications: builder.mutation<any, void>({
            query: () => ({
                url: "/api/User/notifications/restore",
                method: "POST",
            }),
            invalidatesTags: ["Notifications"],
        }),

        markNotificationDelivered: builder.mutation<any, string>({
            query: (id) => ({ url: `/api/Notifications/${id}/deliver`, method: "POST" }),
        }),

        markNotificationRead: builder.mutation<any, string>({
            query: (id) => ({ url: `/api/Notifications/${id}/read`, method: "POST" }),
            invalidatesTags: ["Notifications"],
        }),

        markAllNotificationsRead: builder.mutation<any, void>({
            query: () => ({ url: "/api/Notifications/read-all", method: "POST" }),
            invalidatesTags: ["Notifications"],
        }),
    }),
});

export const {
    useGetNotificationsQuery,
    useDeleteNotificationsMutation,
    useRestoreNotificationsMutation,
    useMarkNotificationDeliveredMutation,
    useMarkNotificationReadMutation,
    useMarkAllNotificationsReadMutation,
} = NotificationsService;
export default NotificationsService;
