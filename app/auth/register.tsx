import PasswordChecklist from "@/components/PasswordChecklist";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import UserAgreementModal from "@/components/UserAgreementModal";
import { useSendRegisterRequestMutation } from "@/service/auth.service";
import { loginWithSession } from "@/store/feature/user/actions";
import { translateAuthError } from "@/utils/authErrors";
import { decodeJWT, setUserSessionToStorage } from "@/utils/storage";
import { validateEmail, validateName, validatePassword, validatePhone } from "@/utils/validation";
import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  // yüksi-white.png için
  KeyboardAvoidingView,
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

const AGREEMENT_LABELS = ["Kullanım Şartları'nı", "KVKK Aydınlatma Metni'ni", "Açık Rıza Beyanı'nı"];

const formatPhoneInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
    .filter(Boolean)
    .join(" ");
};

export default function RegisterScreen() {
  const [firstName, setFirstName]       = useState("");
  const [lastName, setLastName]         = useState("");
  const [email, setEmail]               = useState("");
  const [phoneNumber, setPhoneNumber]   = useState("");
  const [password, setPassword]         = useState("");
  const [accepted, setAccepted]         = useState([false, false, false]);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementIndex, setAgreementIndex] = useState(0);
  const [showPw, setShowPw]             = useState(false);

  const allAccepted = accepted.every(Boolean);
  const [errs, setErrs] = useState<Record<string, string | null>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const nextAgreementTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(nextAgreementTimer.current), []);

  const handleAgreementAccepted = (next: boolean[]) => {
    setAccepted(next);
    const remaining = next.findIndex((a) => !a);
    if (remaining === -1) return;
    nextAgreementTimer.current = setTimeout(() => {
      setAgreementIndex(remaining);
      setAgreementOpen(true);
    }, 1000);
  };

  const [register, { isLoading }] = useSendRegisterRequestMutation();
  const insets = useSafeAreaInsets();

  const kb = useSharedValue(0); // 0 = klavye kapalı, 1 = açık

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const anim = (to: number) => { kb.value = withTiming(to, { duration: 260, easing: Easing.out(Easing.cubic) }); };
    const show = Keyboard.addListener(showEvt, () => anim(1));
    const hide = Keyboard.addListener(hideEvt, () => anim(0));
    return () => { show.remove(); hide.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => {
    const shown = 1 - kb.value;
    return {
      height: LOGO_BLOCK * shown,
      opacity: shown,
      transform: [{ scale: 0.9 + shown * 0.1 }],
    };
  });

  const clearErr = (key: string) => {
    if (errs[key]) setErrs((p) => ({ ...p, [key]: null }));
    if (formErr) setFormErr(null);
  };

  const handleRegister = async () => {
    const next: Record<string, string | null> = {
      firstName: validateName(firstName, "İsim"),
      lastName: validateName(lastName, "Soy isim"),
      phone: validatePhone(phoneNumber),
      email: validateEmail(email),
      password: validatePassword(password, { email, firstName, lastName }),
      agreed: allAccepted ? null : "Devam etmek için tüm onay metinlerini kabul etmelisin",
    };
    setErrs(next);
    setFormErr(null);
    if (Object.values(next).some(Boolean)) return;

    try {
      const digits = phoneNumber.replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "");
      const fullPhoneNumber = `+90${digits}`;
      const response = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: `90${digits}`,
        password,
      }).unwrap();

      if (response?.success === false) throw new Error(response?.message || "Kayıt başarısız");

      const d = response?.data ?? response;
      const accessToken  = d?.access_token  ?? d?.accessToken  ?? d?.token;
      const refreshToken = d?.refresh_token ?? d?.refreshToken;
      if (!accessToken) throw new Error("Kayıt tamamlanamadı, lütfen tekrar deneyin");

      const decoded  = decodeJWT(accessToken);
      const userId   = decoded?.userId ?? decoded?.sub;

      const session = { accessToken, refreshToken, userId, first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), phone: fullPhoneNumber };
      await setUserSessionToStorage(session);
      loginWithSession(session);
    } catch (err: any) {
      const errors = err?.data?.errors;
      let msg = err?.data?.message || translateAuthError(err?.data?.error) || err?.message || "Bir hata oluştu";
      if (Array.isArray(errors) && errors.length > 0) {
        msg = errors.map((e: any) => e.message || e.msg || JSON.stringify(e)).join("\n");
      }
      setFormErr(msg);
    }
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
              <Image
                source={require("@/assets/images/yüksi-white.png")}
                style={s.logoImg}
                resizeMode="contain"
              />
            </Animated.View>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={s.welcomeBold}>Merhaba, </Text>
              <Text style={s.welcomeLight}>Yüksi'ye hoş geldin.</Text>
            </View>
          </View>

          {/* ── Beyaz form kartı ── */}
          <View style={[s.card, { paddingBottom: 40 + insets.bottom }]}>

            {/* İsim + Soy İsim */}
            <View style={[s.row, s.field]}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>İsim</Text>
                <TextInput
                  style={[s.input, !!errs.firstName && s.inputError]}
                  placeholder="Adınız"
                  placeholderTextColor="#CCC"
                  value={firstName}
                  onChangeText={(t) => { setFirstName(t); clearErr("firstName"); }}
                />
                {!!errs.firstName && <Text style={s.err}>{errs.firstName}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Soy İsim</Text>
                <TextInput
                  style={[s.input, !!errs.lastName && s.inputError]}
                  placeholder="Soyadınız"
                  placeholderTextColor="#CCC"
                  value={lastName}
                  onChangeText={(t) => { setLastName(t); clearErr("lastName"); }}
                />
                {!!errs.lastName && <Text style={s.err}>{errs.lastName}</Text>}
              </View>
            </View>

            {/* Telefon */}
            <View style={s.field}>
              <Text style={s.label}>Telefon Numarası</Text>
              <View style={[s.row, { alignItems: "stretch" }]}>
                <View style={s.phonePrefix}>
                  <Text style={s.phoneFlag}>🇹🇷</Text>
                  <Text style={s.phoneDial}>+90</Text>
                </View>
                <TextInput
                  style={[s.input, { flex: 1 }, !!errs.phone && s.inputError]}
                  placeholder="5XX XXX XX XX"
                  placeholderTextColor="#CCC"
                  value={phoneNumber}
                  onChangeText={(t) => { setPhoneNumber(formatPhoneInput(t)); clearErr("phone"); }}
                  keyboardType="number-pad"
                  maxLength={13}
                />
              </View>
              {!!errs.phone && <Text style={s.err}>{errs.phone}</Text>}
            </View>

            {/* E-mail */}
            <View style={s.field}>
              <Text style={s.label}>E-mail</Text>
              <TextInput
                style={[s.input, !!errs.email && s.inputError]}
                placeholder="ornek@eposta.com"
                placeholderTextColor="#CCC"
                value={email}
                onChangeText={(t) => { setEmail(t); clearErr("email"); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {!!errs.email && <Text style={s.err}>{errs.email}</Text>}
            </View>

            {/* Şifre */}
            <View style={s.field}>
              <Text style={s.label}>Şifre</Text>
              <View style={s.pwWrap}>
                <TextInput
                  style={[s.input, !!errs.password && s.inputError, { paddingRight: 44 }]}
                  placeholder="Güçlü bir şifre belirle"
                  placeholderTextColor="#CCC"
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearErr("password"); }}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <Tappable style={s.eyeBtn} onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  <Feather name={showPw ? "eye-off" : "eye"} size={18} color="#9CA3AF" />
                </Tappable>
              </View>
              {!!errs.password && <Text style={s.err}>{errs.password}</Text>}
              <PasswordChecklist value={password} context={{ email, firstName, lastName }} />
            </View>

            {/* Onaylar */}
            <View style={[s.field, { gap: 10, marginTop: 10, marginBottom: 22 }]}>
              {AGREEMENT_LABELS.map((label, i) => (
                <Tappable
                  key={label}
                  style={s.checkRow}
                  onPress={() => {
                    clearErr("agreed");
                    if (accepted[i]) {
                      setAccepted((prev) => prev.map((a, idx) => (idx === i ? false : a)));
                      return;
                    }
                    setAgreementIndex(i);
                    setAgreementOpen(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkbox, accepted[i] && s.checkboxActive, !!errs.agreed && s.checkboxError]}>
                    {accepted[i] && <Feather name="check" size={13} color="white" />}
                  </View>
                  <Text style={s.checkLabel}>
                    <Text style={s.checkLabelStrong}>{label}</Text> okudum, onaylıyorum.
                  </Text>
                </Tappable>
              ))}
              {!!errs.agreed && <Text style={s.err}>{errs.agreed}</Text>}
            </View>

            {!!formErr && <Text style={[s.err, s.formErr]}>{formErr}</Text>}

            {/* Kayıt Ol */}
            <Tappable haptic="medium"
              style={[s.btn, (!allAccepted || isLoading) && s.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading || !allAccepted}
              activeOpacity={0.85}
            >
              <Text style={s.btnText}>
                {isLoading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
              </Text>
            </Tappable>

            <SocialAuthButtons />

            {/* Alt link */}
            <Link href="/auth/login" asChild>
              <Tappable style={{ alignItems: "center", marginTop: Platform.OS === "android" ? -12 : 4 }}>
                <Text style={s.loginLink}>Mevcut bir hesabım var</Text>
              </Tappable>
            </Link>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <UserAgreementModal
        visible={agreementOpen}
        index={agreementIndex}
        accepted={accepted}
        onAcceptedChange={handleAgreementAccepted}
        onClose={() => setAgreementOpen(false)}
      />
    </SafeAreaView>
  );
}

const PRIMARY = "#FF5B04";
const INPUT_BG = "#FFF4EE";

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PRIMARY },

  // Header
  header: { backgroundColor: PRIMARY, paddingLeft: 28, paddingRight: 24, paddingTop: 8, paddingBottom: 28 },
  logoBlock: { height: LOGO_BLOCK, alignItems: "center", justifyContent: "flex-end", overflow: "hidden" },
  logoImg: { width: 106, height: 106, marginBottom: 12 },
  welcomeBold: { color: "white", fontSize: 24, fontWeight: "900", lineHeight: 34 },
  welcomeLight: { color: "white", fontSize: 14, fontWeight: "400", lineHeight: 19 },

  // Card
  card: {
    flexGrow: 1,
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
  field: { marginBottom: 14 },
  pwWrap: { justifyContent: "center" },
  eyeBtn: { position: "absolute", right: 12, height: "100%", justifyContent: "center", paddingHorizontal: 4 },
  inputError: { borderColor: "#DC2626" },
  checkboxError: { borderColor: "#DC2626", borderWidth: 1.5 },
  err: { color: "#DC2626", fontSize: 12, fontWeight: "500", marginLeft: 4, marginTop: 6 },
  formErr: { marginBottom: 12, marginTop: 0, textAlign: "center" },
  row: { flexDirection: "row", gap: 10 },

  // Checkbox
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 5,
    backgroundColor: INPUT_BG,
    borderWidth: 1, borderColor: "#E5E7EB",
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: PRIMARY, borderWidth: 0 },
  checkLabel: { color: "#374151", fontSize: 13, flex: 1 },
  checkLabelStrong: { fontWeight: "700", color: "#111827" },

  phonePrefix: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: "transparent",
  },
  phoneFlag: { fontSize: 18 },
  phoneDial: { fontSize: 15, fontWeight: "700", color: "#374151" },

  // Button
  btn: {
    backgroundColor: PRIMARY,
    borderRadius: 39,
    width: 306,
    height: 52,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  btnDisabled: { backgroundColor: "#F0B79A" },
  btnText: { color: "white", fontWeight: "700", fontSize: 17 },

  // Bottom link
  loginLink: {
    color: "#374151",
    fontSize: 15,
    height: 24,
    width: 192,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
  },
});
