import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { _clearUserSession, _setUserSession } from "@/store/feature/user/authSlice";
import { _clearMatching } from "@/store/feature/jobMatching/slice";
import {
  clearUserSessionFromStorage,
  decodeJWT,
  setUserSessionToStorage,
} from "@/utils/storage";
import { mockBaseQuery } from "./mockBaseQuery";
import { isMockAccessToken } from "./mockData";
import { categorizeUrl, recordNetworkUsage } from "@/utils/networkUsageTracker";

export { isMockAccessToken };

// Düz RegExp = method farketmez; { method, pattern } = yalnızca o method gerçek.
type RealRoute = RegExp | { method: string; pattern: RegExp };

const REAL_API_ROUTES: RealRoute[] = [
  { method: "GET", pattern: /\/api\/Vehicle$/ },
  /\/api\/auth\/register$/,
  /\/api\/auth\/login$/,
  /\/api\/auth\/logout$/,
  /\/api\/auth\/forgot-password$/,
  /\/api\/auth\/change-password$/,
  /\/api\/auth\/reset-password$/,
  /\/api\/User\/profile$/,
  { method: "POST", pattern: /\/api\/User\/avatar$/ },
  /\/api\/User\/location$/,
  /\/api\/user\/saved-routes$/,
  /\/api\/user\/saved-routes\/[0-9a-fA-F-]{36}$/,
  /\/api\/User\/notificationsettings$/,
  /\/api\/User\/notificationsettings\/reset$/,
  { method: "POST", pattern: /\/api\/User\/jobs$/ },
  { method: "GET", pattern: /\/api\/User\/jobs$/ },
  { method: "GET", pattern: /\/api\/User\/jobs\/[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /\/api\/User\/jobs\/price-estimate$/ },
  { method: "POST", pattern: /\/api\/User\/jobs\/cargo-scan$/ },
  { method: "POST", pattern: /\/api\/User\/jobs\/[0-9a-fA-F-]{36}\/assign-carrier$/ },
  { method: "POST", pattern: /\/api\/orders$/ },
  { method: "GET", pattern: /\/api\/orders\/active(\?.*)?$/ },
  { method: "GET", pattern: /\/api\/orders\/completed(\?.*)?$/ },
  { method: "GET", pattern: /\/api\/orders\/[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /\/api\/orders\/[0-9a-fA-F-]{36}\/confirm$/ },
  { method: "GET", pattern: /\/api\/drivers$/ },
  { method: "POST", pattern: /\/api\/media\/upload$/ },
  { method: "GET", pattern: /\/map\/route\/courier\/[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /\/api\/cargo\/chat$/ },
  { method: "GET", pattern: /\/api\/Notifications$/ },
  { method: "DELETE", pattern: /\/api\/Notifications\/[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /\/api\/Notifications\/[0-9a-fA-F-]{36}\/deliver$/ },
  { method: "POST", pattern: /\/api\/Notifications\/[0-9a-fA-F-]{36}\/read$/ },
  { method: "POST", pattern: /\/api\/Notifications\/read-all$/ },
  { method: "GET", pattern: /\/api\/User\/banners$/ },
  { method: "GET", pattern: /\/api\/User\/social-accounts$/ },
  { method: "POST", pattern: /\/api\/User\/social-accounts\/[^/]+$/ },
  { method: "DELETE", pattern: /\/api\/User\/social-accounts\/[^/]+$/ },
  /\/api\/User\/payment-methods$/,
  /\/api\/User\/payment-methods\/[0-9a-fA-F-]{36}$/,
  /\/api\/User\/payment-methods\/[0-9a-fA-F-]{36}\/default$/,
  { method: "GET", pattern: /\/api\/ticarim\/categories$/ },
  { method: "GET", pattern: /\/api\/ticarim\/brands(\?.*)?$/ },
  { method: "GET", pattern: /\/api\/ticarim\/models(\?.*)?$/ },
  { method: "GET", pattern: /\/api\/ticarim\/vehicle-types(\?.*)?$/ },
  { method: "GET", pattern: /\/api\/ticarim\/listings(\?.*)?$/ },
  { method: "POST", pattern: /\/api\/ticarim\/listings$/ },
  { method: "GET", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}\/publish$/ },
  { method: "PUT", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}$/ },
  { method: "DELETE", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}\/passive$/ },
  { method: "POST", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}\/reactivate$/ },
  { method: "POST", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}\/sold$/ },
  { method: "POST", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}\/images$/ },
  { method: "PUT", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}\/images\/reorder$/ },
  { method: "DELETE", pattern: /\/api\/ticarim\/listings\/[0-9a-fA-F-]{36}\/images\/[0-9a-fA-F-]{36}$/ },
  { method: "GET", pattern: /\/api\/ticarim\/my-listings(\?.*)?$/ },
  { method: "GET", pattern: /\/api\/ticarim\/favorites$/ },
  { method: "POST", pattern: /\/api\/ticarim\/favorites\/[0-9a-fA-F-]{36}\/toggle$/ },
  { method: "GET", pattern: /\/api\/User\/presence$/ },
  { method: "PUT", pattern: /\/api\/User\/presence\/heartbeat$/ },
  { method: "PUT", pattern: /\/api\/User\/presence\/mode$/ },
  { method: "GET", pattern: /\/api\/User\/presence\/[0-9a-fA-F-]{36}$/ },
  /\/api\/feedback$/,
  { method: "POST", pattern: /\/api\/client-logs$/ },
  /\/api\/account\/delete-request$/,
  { method: "GET", pattern: /\/api\/complaints$/ },
  { method: "GET", pattern: /\/api\/complaints\/[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /\/api\/complaints$/ },
  { method: "POST", pattern: /\/api\/complaints\/[0-9a-fA-F-]{36}\/messages$/ },
  { method: "GET", pattern: /\/api\/messages\/conversations$/ },
  { method: "POST", pattern: /\/api\/messages\/conversations$/ },
  { method: "GET", pattern: /\/api\/messages\/blocked$/ },
  { method: "POST", pattern: /\/api\/messages\/block$/ },
  { method: "DELETE", pattern: /\/api\/messages\/block(\?|$)/ },
  { method: "GET", pattern: /\/api\/messages\/conversations\/[0-9a-fA-F-]{36}\/messages(\?.*)?$/ },
  { method: "POST", pattern: /\/api\/messages\/conversations\/[0-9a-fA-F-]{36}\/messages$/ },
  { method: "POST", pattern: /\/api\/messages\/conversations\/[0-9a-fA-F-]{36}\/voice$/ },
  { method: "GET", pattern: /\/api\/messages\/conversations\/[0-9a-fA-F-]{36}\/media$/ },
  { method: "POST", pattern: /\/api\/messages\/conversations\/[0-9a-fA-F-]{36}\/flags$/ },
  { method: "DELETE", pattern: /\/api\/messages\/conversations\/[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /\/api\/messages\/search$/ },
  { method: "POST", pattern: /\/api\/messages\/conversations\/[0-9a-fA-F-]{36}\/report$/ },
  { method: "GET", pattern: /\/api\/Calls\/ice-config$/ },
];

export const BASE_URL = "https://main-api.yuksi.tr";
export const UPLOAD_TIMEOUT_MS = 60000;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  timeout: 15000,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any)?.userSlice?.userSession?.accessToken;

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (headers.get("X-Is-Upload")) {
      headers.delete("X-Is-Upload");
    } else {
      headers.set("Content-Type", "application/json");
    }

    return headers;
  },
});

