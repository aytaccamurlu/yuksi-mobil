import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

const DeleteAccountService = createApi({
    reducerPath: "DeleteAccountService",
    baseQuery: yuksiBaseQuery,
    endpoints: (builder) => ({
        requestAccountDeletion: builder.mutation<any, { reason: string; details?: string }>({
            query: (body) => ({ url: "/api/account/delete-request", method: "POST", body }),
        }),
    }),
});

export const { useRequestAccountDeletionMutation } = DeleteAccountService;
export default DeleteAccountService;
