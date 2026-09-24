import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

const TrackingService = createApi({
    reducerPath: 'TrackingService',
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    endpoints: (builder) => ({
        getCourierRoute: builder.query<any, string>({
            query: (orderId) => `/map/route/courier/${orderId}`,
        }),
    }),
});

export const {
    useGetCourierRouteQuery,
} = TrackingService;

export default TrackingService;