const TRANSIENT_STATUSES = new Set<string | number>(["FETCH_ERROR", "TIMEOUT_ERROR", 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200];

const isAbortError = (error: FetchBaseQueryError) =>
  error.status === "FETCH_ERROR" && String(error.error || "").includes("Abort");

const requestMethod = (args: string | FetchArgs) =>
  (typeof args === "string" ? "GET" : args.method || "GET").toUpperCase();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RetryExtraOptions = { retryable?: boolean } | undefined;

const fetchWithRetry: typeof rawBaseQuery = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const retryable = requestMethod(args) === "GET" || (extraOptions as RetryExtraOptions)?.retryable === true;
  if (!retryable) return result;

  for (const delay of RETRY_DELAYS_MS) {
    const error = result.error;
    if (!error || !TRANSIENT_STATUSES.has(error.status) || isAbortError(error) || api.signal.aborted) break;
    await sleep(delay);
    if (api.signal.aborted) break;
    result = await rawBaseQuery(args, api, extraOptions);
    if (error.status === "TIMEOUT_ERROR") break;
  }

  return result;
};

type TokenPair = { accessToken: string; refreshToken: string };

// 401'i beklemeden, son birkaç dakikaya girince proaktif yenilenir.
const PROACTIVE_REFRESH_MS = 3 * 60 * 1000;

// Shared promise ensures only one refresh call fires even if several requests need it at once.
let refreshPromise: Promise<TokenPair | null> | null = null;

