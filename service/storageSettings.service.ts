import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

export type DownloadPref = "never" | "wifi" | "wifi_cellular";
export type MediaQuality = "standard" | "hd";

export type StorageSettings = {
    lessDataForCalls: boolean;
    proxyEnabled: boolean;
    proxyHost: string;
    uploadQuality: MediaQuality;
    autoDownloadQuality: MediaQuality;
    autoDownload: { photos: DownloadPref; audio: DownloadPref; video: DownloadPref; documents: DownloadPref };
};

export type StorageUsage = { chatsMb: number; mediaMb: number; documentsMb: number; totalMb: number };

export type NetworkUsage = {
    messagesSentMb: number;
    messagesReceivedMb: number;
    callsSentMb: number;
    callsReceivedMb: number;
    mediaSentMb: number;
    mediaReceivedMb: number;
};

const StorageSettingsService = createApi({
    reducerPath: "StorageSettingsService",
    baseQuery: yuksiBaseQuery,
    tagTypes: ["StorageSettings"],
    endpoints: (builder) => ({
        getStorageSettings: builder.query<StorageSettings, void>({
            query: () => ({ url: "/api/User/storage-settings", method: "GET" }),
            transformResponse: (response: any) => response?.data ?? response,
            providesTags: ["StorageSettings"],
        }),
        updateStorageSettings: builder.mutation<
            any,
            Partial<Omit<StorageSettings, "autoDownload">> & { autoDownload?: Partial<StorageSettings["autoDownload"]> }
        >({
            query: (body) => ({ url: "/api/User/storage-settings", method: "PUT", body }),
            invalidatesTags: ["StorageSettings"],
        }),
        getStorageUsage: builder.query<StorageUsage, void>({
            query: () => ({ url: "/api/User/storage-usage", method: "GET" }),
            transformResponse: (response: any) => response?.data ?? response,
        }),
        getNetworkUsage: builder.query<NetworkUsage, void>({
            query: () => ({ url: "/api/User/network-usage", method: "GET" }),
            transformResponse: (response: any) => response?.data ?? response,
        }),
    }),
});

export const {
    useGetStorageSettingsQuery,
    useUpdateStorageSettingsMutation,
    useGetStorageUsageQuery,
    useGetNetworkUsageQuery,
} = StorageSettingsService;
export default StorageSettingsService;
