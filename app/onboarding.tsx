import { setOnboardingDone } from "@/store/feature/user/actions";
import { markOnboardingDone } from "@/utils/storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Tappable from '@/components/Tappable';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: W } = Dimensions.get("window");

const CARD_W = Math.min(310, W - 36);
const CARD_H = 550;
const IMG_H  = Math.round(CARD_H * 0.47);
const GAP    = 14;
const SNAP   = CARD_W + GAP;
const INSET  = (W - CARD_W) / 2;

const EASING = Easing.bezier(0.42, 0, 0.36, 0.99);
const DURATION = 300;

const SLIDES = [
  {
    key: "load",
    title: "Yük Oluştur",
    description:
      'Yüksi uygulamasını açın, "Yük Oluştur"a tıklayın, taşıma için uygun aracı seçin, yükünüzün konumunu ve özelliklerini girin; sistem sizi en yakın taşıyıcıyla anında eşleştirir. Yüksi ile yükleriniz güvenle taşınır, zamandan tasarruf eder ve süreci kolayca yönetirsiniz.',
    image: require("@/assets/images/onboarding1.png"),
  },
  {
    key: "kanguru",
    title: "Kanguru",
    description:
      "Kanguru, Yüksi uygulamasında yüklerin alınacağı ve bırakılacağı yerleri detaylı konum bilgisiyle haritada gösterir, taşıyıcılara doğru ve hızlı şekilde iletilmesini sağlar. Ayrıca, hem sohbet edebilir hem de sadece sesli komut vererek yük oluşturabilirsiniz. Yani Kanguru, yük yönetimini hem hızlı hem de pratik hâle getirir.",
    image: require("@/assets/images/onboarding2.png"),
  },
  {
    key: "ticarim",
    title: "Ticarim",
    description:
      "Aracınızın fotoğrafını yükleyin, ilan detaylarını girin ve yayınlayın. İlanınız doğrudan ticari araçlarla iş yapan alıcıların ekranına düşer, böylece aracınızı hızlı ve doğru kitleye ulaştırırsınız!",
    image: require("@/assets/images/onboarding3.png"),
  },
];

function AnimatedDot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 24 : 8);

  React.useEffect(() => {
    width.value = withTiming(active ? 24 : 8, { duration: DURATION, easing: EASING });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    height: 8,
    borderRadius: 4,
    backgroundColor: active ? "#FF5B04" : "#E5E7EB",
  }));

  return <Animated.View style={style} />;
}

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const listRef = useRef<FlatList>(null);

  const handleFinish = async () => {
    await markOnboardingDone();
    setOnboardingDone(true);
    router.replace("/(tabs)");
  };

  const goToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(index, SLIDES.length - 1));
    listRef.current?.scrollToOffset({ offset: clamped * SNAP, animated: true });
    setActiveIndex(clamped);
  };

  // Keep the dots / "Başla" in sync with the scroll position (fires while
  // dragging and after the snap settles), not just on momentum end.
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
    const clamped = Math.max(0, Math.min(idx, SLIDES.length - 1));
    setActiveIndex((prev) => (prev === clamped ? prev : clamped));
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={s.safe}>

      {/* Logo */}
      <View style={s.logoRow}>
        <Image
          source={require("@/assets/images/yüksi-vector-orange.png")}
          style={s.logo}
          resizeMode="contain"
        />
      </View>

      {/* Carousel */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        snapToInterval={SNAP}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: INSET, paddingVertical: 12 }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.key}
        style={{ flexGrow: 0 }}
        renderItem={({ item, index }) => (
          <View
            style={[
              s.cardShadow,
              {
                width: CARD_W,
                height: CARD_H,
                marginRight: index < SLIDES.length - 1 ? GAP : 0,
              },
            ]}
          >
            <View style={s.cardInner}>
              <View style={[s.imgWrap, { height: IMG_H }]}>
                <Image
                  source={item.image}
                  style={s.illustration}
                  resizeMode="contain"
                />
              </View>
              <View style={s.textWrap}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.description}>{item.description}</Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* Footer: dots + buton */}
      <View style={s.footer}>
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <Tappable
              key={i}
              onPress={() => goToIndex(i)}
              activeOpacity={0.7}
              hitSlop={{ top: 16, bottom: 16, left: 14, right: 14 }}
            >
              <AnimatedDot active={i === activeIndex} />
            </Tappable>
          ))}
        </View>

        <View style={s.btnWrap}>
          {isLast ? (
            <Tappable style={s.btn} onPress={handleFinish} activeOpacity={0.85}>
              <Text style={s.btnText}>Başla</Text>
            </Tappable>
          ) : (
            <Tappable style={s.btnPlaceholder} onPress={handleFinish} activeOpacity={0.7}>
              <Text style={s.skipText}>Geç</Text>
            </Tappable>
          )}
        </View>
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  logoRow: { alignItems: "center", paddingTop: 4, paddingBottom: 2 },
  logo: { width: 290, height: 96 },

  cardShadow: {
    borderRadius: 24,
    backgroundColor: "#FFF0E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  cardInner: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFF0E8",
  },

  imgWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
  },
  illustration: { width: "85%", height: "100%" },

  textWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 13.5,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },

  footer: { alignItems: "center", paddingTop: 28, paddingBottom: 8 },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },

  btnWrap: { alignItems: "center" },
  btnPlaceholder: { height: 52, justifyContent: "center", paddingHorizontal: 24 },
  skipText: { color: "#9CA3AF", fontSize: 15, fontWeight: "600" },
  btn: {
    backgroundColor: "#FF5B04",
    width: 186,
    height: 46,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5B04",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: { color: "white", fontSize: 17, fontWeight: "700" },
});
