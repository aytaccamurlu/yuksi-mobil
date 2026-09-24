import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { Tabs } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Tappable from '@/components/Tappable';
import { useGetConversationsQuery } from '@/service/messages.service';
import { useUserSession } from '@/store/feature/user/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type TabDef = {
  name: string;
  label: string;
  iconOutline: React.ComponentProps<typeof Ionicons>['name'];
  iconFilled: React.ComponentProps<typeof Ionicons>['name'];
};

const TABS: TabDef[] = [
  { name: 'index', label: 'Ana Sayfa', iconOutline: 'home-outline', iconFilled: 'home' },
  { name: 'shipments', label: 'Gönderilerim', iconOutline: 'cube-outline', iconFilled: 'cube' },
  { name: 'messages', label: 'Mesajlar', iconOutline: 'chatbubbles-outline', iconFilled: 'chatbubbles' },
  { name: 'profile', label: 'Profil', iconOutline: 'person-outline', iconFilled: 'person' },
];

const PRIMARY = '#FF5B04';
const ACTIVE_BG = '#FBE7DB';

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const userSession = useUserSession();
  const { data: convData } = useGetConversationsQuery(undefined, { skip: !userSession?.accessToken });

  const unreadCount = useMemo(() => {
    const conversations: any[] = convData?.data || convData || [];
    return conversations.reduce((sum, c) => sum + (!c.blocked && !c.muted ? c.unread || 0 : 0), 0);
  }, [convData]);

  useEffect(() => {
    Notifications.setBadgeCountAsync(unreadCount).catch(() => {});
  }, [unreadCount]);

  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const active = layouts[state.index];
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const measured = useSharedValue(false);

  useEffect(() => {
    if (!active) return;
    if (measured.value) {
      indicatorX.value = withSpring(active.x, { damping: 20, stiffness: 220, mass: 0.6 });
      indicatorWidth.value = withSpring(active.width, { damping: 20, stiffness: 220, mass: 0.6 });
    } else {
      indicatorX.value = active.x;
      indicatorWidth.value = active.width;
      measured.value = true;
    }
  }, [state.index, active, indicatorX, indicatorWidth, measured]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const onTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) =>
      prev[index]?.x === x && prev[index]?.width === width ? prev : { ...prev, [index]: { x, width } },
    );
  };

  return (
    <View
      style={[ts.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}
      pointerEvents="box-none"
    >
      <View style={ts.bar}>
        {!!active && (
          <Animated.View style={[ts.activeTrack, indicatorStyle]}>
            <View style={ts.activePill} />
            <View style={ts.activeIndicator} />
          </Animated.View>
        )}
        {TABS.map((tab) => {
          const routeIdx = state.routes.findIndex((route) => route.name === tab.name);
          const isFocused = routeIdx !== -1 && state.index === routeIdx;
          const showBadge = tab.name === 'messages' && unreadCount > 0;

          const onPress = () => {
            const route = state.routes[routeIdx];
            if (!route) return;

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Tappable
              key={tab.name}
              onPress={onPress}
              onLayout={onTabLayout(routeIdx)}
              style={ts.tabItem}
              activeOpacity={0.7}
            >
              {isFocused && (
                <View style={ts.activeContent}>
                  <View>
                    <Ionicons name={tab.iconFilled} size={20} color={PRIMARY} />
                    {showBadge && (
                      <View style={ts.badge}>
                        <Text style={ts.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                      </View>
                    )}
                  </View>
                  <Animated.Text
                    entering={FadeIn.duration(180)}
                    exiting={FadeOut.duration(120)}
                    style={ts.activeLabel}
                  >
                    {tab.label}
                  </Animated.Text>
                </View>
              )}
              {!isFocused && (
                <View>
                  <Ionicons name={tab.iconOutline} size={24} color={PRIMARY} />
                  {showBadge && (
                    <View style={ts.badge}>
                      <Text style={ts.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </View>
              )}
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}

const ts = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 64,
    paddingHorizontal: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  activePill: {
    position: 'absolute',
    top: 0,
    left: 2,
    right: 2,
    bottom: 0,
    backgroundColor: ACTIVE_BG,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 2,
    right: 2,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: PRIMARY,
  },
  activeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeLabel: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: '400',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shipments" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
