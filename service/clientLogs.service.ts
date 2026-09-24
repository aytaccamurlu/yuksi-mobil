import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

export type ClientLogSeverity = "error" | "warning" | "info";

export type ClientLogPayload = {
    severity: ClientLogSeverity;
    message: string;
    stackTrace?: string;
    errorType?: string;
    endpoint?: string;
    requestMethod?: string;
    httpStatus?: number;
    screen?: string;
    platform: string;
    appVersion: string;
};

const ClientLogsService = createApi({
    reducerPath: "ClientLogsService",
    baseQuery: yuksiBaseQuery,
    endpoints: (builder) => ({
        sendClientLog: builder.mutation<any, ClientLogPayload>({
            query: (body) => ({ url: "/api/client-logs", method: "POST", body }),
        }),
    }),
});

export default ClientLogsService;
