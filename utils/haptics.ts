import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const HAPTICS_KEY = "haptics_enabled";

export type HapticStyle = "light" | "medium" | "success" | "warning" | "none";

let enabled = true;

export const loadHapticsEnabled = async () => {
  try {
    enabled = (await AsyncStorage.getItem(HAPTICS_KEY)) !== "false";
  } catch {
    enabled = true;
  }
  return enabled;
};

export const isHapticsEnabled = () => enabled;

export const setHapticsEnabled = async (value: boolean) => {
  enabled = value;
  try {
    await AsyncStorage.setItem(HAPTICS_KEY, value ? "true" : "false");
  } catch {
  }
};

export const haptic = (style: HapticStyle = "light") => {
  if (!enabled || style === "none" || Platform.OS === "web") return;
  try {
    if (style === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (style === "warning") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else {
      Haptics.impactAsync(
        style === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    }
  } catch {
  }
};
