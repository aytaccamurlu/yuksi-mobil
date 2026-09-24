import { useEffect } from "react";
import {
    initializeNotificationRuntime,
    startAuthenticatedNotifications,
    stopAuthenticatedNotifications,
} from "@/utils/notifications/initializeNotifications";

export function useNotificationRuntime(enabled: boolean) {
    useEffect(() => {
        void initializeNotificationRuntime();
    }, []);

    useEffect(() => {
        if (!enabled) {
            stopAuthenticatedNotifications();
            return;
        }
        void startAuthenticatedNotifications();
        return () => {
            stopAuthenticatedNotifications();
        };
    }, [enabled]);
}
