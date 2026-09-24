import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "react-native-reanimated";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

import { Provider } from "react-redux";

import ActiveCallBadge from "@/components/ActiveCallBadge";
import AppSplash from "@/components/AppSplash";
import { markAppSplashDone } from "@/utils/appSplashState";
import ErrorBoundary from "@/components/ErrorBoundary";
import MatchingBadge from "@/components/MatchingBadge";
import { useCallHubConnection } from "@/hooks/useCallHubConnection";
import { useIncomingCallListener } from "@/hooks/useIncomingCallListener";
import { useNotificationRuntime } from "@/hooks/useNotificationRuntime";
import { usePresenceReporting } from "@/hooks/usePresenceReporting";
import { isMockAccessToken } from "@/service/api";
import { useGetProfileQuery } from "@/service/profile.service";
import { store } from "@/store/app";
import { setOnboardingDone, setUserSession } from "@/store/feature/user/actions";
import { useOnboardingDone, useUserSession } from "@/store/feature/user/hooks";
import { loadHapticsEnabled } from "@/utils/haptics";
import { hydratePendingCallLogs } from "@/utils/pendingCallLog";
import { hydrateQueryCache, startQueryCachePersistence } from "@/utils/queryCachePersistence";
import { checkOnboardingDone, clearAutoReloginCredentials, getUserSessionFromStorage, setUserSessionToStorage } from "@/utils/storage";
import { initializeGlobalErrorReporting } from "@/utils/errorReporting";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";

initializeGlobalErrorReporting();


function SessionProvider({ children }: { children: React.ReactNode }) {
  const userSession = useUserSession();

  const { data: profileData } = useGetProfileQuery(undefined, {
    skip: !userSession?.accessToken || isMockAccessToken(userSession?.accessToken) || !!userSession?.first_name,
  });

  usePresenceReporting(!!userSession?.accessToken);
  useNotificationRuntime(!!userSession?.accessToken);
  useCallHubConnection(!!userSession?.accessToken);
  useIncomingCallListener(!!userSession?.accessToken);

  useEffect(() => {
    if (!userSession?.accessToken) return;

    let updated = false;
    let newSession = { ...userSession };

    if (profileData && (profileData?.data || profileData)) {
      const p = profileData?.data || profileData;
      const newFirstName = p.first_name || p.firstName;
      const newLastName = p.last_name || p.lastName;
      const newPhone = p.phone || p.phone_number;
      const newPhotoUrl = p.photo_url || p.photoUrl || p.avatar_url || p.avatarUrl;

      if (
        newFirstName !== userSession.first_name ||
        newLastName !== userSession.last_name ||
        newPhone !== userSession.phone ||
        newPhotoUrl !== userSession.photo_url
      ) {
        newSession.first_name = newFirstName;
        newSession.last_name = newLastName;
        newSession.phone = newPhone;
        newSession.photo_url = newPhotoUrl;
        updated = true;
      }
    }


    if (updated) {
      setUserSession(newSession);
      setUserSessionToStorage(newSession);
    }
  }, [profileData, userSession?.accessToken]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const userSession = useUserSession();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const onboardingDone = useOnboardingDone();

  const colorScheme = useColorScheme();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await loadHapticsEnabled();
        await clearAutoReloginCredentials();
        const session = await getUserSessionFromStorage();
        if (session) {
          setUserSession(session);
          await hydrateQueryCache();
          await hydratePendingCallLogs();
        }
        setOnboardingDone(await checkOnboardingDone());
      } catch (error) {
        console.error("Failed to load user session", error);
      } finally {
        setIsReady(true);
      }
    };
    checkAuth();
    return startQueryCachePersistence();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup  = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";
    const inTabs       = segments[0] === "(tabs)";

    if (!userSession && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (userSession && !onboardingDone && !inOnboarding && (inTabs || inAuthGroup)) {
      // Giriş sonrası (auth) veya tabs'a girildiğinde onboarding'e yönlendir
      router.replace("/onboarding");
    } else if (userSession && onboardingDone && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [userSession, segments, isReady, onboardingDone]);

  if (!isReady) {
    return null;
  }

  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)"       />
          <Stack.Screen name="chat"         />
          <Stack.Screen name="auth"         />
          <Stack.Screen name="onboarding"   />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="settings"     />
          <Stack.Screen name="messages/[id]" />
          <Stack.Screen name="messages/media/[id]" />
          <Stack.Screen name="messages/contact/[id]" />
          <Stack.Screen
            name="call/[id]"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen
            name="job-matching/[id]"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="ticarim/map/[id]"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              sheetExpandsWhenScrolledToEdge: false,
            }}
          />
          <Stack.Screen name="complaints" />
          <Stack.Screen name="complaint/new" />
          <Stack.Screen name="complaint/assistant" />
          <Stack.Screen name="complaint/[id]" />
        </Stack>
        {segments[0] !== "job-matching" && <MatchingBadge />}
        <ActiveCallBadge />
        <StatusBar style="auto" />
      </ThemeProvider>
    </SessionProvider>
  );
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Provider store={store}>
          <BottomSheetModalProvider>
            <RootLayoutNav />
            {!splashDone && (
              <AppSplash
                onFinish={() => {
                  setSplashDone(true);
                  markAppSplashDone();
                }}
              />
            )}
          </BottomSheetModalProvider>
        </Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