const requestFreshTokens = (refreshToken: string): Promise<TokenPair | null> =>
  fetch(`${BASE_URL}/api/Auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      const d = json?.data ?? json;
      const accessToken = d?.access_token ?? d?.accessToken ?? d?.token;
      if (!accessToken) return null;
      return { accessToken, refreshToken: d?.refresh_token ?? d?.refreshToken ?? refreshToken };
    })
    .catch(() => null);

const applyTokens = async (api: any, pair: TokenPair) => {
  const current = (api.getState() as any)?.userSlice?.userSession;
  if (!current || current.accessToken === pair.accessToken) return;
  const updated = { ...current, accessToken: pair.accessToken, refreshToken: pair.refreshToken };
  await setUserSessionToStorage(updated);
  api.dispatch(_setUserSession(updated));
};

export const runRefresh = (api: any, refreshToken: string): Promise<TokenPair | null> => {
  if (!refreshPromise) {
    refreshPromise = requestFreshTokens(refreshToken).then(async (pair) => {
      if (pair) await applyTokens(api, pair);
      refreshPromise = null;
      return pair;
    });
  }
  return refreshPromise;
};

const dropSession = async (api: any): Promise<void> => {
  await clearUserSessionFromStorage();
  api.dispatch(_clearUserSession());
  api.dispatch(_clearMatching());
};

const tokenExpiringSoon = (token?: string | null) => {
  if (!token || isMockAccessToken(token)) return false;
  const exp = decodeJWT(token)?.exp;
  return typeof exp === "number" && exp * 1000 - Date.now() < PROACTIVE_REFRESH_MS;
};

const BACKGROUND_REFRESH_WINDOW_MS = 30 * 60 * 1000;

export const ensureFreshTokenForBackground = async (api: any): Promise<void> => {
  const session = api.getState()?.userSlice?.userSession;
  if (!session?.refreshToken || isMockAccessToken(session.accessToken)) return;
  const exp = decodeJWT(session.accessToken)?.exp;
  const expiringSoon = typeof exp !== "number" || exp * 1000 - Date.now() < BACKGROUND_REFRESH_WINDOW_MS;
  if (!expiringSoon) return;
  await runRefresh(api, session.refreshToken).catch(() => null);
};

const realBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const before = (api.getState() as any)?.userSlice?.userSession;
  const tokenUsed = before?.accessToken;

  if (before?.refreshToken && tokenExpiringSoon(tokenUsed)) {
    await runRefresh(api, before.refreshToken);
  }

  let result = await fetchWithRetry(args, api, extraOptions);

  if (result.error?.status !== 401) return result;

  const s = (api.getState() as any)?.userSlice?.userSession;

  // Mock hesabın sahte tokenı gerçek backend'de her zaman 401 döner — oturumu kapatma.
  if (isMockAccessToken(s?.accessToken)) return result;

  if (!s?.refreshToken) {
    await dropSession(api);
    return result;
  }

  let retryResult: typeof result;
  if (s.accessToken && s.accessToken !== tokenUsed) {
    retryResult = await rawBaseQuery(args, api, extraOptions);
  } else {
    const pair = await runRefresh(api, s.refreshToken);
    if (!pair) {
      await dropSession(api);
      return result;
    }
    retryResult = await rawBaseQuery(args, api, extraOptions);
  }

  if (retryResult.error?.status === 401) {
    await dropSession(api);
  }

  return retryResult;
};

const isRealApiRoute = (args: string | FetchArgs) => {
  const url = typeof args === "string" ? args : args.url;
  const method = (typeof args === "string" ? "GET" : args.method || "GET").toUpperCase();
  return REAL_API_ROUTES.some((route) =>
    route instanceof RegExp ? route.test(url) : route.method.toUpperCase() === method && route.pattern.test(url),
  );
};

const responseBytes = (result: { data?: unknown; meta?: unknown }) => {
  const headerLength = (result.meta as any)?.response?.headers?.get?.("content-length");
  if (headerLength) return Number(headerLength) || 0;
  return result.data ? JSON.stringify(result.data).length : 0;
};

const trackNetworkUsage = (args: string | FetchArgs, result: { data?: unknown; meta?: unknown }) => {
  const url = typeof args === "string" ? args : args.url;
  const category = categorizeUrl(url);
  if (!category) return;
  const body = typeof args === "string" ? undefined : args.body;
  const sentBytes = body && typeof body !== "object" ? String(body).length : body ? JSON.stringify(body).length : 0;
  void recordNetworkUsage(category, sentBytes, responseBytes(result));
};

export const yuksiBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const token = (api.getState() as any)?.userSlice?.userSession?.accessToken;

  const result = isMockAccessToken(token)
    ? await mockBaseQuery(args, api, extraOptions)
    : isRealApiRoute(args)
      ? await realBaseQuery(args, api, extraOptions)
      : await mockBaseQuery(args, api, extraOptions);

  trackNetworkUsage(args, result);
  return result;
};
