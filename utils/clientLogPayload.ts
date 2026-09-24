import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ClientLogPayload, ClientLogSeverity } from '@/service/clientLogs.service';
import type { IssueKind } from '@/utils/errorReportThrottle';

const APP_VERSION = Constants.expoConfig?.version ?? 'unknown';
const PLATFORM = `${Platform.OS} ${Platform.Version}`;

const SEVERITY_BY_KIND: Record<IssueKind, ClientLogSeverity> = {
    crash: 'error',
    js_error: 'error',
    api_error: 'warning',
};

export type ClientLogExtra = Partial<Omit<ClientLogPayload, 'severity' | 'message' | 'platform' | 'appVersion'>>;

export const buildClientLogPayload = (kind: IssueKind, message: string, extra: ClientLogExtra = {}): ClientLogPayload => ({
    severity: SEVERITY_BY_KIND[kind],
    message: message.slice(0, 1000),
    errorType: kind,
    platform: PLATFORM,
    appVersion: APP_VERSION,
    ...extra,
    stackTrace: extra.stackTrace?.slice(0, 4000),
});
