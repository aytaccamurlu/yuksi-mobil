import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useSendHeartbeatMutation } from "@/service/presence.service";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function usePresenceReporting(enabled: boolean) {
    const [sendHeartbeat] = useSendHeartbeatMutation();

    useEffect(() => {
        if (!enabled) return;

        let interval: ReturnType<typeof setInterval> | null = null;

        const startHeartbeat = () => {
            sendHeartbeat();
            if (interval) return;
            interval = setInterval(() => sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
        };

        const stopHeartbeat = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        const onAppStateChange = (state: AppStateStatus) => {
            if (state === "active") startHeartbeat();
            else stopHeartbeat();
        };

        onAppStateChange(AppState.currentState);
        const sub = AppState.addEventListener("change", onAppStateChange);
        return () => {
            sub.remove();
            stopHeartbeat();
        };
    }, [enabled, sendHeartbeat]);
}
