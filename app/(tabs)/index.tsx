import ListingCard, { HomeListing, ListingCardSkeleton } from "@/components/ListingCard";
import RemoteImage from "@/components/RemoteImage";
import Skeleton from "@/components/Skeleton";
import VehicleInfoModal from "@/components/VehicleInfoModal";
import { BASE_URL } from "@/service/api";
import { useGetVehiclesQuery } from "@/service/createLoad.service";
import { useGetBannersQuery } from "@/service/banners.service";
import { TicarimCategory } from "@/service/mockData";
import { useGetNotificationsQuery } from "@/service/notifications.service";
import { useGetListingsQuery } from "@/service/ticarim.service";
import WebViewModal from "@/components/WebViewModal";
import HomeTourModal, { TourTarget } from "@/components/HomeTourModal";
import { resolveWebsiteUrl } from "@/utils/inAppBrowser";
import { checkHomeTourDone, markHomeTourDone } from "@/utils/storage";
import { isAppSplashDone, onAppSplashDone } from "@/utils/appSplashState";
import { CATEGORY_KEY_TO_ID } from "@/utils/ticarim";
import { FOREGROUND_POLL_INTERVAL_MS } from "@/constants/polling";
import { goToCreateLoadOrActiveMatching } from "@/store/feature/jobMatching/actions";
import { useUserSession } from "@/store/feature/user/hooks";
import { useAvatarSource } from "@/hooks/useAvatarSource";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Tappable from '@/components/Tappable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from "react-native-safe-area-context";

const { width: W } = Dimensions.get("window");

const PRIMARY = "#FF5B04";

const BANNER_CARD_W = W - 72;
const BANNER_GAP = 12;
const BANNER_H = 168;
const BANNER_AUTOPLAY_MS = 4500;
const DOT_EASING = Easing.bezier(0.42, 0, 0.36, 0.99);
const DOT_DURATION = 280;

function AnimatedDot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 20 : 7);

  useEffect(() => {
    width.value = withTiming(active ? 20 : 7, { duration: DOT_DURATION, easing: DOT_EASING });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    height: 7,
    borderRadius: 4,
    backgroundColor: active ? PRIMARY : "#D1D5DB",
  }));

  return <Animated.View style={style} />;
}

const VEHICLE_CHIPS: { key: TicarimCategory; label: string }[] = [
  { key: "motorcycle", label: "Moto Kurye" },
  { key: "minivan", label: "Minivan" },
  { key: "panelvan", label: "Panelvan" },
  { key: "pickup", label: "Kamyonet" },
  { key: "truck", label: "Kamyon" },
];

const ListingSeparator = () => <View style={{ width: 12 }} />;

const CATEGORY_ICONS: Record<TicarimCategory, any> = {
  motorcycle: require("@/assets/images/motorcycle.png"),
  minivan: require("@/assets/images/minivan.png"),
  panelvan: require("@/assets/images/panelvan.png"),
  pickup: require("@/assets/images/pickup.png"),
  truck: require("@/assets/images/truck.png"),
};

