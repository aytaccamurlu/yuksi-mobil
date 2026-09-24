import SocialAuthButtons from "@/components/SocialAuthButtons";
import { useSendLoginRequestMutation } from "@/service/auth.service";
import { isAccountDeletionRequested, MOCK_USER, makeMockToken } from "@/service/mockData";
import { loginWithSession } from "@/store/feature/user/actions";
import { translateAuthError } from "@/utils/authErrors";
import { decodeJWT, setUserSessionToStorage } from "@/utils/storage";
import { validateEmail, validateRequiredPassword } from "@/utils/validation";
import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Tappable from '@/components/Tappable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const LOGO_BLOCK = 118; // logo (106) + alt boşluk (12)

export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwErr, setPwErr]       = useState<string | null>(null);
  const [formErr, setFormErr]   = useState<string | null>(null);
  const [showPw, setShowPw]     = useState(false);

  const [login, { isLoading }] = useSendLoginRequestMutation();
  const insets = useSafeAreaInsets();

  // Klavye açılınca: üstteki logo toplanır, beyaz kart yukarı kayar ve
  // "Kayıt ol" satırı gizlenir. Klavye kapanınca hepsi geri gelir.
  const kb = useSharedValue(0); // 0 = klavye kapalı, 1 = açık
  const [bottomH, setBottomH] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const anim = (to: number) => { kb.value = withTiming(to, { duration: 260, easing: Easing.out(Easing.cubic) }); };
    const show = Keyboard.addListener(showEvt, () => anim(1));
    const hide = Keyboard.addListener(hideEvt, () => anim(0));
    return () => { show.remove(); hide.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBottomLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && !bottomH) setBottomH(h);
  };

  const logoStyle = useAnimatedStyle(() => {
    const shown = 1 - kb.value;
    return {
      height: LOGO_BLOCK * shown,
      opacity: shown,
      transform: [{ scale: 0.9 + shown * 0.1 }],
    };
  });

  const bottomStyle = useAnimatedStyle(() => {
    const shown = 1 - kb.value;
    if (!bottomH) return { opacity: shown };
    return { height: bottomH * shown, opacity: shown };
  });

  const handleLogin = async () => {
    const eErr = validateEmail(email);
    const pErr = validateRequiredPassword(password);
    setEmailErr(eErr);
    setPwErr(pErr);
    setFormErr(null);
    if (eErr || pErr) return;

    try {
      const response = await login({ email: email.trim(), password }).unwrap();

      if (response?.success === false) {
        throw new Error(response?.message || "Giriş başarısız");
      }

      const d = response?.data ?? response;
      const accessToken  = d?.access_token  ?? d?.accessToken  ?? d?.token;
      const refreshToken = d?.refresh_token ?? d?.refreshToken;

      if (!accessToken) throw new Error("Token alınamadı, lütfen tekrar deneyin");

      const decoded = decodeJWT(accessToken);
      const userId  = decoded?.userId || decoded?.sub;

      const session = { accessToken, refreshToken, userId, email };
      await setUserSessionToStorage(session);
      loginWithSession(session);
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        translateAuthError(err?.data?.error) ||
        err?.message ||
        `Hata kodu: ${err?.status ?? "bilinmiyor"}`;
      setFormErr(msg);
    }
  };

  // Logoya 6sn basılı tutunca mock hesabına giriş yapar — geliştirici kısayolu.
  const handleMockLogin = async () => {
    setFormErr(null);

    if (await isAccountDeletionRequested()) {
      setFormErr("Bu hesap için silme talebi alınmıştır. Bu hesaba tekrar giriş yapılamaz.");
      return;
    }

    const accessToken = makeMockToken();
    const decoded = decodeJWT(accessToken);
    const session = {
      accessToken,
      refreshToken: makeMockToken({ typ: "refresh" }),
      userId: decoded?.userId ?? decoded?.sub,
      email: MOCK_USER.email,
      first_name: MOCK_USER.first_name,
      last_name: MOCK_USER.last_name,
      phone: MOCK_USER.phone,
      photo_url: MOCK_USER.photo_url ?? undefined,
    };
    await setUserSessionToStorage(session);
    loginWithSession(session);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Turuncu header ── */}
          <View style={s.header}>
            <Animated.View style={[s.logoBlock, logoStyle]}>
              <Tappable onLongPress={handleMockLogin} delayLongPress={6000} activeOpacity={1}>
                <Image
                  source={require("@/assets/images/yüksi-white.png")}
                  style={s.logoImg}
                  resizeMode="contain"
                />
              </Tappable>
            </Animated.View>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={s.welcomeBold}>Merhaba, </Text>
              <Text style={s.welcomeLight}>Yüksi'ye hoş geldin.</Text>
            </View>
          </View>

          {/* ── Beyaz form kartı ── */}
          <View style={[s.card, { paddingBottom: 16 + insets.bottom }]}>

            {/* E-mail */}
            <View style={s.field}>
              <Text style={s.label}>E-mail</Text>
              <TextInput
                style={[s.input, !!emailErr && s.inputError]}
                placeholder="ornek@eposta.com"
                placeholderTextColor="#CCC"
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailErr) setEmailErr(null); if (formErr) setFormErr(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              {!!emailErr && <Text style={s.err}>{emailErr}</Text>}
            </View>

            {/* Şifre */}
            <View style={s.field}>
              <Text style={s.label}>Şifre</Text>
              <View style={s.pwWrap}>
                <TextInput
                  style={[s.input, !!pwErr && s.inputError, { paddingRight: 44 }]}
                  placeholder="Şifreniz"
                  placeholderTextColor="#CCC"
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (pwErr) setPwErr(null); if (formErr) setFormErr(null); }}
                  secureTextEntry={!showPw}
                />
                <Tappable style={s.eyeBtn} onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  <Feather name={showPw ? "eye-off" : "eye"} size={18} color="#9CA3AF" />
                </Tappable>
              </View>
              {!!pwErr && <Text style={s.err}>{pwErr}</Text>}
            </View>

            <Link href="/auth/forgot-password" asChild>
              <Tappable style={s.forgotWrap} hitSlop={8}>
                <Text style={s.forgotText}>Şifremi unuttum</Text>
              </Tappable>
            </Link>

            {!!formErr && <Text style={[s.err, s.formErr]}>{formErr}</Text>}

            {/* Giriş Yap */}
            <Tappable haptic="medium"
              style={s.btn}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={s.btnText}>
                {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Text>
            </Tappable>

            <SocialAuthButtons />

            {/* Alt link — klavye açıkken gizlenir */}
            <Animated.View style={[{ overflow: "hidden" }, bottomStyle]}>
              <View onLayout={onBottomLayout} style={s.signupRow}>
                <Text style={s.signupText}>Hesabın yok mu? </Text>
                <Link href="/auth/register" asChild>
                  <Tappable>
                    <Text style={s.signupLink}>Kayıt ol</Text>
                  </Tappable>
                </Link>
              </View>
            </Animated.View>
          </View>

          {/* ── Kampanya alanı ── */}
          <View style={s.campaign}>
            <Text style={s.campaignText}>
              Moto kurye kampanyasını{"\n"}kaçırma!
            </Text>
            <Image
              source={require("@/assets/images/motor.png")}
              style={s.motorImg}
              resizeMode="contain"
            />
          </View>
          <View style={{ backgroundColor: CAMPAIGN_BG, height: insets.bottom }} />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY   = "#FF5B04";
const INPUT_BG  = "#FFF4EE";
const CAMPAIGN_BG = "#FFFFFF";

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PRIMARY },

  // Header
  header: {
    backgroundColor: PRIMARY,
    paddingLeft: 28,
    paddingRight: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  logoBlock: { height: LOGO_BLOCK, alignItems: "center", justifyContent: "flex-end", overflow: "hidden" },
  logoImg: { width: 106, height: 106, marginBottom: 12 },
  welcomeBold:  { color: "white", fontSize: 24, fontWeight: "900", lineHeight: 34 },
  welcomeLight: { color: "white", fontSize: 14, fontWeight: "400", lineHeight: 19 },

  // Kart
  card: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingTop: 28,
  },

  // Form
  label: { color: "#4B5563", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "transparent",
  },
  field: { marginBottom: 18 },
  pwWrap: { justifyContent: "center" },
  forgotWrap: { alignSelf: "flex-end", marginBottom: 16 },
  forgotText: { color: PRIMARY, fontSize: 13, fontWeight: "600" },
  eyeBtn: { position: "absolute", right: 12, height: "100%", justifyContent: "center", paddingHorizontal: 4 },
  inputError: { borderColor: "#DC2626" },
  err: { color: "#DC2626", fontSize: 12, fontWeight: "500", marginLeft: 4, marginTop: 6 },
  formErr: { marginTop: 0, marginBottom: 12, textAlign: "center" },

  // Buton
  btn: {
    backgroundColor: PRIMARY,
    borderRadius: 39,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 17 },

  // Alt link
  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  signupText: { color: "#6B7280", fontSize: 14 },
  signupLink: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
  },

  // Kampanya
  campaign: {
    backgroundColor: CAMPAIGN_BG,
    flex: 1,
    minHeight: 320,
    paddingTop: 4,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  campaignText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 32,
    textAlign: "center",
    marginBottom: 16,
  },
  motorImg: {
    width: 200,
    height: 200,
  },
});
