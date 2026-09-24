import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

const SocialAccountsService = createApi({
    reducerPath: "SocialAccountsService",
    baseQuery: yuksiBaseQuery,
    tagTypes: ["SocialAccounts"],
    endpoints: (builder) => ({
        getConnectedAccounts: builder.query<any, void>({
            query: () => ({
                url: "/api/User/social-accounts",
                method: "GET",
            }),
            transformResponse: (r: any) => {
                if (Array.isArray(r?.accounts)) {
                    return r.accounts.map((a: any) => ({
                        provider: a.provider,
                        connected: !!a.is_connected,
                        accountLabel: null,
                    }));
                }
                return r?.data ?? r ?? [];
            },
            providesTags: ["SocialAccounts"],
        }),

        connectAccount: builder.mutation<any, string>({
            query: (provider) => ({
                url: `/api/User/social-accounts/${provider}`,
                method: "POST",
            }),
            invalidatesTags: ["SocialAccounts"],
        }),

        disconnectAccount: builder.mutation<any, string>({
            query: (provider) => ({
                url: `/api/User/social-accounts/${provider}`,
                method: "DELETE",
            }),
            invalidatesTags: ["SocialAccounts"],
        }),
    }),
});

export const {
    useGetConnectedAccountsQuery,
    useConnectAccountMutation,
    useDisconnectAccountMutation,
} = SocialAccountsService;

export default SocialAccountsService;