export default function HomeScreen() {
  const router = useRouter();
  const userSession = useUserSession();

  const [activeBanner, setActiveBanner] = useState(0);
  const [bannerPage, setBannerPage] = useState<{ url: string; title?: string } | null>(null);
  const [showHomeTour, setShowHomeTour] = useState(false);
  const [tourTargets, setTourTargets] = useState<TourTarget[]>([]);
  const ticarimBtnRef = useRef<View>(null);
  const yukOlusturBtnRef = useRef<View>(null);
  const kanguruBtnRef = useRef<View>(null);
  const rootRef = useRef<View>(null);
  // Çipler artık filtre değil — İlanlar her zaman bu sabit kategoriyi gösterir.
  const [activeChip] = useState<TicarimCategory>("motorcycle");
  const [infoChip, setInfoChip] = useState<TicarimCategory | null>(null);
  const bannerRef = useRef<ScrollView>(null);

  const tourEligibleRef = useRef(false);
  const tourCheckedRef = useRef(false);
  const tourShownRef = useRef(false);
  const lastMeasureRef = useRef<TourTarget[] | null>(null);

  useEffect(() => {
    checkHomeTourDone().then((done) => {
      tourEligibleRef.current = !done;
      tourCheckedRef.current = true;
    });
  }, []);

  const sameTargets = (a: TourTarget[], b: TourTarget[]) =>
    a.length === b.length && a.every((t, i) => Math.abs(t.y - b[i].y) < 1 && Math.abs(t.x - b[i].x) < 1);

  const measure = (ref: React.RefObject<View | null>) =>
    new Promise<TourTarget>((resolve) => {
      ref.current?.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
    });

  const measureActionButtons = useCallback(() => {
    requestAnimationFrame(() => {
      Promise.all([measure(rootRef), measure(ticarimBtnRef), measure(yukOlusturBtnRef), measure(kanguruBtnRef)]).then(
        ([root, ...next]) => {
          const calibrated = next.map((t) => ({ ...t, x: t.x - root.x, y: t.y - root.y }));
          if (!calibrated.every((t) => t.width > 0 && t.height > 0)) return;

          const stable = !!lastMeasureRef.current && sameTargets(lastMeasureRef.current, calibrated);
          lastMeasureRef.current = calibrated;
          setTourTargets(calibrated);

          if (stable && tourEligibleRef.current && !tourShownRef.current && isAppSplashDone()) {
            tourShownRef.current = true;
            setShowHomeTour(true);
          }
        },
      );
    });
  }, []);

  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      const doneChecking = tourCheckedRef.current && !tourEligibleRef.current;
      if (doneChecking || attempts > 20) {
        clearInterval(interval);
        return;
      }
      measureActionButtons();
    }, 400);
    return () => clearInterval(interval);
  }, [measureActionButtons]);

  useEffect(() => onAppSplashDone(measureActionButtons), [measureActionButtons]);

  const handleHomeTourDone = () => {
    setShowHomeTour(false);
    void markHomeTourDone();
  };

  const { data: vehiclesData } = useGetVehiclesQuery();
  const vehicles: any[] = vehiclesData?.data || vehiclesData || [];
  const infoVehicle = vehicles.find((v) => v.template === infoChip);
  const infoVehicleName = VEHICLE_CHIPS.find((c) => c.key === infoChip)?.label;
  const chipLabel = useCallback(
    (chip: { key: TicarimCategory; label: string }) => chip.label,
    [],
  );

  const { data: notificationsData } = useGetNotificationsQuery();
  const notificationCount = (() => {
    const raw = notificationsData?.data || notificationsData || [];
    const list = Array.isArray(raw) ? raw : [];
    return list.filter((n: any) => !(n.is_seen ?? n.isSeen ?? false)).length;
  })();

  const getFirstName = () => userSession?.first_name?.trim() || "";
  const getFullName = () => {
    const f = userSession?.first_name?.trim();
    const l = userSession?.last_name?.trim();
    return [f, l].filter(Boolean).join(" ") || "Kullanıcı";
  };

  const formatAvatarUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    if (url.startsWith("/")) return `${BASE_URL}${url}`;
    return `data:image/jpeg;base64,${url}`;
  };

  const getInitials = () => {
    const a = userSession?.first_name?.trim()?.[0] || "";
    const b = userSession?.last_name?.trim()?.[0] || "";
    return `${a}${b}`.toUpperCase() || "K";
  };

  const { uri: avatarUri, onError: onAvatarError } = useAvatarSource(
    formatAvatarUrl(userSession?.photo_url),
    userSession?.local_photo_uri,
  );

  const { data: bannersData, isLoading: bannersLoading } = useGetBannersQuery(undefined, {
    pollingInterval: FOREGROUND_POLL_INTERVAL_MS,
  });
  const banners: { id: string; imageUrl: string; link: string; title?: string }[] =
    bannersData?.data || bannersData || [];

  useEffect(() => {
    if (!bannersLoading) measureActionButtons();
  }, [bannersLoading, measureActionButtons]);

  const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopBannerAutoplay = () => {
    if (autoplayTimer.current) {
      clearInterval(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  };

  const startBannerAutoplay = () => {
    stopBannerAutoplay();
    if (banners.length <= 1) return;
    autoplayTimer.current = setInterval(() => {
      setActiveBanner((prev) => {
        const next = (prev + 1) % banners.length;
        bannerRef.current?.scrollTo({ x: next * (BANNER_CARD_W + BANNER_GAP), animated: true });
        return next;
      });
    }, BANNER_AUTOPLAY_MS);
  };

  useEffect(() => {
    startBannerAutoplay();
    return stopBannerAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length]);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (BANNER_CARD_W + BANNER_GAP));
    setActiveBanner(Math.max(0, Math.min(i, banners.length - 1)));
    startBannerAutoplay();
  };

  const handleBannerPress = (link?: string, title?: string) => {
    const url = link ? resolveWebsiteUrl(link) : null;
    if (!url) return;
    stopBannerAutoplay();
    setBannerPage({ url, title });
  };

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const pos = await Location.getLastKnownPositionAsync() || await Location.getCurrentPositionAsync({});
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        // yoksay
      }
    })();
  }, []);

  const { data: ticarimListingsData, isLoading: listingsLoading } = useGetListingsQuery({
    categoryId: CATEGORY_KEY_TO_ID[activeChip],
    latitude: coords?.latitude,
    longitude: coords?.longitude,
  });
  const listings: HomeListing[] = useMemo(() => {
    const raw: any[] = ticarimListingsData || [];
    // Kullanıcıya en yakın ilanlar önce gösterilir.
    const sorted = [...raw].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return sorted.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      location: item.location,
      photoUri: item.photos?.[0],
      fallbackImage: CATEGORY_ICONS[item.category as TicarimCategory] || CATEGORY_ICONS[activeChip],
    }));
  }, [ticarimListingsData, activeChip]);

  const listingKeyExtractor = useCallback((item: HomeListing) => item.id, []);
  const openListingOnMap = useCallback(
    (item: HomeListing) => router.push({ pathname: '/ticarim/map/[id]', params: { id: item.id, category: activeChip } }),
    [router, activeChip],
  );
  const renderListing = useCallback(
    ({ item }: { item: HomeListing }) => <ListingCard listing={item} onPress={() => openListingOnMap(item)} />,
    [openListingOnMap],
  );

  return (
    <SafeAreaView ref={rootRef} style={s.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Tappable
          style={s.headerLeft}
          activeOpacity={0.7}
          onPress={() => router.navigate("/profile")}
        >
          <View style={s.avatarWrap}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={s.avatar}
                resizeMode="cover"
                onError={onAvatarError}
              />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarFallbackText}>{getInitials()}</Text>
              </View>
            )}
          </View>
          <Text style={s.greeting}>
            Hoşgeldin,{" "}
            <Text style={s.greetingName}>{getFirstName() || getFullName()}</Text>
          </Text>
        </Tappable>
        <Tappable
          style={s.bellWrap}
          activeOpacity={0.8}
          onPress={() => router.push("/notifications")}
        >
          <Feather name="bell" size={20} color={PRIMARY} />
          {notificationCount > 0 && (
            <View style={s.bellBadge}>
              <Text style={s.bellBadgeText}>
                {notificationCount > 9 ? "9+" : notificationCount}
              </Text>
            </View>
          )}
        </Tappable>
      </View>

      {/* ── Beyaz sayfa ── */}
      <View style={s.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Araç tipi çipleri (bilgi amaçlı, seçili durumları yok) */}
          <View style={s.chipsRow}>
            {VEHICLE_CHIPS.map((chip) => (
              <Tappable
                key={chip.key}
                style={[s.chip, s.chipIdle]}
                onPress={() => setInfoChip(chip.key)}
                activeOpacity={0.85}
              >
                <Text style={[s.chipText, s.chipTextIdle]} numberOfLines={1}>
                  {chipLabel(chip)}
                </Text>
              </Tappable>
            ))}
          </View>

          {/* Banner carousel */}
          {bannersLoading ? (
            <View style={s.bannerRow}>
              <Skeleton style={s.bannerCard} />
            </View>
          ) : banners.length === 0 ? (
            <View style={s.bannerRow}>
              <View style={s.bannerPlaceholder}>
                <Text style={s.bannerPlaceholderText}>Backend gerekli</Text>
              </View>
            </View>
          ) : (
            <>
              <ScrollView
                ref={bannerRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={BANNER_CARD_W + BANNER_GAP}
                snapToAlignment="start"
                onScrollBeginDrag={stopBannerAutoplay}
                onMomentumScrollEnd={onBannerScroll}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.bannerRow}
              >
                {banners.map((item) => (
                  <Tappable
                    key={item.id}
                    style={s.bannerCard}
                    activeOpacity={0.9}
                    onPress={() => handleBannerPress(item.link, item.title)}
                  >
                    <RemoteImage uri={item.imageUrl} style={s.bannerImage} resizeMode="cover" />
                  </Tappable>
                ))}
              </ScrollView>

              {/* Dots */}
              <View style={s.dotsRow}>
                {banners.map((_, i) => (
                  <AnimatedDot key={i} active={i === activeBanner} />
                ))}
              </View>
            </>
          )}

          {/* Aksiyon butonları */}
          <View style={s.actionsRow} onLayout={measureActionButtons}>
            <Tappable ref={ticarimBtnRef} style={s.actionBtn} activeOpacity={0.85} onPress={() => router.push('/ticarim')}>
              <Feather name="briefcase" size={19} color="#FFFFFF" />
              <Text style={s.actionText} numberOfLines={1}>Ticarim</Text>
            </Tappable>
            <Tappable
              ref={yukOlusturBtnRef}
              style={s.actionBtn}
              activeOpacity={0.85}
              onPress={() => goToCreateLoadOrActiveMatching(router)}
            >
              <Feather name="box" size={19} color="#FFFFFF" />
              <Text style={s.actionText} numberOfLines={1}>Yük Oluştur</Text>
            </Tappable>
            <Tappable
              ref={kanguruBtnRef}
              style={s.actionBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/chat")}
            >
              <Image
                source={require("@/assets/kanguru.png")}
                style={s.actionKangaroo}
                resizeMode="contain"
              />
              <Text style={s.actionText} numberOfLines={1}>Kanguru</Text>
            </Tappable>
          </View>

          {/* İlanlar */}
          <Text style={s.sectionTitle}>İlanlar</Text>
          {listingsLoading ? (
            <View style={[s.listRow, { flexDirection: 'row' }]}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ marginRight: 12 }}>
                  <ListingCardSkeleton />
                </View>
              ))}
            </View>
          ) : listings.length === 0 ? (
            <Text style={s.empty}>Bu kategoride ilan yok.</Text>
          ) : (
            <FlatList
              data={listings}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={listingKeyExtractor}
              contentContainerStyle={s.listRow}
              ItemSeparatorComponent={ListingSeparator}
              renderItem={renderListing}
              initialNumToRender={4}
              windowSize={5}
            />
          )}
        </ScrollView>
      </View>

      <VehicleInfoModal
        visible={infoChip !== null}
        onClose={() => setInfoChip(null)}
        name={infoVehicleName}
        icon={infoChip ? CATEGORY_ICONS[infoChip] : undefined}
        info={infoVehicle?.capacityInfo}
      />

      <WebViewModal
        visible={bannerPage !== null}
        url={bannerPage?.url ?? null}
        title={bannerPage?.title}
        onClose={() => { setBannerPage(null); startBannerAutoplay(); }}
      />

      <HomeTourModal visible={showHomeTour} targets={tourTargets} onDone={handleHomeTourDone} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PRIMARY },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: PRIMARY,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: PRIMARY, fontSize: 16, fontWeight: "800" },
  greeting: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", flexShrink: 1 },
  greetingName: { fontSize: 16, fontWeight: "500", color: "#FFFFFF" },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { fontSize: 9, color: "#FFFFFF", fontWeight: "800" },

  /* Beyaz sayfa */
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
  },

  /* Çipler */
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 4,
  },
  chip: {
    flex: 1,
    height: 32,
    paddingHorizontal: 2,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  chipIdle: { backgroundColor: "#FFFFFF" },
  chipText: { fontSize: 9.5, fontWeight: "700" },
  chipTextIdle: { color: PRIMARY },

  /* Banner */
  bannerRow: {
    paddingHorizontal: (W - BANNER_CARD_W) / 2,
    paddingTop: 24,
    gap: BANNER_GAP,
  },
  bannerCard: {
    width: BANNER_CARD_W,
    height: BANNER_H,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    overflow: "hidden",
  },
  bannerImage: { width: BANNER_CARD_W, height: BANNER_H },
  bannerPlaceholder: {
    width: BANNER_CARD_W,
    height: BANNER_H,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    backgroundColor: "#F5F6FC",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerPlaceholderText: { color: "#9CA3AF", fontSize: 15, fontWeight: "700" },

  /* Dots */
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 14,
  },

  /* Aksiyon butonları */
  actionsRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },
  actionBtn: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionKangaroo: { width: 22, height: 22 },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", flexShrink: 1 },

  /* İlanlar */
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 },
  empty: { fontSize: 13, color: "#9CA3AF", paddingHorizontal: 20, paddingVertical: 20 },
});
