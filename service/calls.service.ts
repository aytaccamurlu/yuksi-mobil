import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

export type IceServer = {
    urls: string;
    username?: string;
    credential?: string;
};

const toIceServers = (response: any): IceServer[] => {
    const list = response?.iceServers ?? response?.ice_servers ?? [];
    if (!Array.isArray(list)) return [];
    return list.map((s: any) => {
        const entry: IceServer = { urls: s.urls ?? s.url };
        if (s.username) entry.username = s.username;
        if (s.credential) entry.credential = s.credential;
        return entry;
    });
};

const CallsService = createApi({
    reducerPath: "CallsService",
    baseQuery: yuksiBaseQuery,
    endpoints: (builder) => ({
        getIceConfig: builder.query<IceServer[], void>({
            query: () => ({ url: "/api/Calls/ice-config", method: "GET" }),
            transformResponse: toIceServers,
        }),
    }),
});

export const { useLazyGetIceConfigQuery } = CallsService;
export default CallsService;
