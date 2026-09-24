import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

const FeedbackService = createApi({
    reducerPath: "FeedbackService",
    baseQuery: yuksiBaseQuery,
    endpoints: (builder) => ({
        sendFeedback: builder.mutation<any, { message: string; rating?: number }>({
            query: (body) => ({ url: "/api/feedback", method: "POST", body }),
        }),
    }),
});

export const { useSendFeedbackMutation } = FeedbackService;
export default FeedbackService;
