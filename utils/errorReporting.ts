import { store } from '@/store/app';
import ClientLogsService from '@/service/clientLogs.service';
import { isMockAccessToken } from '@/service/mockData';
import { buildClientLogPayload, type ClientLogExtra } from '@/utils/clientLogPayload';
import { shouldReport, type IssueKind } from '@/utils/errorReportThrottle';

export const sendClientLog = (kind: IssueKind, message: string, extra: ClientLogExtra = {}) => {
    const token = (store.getState() as any)?.userSlice?.userSession?.accessToken;
    if (isMockAccessToken(token)) return;

    store
        .dispatch(ClientLogsService.endpoints.sendClientLog.initiate(buildClientLogPayload(kind, message, extra)) as any)
        .unwrap?.()
        .catch(() => {});
};

export const reportIssue = (kind: IssueKind, summary: string, detail?: string) => {
    const signature = `${kind}:${summary}`.slice(0, 200);
    if (!shouldReport(signature)) return;
    sendClientLog(kind, summary, { stackTrace: detail });
};

let installed = false;

export const initializeGlobalErrorReporting = () => {
    if (installed) return;
    installed = true;

    const errorUtils: any = (global as any).ErrorUtils;
    if (!errorUtils?.setGlobalHandler) return;

    const defaultHandler = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        reportIssue(
            isFatal ? 'crash' : 'js_error',
            error instanceof Error ? `${error.name}: ${error.message}` : String(error),
            error?.stack,
        );
        defaultHandler?.(error, isFatal);
    });
};
