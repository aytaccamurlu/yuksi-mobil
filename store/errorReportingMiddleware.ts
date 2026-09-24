import { isRejected, type Middleware } from '@reduxjs/toolkit';
import ClientLogsService from '@/service/clientLogs.service';
import { isMockAccessToken } from '@/service/mockData';
import { buildClientLogPayload } from '@/utils/clientLogPayload';
import { shouldReport } from '@/utils/errorReportThrottle';

const IGNORED_ENDPOINTS = new Set(['sendFeedback', 'sendClientLog']);
const CONNECTIVITY_STATUSES = new Set(['FETCH_ERROR', 'TIMEOUT_ERROR']);

export const errorReportingMiddleware: Middleware = (api) => (next) => (action) => {
    const result = next(action);

    if (!isRejected(action)) return result;

    const anyAction: any = action;
    const endpointName = String(anyAction.meta?.arg?.endpointName || '');
    if (!endpointName || IGNORED_ENDPOINTS.has(endpointName)) return result;

    const err: any = anyAction.payload ?? anyAction.error;
    const status = err?.status ?? err?.originalStatus;
    if (status === 401 || CONNECTIVITY_STATUSES.has(status)) return result;

    const token = (api.getState() as any)?.userSlice?.userSession?.accessToken;
    if (isMockAccessToken(token)) return result;

    const signature = `api:${endpointName}:${status ?? 'unknown'}`;
    if (!shouldReport(signature)) return result;

    const request = anyAction.meta?.baseQueryMeta?.request;
    const requestUrl = typeof request?.url === 'string' ? request.url.replace(/\?.*$/, '') : undefined;

    const payload = buildClientLogPayload('api_error', `${endpointName} isteği başarısız`, {
        endpoint: requestUrl ?? endpointName,
        requestMethod: typeof request?.method === 'string' ? request.method.toUpperCase() : undefined,
        httpStatus: typeof status === 'number' ? status : undefined,
        stackTrace: JSON.stringify(err?.data ?? err?.message ?? err ?? {}).slice(0, 500),
    });
    api.dispatch(ClientLogsService.endpoints.sendClientLog.initiate(payload) as any);

    return result;
};
