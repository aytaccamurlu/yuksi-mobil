import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

export type InAppAlertStyle = "none" | "banners" | "alerts";

export type NotificationSettings = {
    messages: boolean;
    shipments: boolean;
    sounds: boolean;
    notificationSoundId: string;
    callSound: boolean;
    showCallSound: boolean;
    callSoundId: string;
    inApp: { alertStyle: InAppAlertStyle; sounds: boolean; vibration: boolean };
};

// Gerçek backend snake_case + tekil alertStyle (`banner`/`alert`) kullanıyor;
// mock ise doğrudan uygulamanın camelCase şeklini. İkisini de tolere eder.
const ALERT_STYLE_FROM_API: Record<string, InAppAlertStyle> = { none: "none", banner: "banners", alert: "alerts" };
const ALERT_STYLE_TO_API: Record<InAppAlertStyle, string> = { none: "none", banners: "banner", alerts: "alert" };

const fromApiSettings = (raw: any): NotificationSettings => {
    const inApp = raw?.in_app ?? raw?.inApp ?? {};
    return {
        messages: raw?.messages,
        shipments: raw?.shipments,
        sounds: raw?.sounds,
        notificationSoundId: raw?.notification_sound_id ?? raw?.notificationSoundId,
        callSound: raw?.call_sound ?? raw?.callSound,
        showCallSound: raw?.show_call_sound ?? raw?.showCallSound,
        callSoundId: raw?.call_sound_id ?? raw?.callSoundId,
        inApp: {
            alertStyle: ALERT_STYLE_FROM_API[inApp.alert_style] ?? inApp.alertStyle ?? "banners",
            sounds: inApp.sounds,
            vibration: inApp.vibration,
        },
    };
};

const toApiSettings = (
    settings: Partial<Omit<NotificationSettings, "inApp">> & { inApp?: Partial<NotificationSettings["inApp"]> },
) => ({
    messages: settings.messages,
    shipments: settings.shipments,
    sounds: settings.sounds,
    notification_sound_id: settings.notificationSoundId,
    call_sound: settings.callSound,
    show_call_sound: settings.showCallSound,
    call_sound_id: settings.callSoundId,
    in_app: settings.inApp
        ? {
              alert_style: ALERT_STYLE_TO_API[settings.inApp.alertStyle as InAppAlertStyle],
              sounds: settings.inApp.sounds,
              vibration: settings.inApp.vibration,
          }
        : undefined,
});

const NotificationSettingsService = createApi({
    reducerPath: "NotificationSettingsService",
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ["NotificationSettings"],
    endpoints: (builder) => ({
        getNotificationSettings: builder.query<NotificationSettings, void>({
            query: () => ({ url: "/api/User/notificationsettings", method: "GET" }),
            transformResponse: (response: any) => fromApiSettings(response?.data ?? response),
            providesTags: ["NotificationSettings"],
        }),
        // Ekranlar kısmi bir patch gönderir ama çağıran taraf bunu her zaman
        // güncel `settings` ile birleştirip tam nesne yollar (bkz. çağrı yerleri) —
        // backend'in PUT'u kısmi patch'i güvenilir şekilde birleştirmiyor.
        updateNotificationSettings: builder.mutation<
            any,
            Partial<Omit<NotificationSettings, "inApp">> & { inApp?: Partial<NotificationSettings["inApp"]> }
        >({
            query: (body) => ({ url: "/api/User/notificationsettings", method: "PUT", body: toApiSettings(body) }),
            invalidatesTags: ["NotificationSettings"],
        }),
        resetNotificationSettings: builder.mutation<any, void>({
            query: () => ({ url: "/api/User/notificationsettings/reset", method: "POST" }),
            invalidatesTags: ["NotificationSettings"],
        }),
    }),
});

export const {
    useGetNotificationSettingsQuery,
    useUpdateNotificationSettingsMutation,
    useResetNotificationSettingsMutation,
} = NotificationSettingsService;
export default NotificationSettingsService;
