import PasswordChecklist from "@/components/PasswordChecklist";
import { useResetPasswordMutation, useSendForgotPasswordRequestMutation } from "@/service/auth.service";
import { translateAuthError } from "@/utils/authErrors";
import { validateEmail, validatePassword, validateRequiredPassword } from "@/utils/validation";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Tappable from '@/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Step = "request" | "reset" | "done";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("request");

  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordErr, setNewPasswordErr] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordErr, setConfirmPasswordErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [formErr, setFormErr] = useState<string | null>(null);
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null);

  const [sendReset, { isLoading: isSending }] = useSendForgotPasswordRequestMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  const scrollRef = useRef<ScrollView>(null);
  const scrollToInput = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);

  const handleSend = async () => {
    const err = validateEmail(email);
    setEmailErr(err);
    setFormErr(null);
    if (err) return;

    try {
      const response = await sendReset(email.trim()).unwrap();
      const minutes = response?.data?.expires_in_minutes ?? response?.expires_in_minutes;
      setExpiresInMinutes(typeof minutes === "number" ? minutes : null);
      setStep("reset");
    } catch (e: any) {
      setFormErr(e?.data?.message || translateAuthError(e?.data?.error) || e?.message || "Bir hata oluştu, lütfen tekrar deneyin.");
    }
  };

  const handleReset = async () => {
    const cErr = code.trim() ? null : "Doğrulama kodu gerekli";
    const nErr = validatePassword(newPassword, { email });
    const rErr = confirmPassword !== newPassword ? "Şifreler eşleşmiyor" : validateRequiredPassword(confirmPassword);
    setCodeErr(cErr);
    setNewPasswordErr(nErr);
    setConfirmPasswordErr(rErr);
    setFormErr(null);
    if (cErr || nErr || rErr) return;

    try {
      await resetPassword({ email: email.trim(), code: code.trim(), newPassword }).unwrap();
      setStep("done");
    } catch (e: any) {
      setFormErr(e?.data?.message || translateAuthError(e?.data?.error) || e?.message || "Şifre sıfırlanamadı, lütfen tekrar deneyin.");
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 + insets.bottom, backgroundColor: "#FFFFFF" }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <View style={s.header}>
            <Tappable
              style={s.backBtn}
              onPress={() => (step === "reset" ? setStep("request") : router.back())}
              hitSlop={8}
            >
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </Tappable>
            <Text style={s.title}>Şifremi Unuttum</Text>
            <Text style={s.subtitle}>
              {step === "reset"
                ? "E-postana gönderdiğimiz kodu ve yeni şifreni gir."
                : "Hesabına kayıtlı e-posta adresini gir, sana bir doğrulama kodu gönderelim."}
            </Text>
          </View>

          <View style={s.card}>
            {step === "done" ? (
              <View style={s.successBox}>
                <View style={s.successIconCircle}>
                  <Feather name="check" size={30} color={PRIMARY} />
                </View>
                <Text style={s.successTitle}>Şifren Güncellendi</Text>
                <Text style={s.successText}>Yeni şifrenle giriş yapabilirsin.</Text>

                <Tappable
                  style={s.btn}
                  onPress={() => router.replace("/auth/login")}
                  activeOpacity={0.85}
                >
                  <Text style={s.btnText}>Girişe Dön</Text>
                  <Feather name="arrow-right" size={18} color="white" style={{ marginLeft: 8 }} />
                </Tappable>
              </View>
            ) : step === "reset" ? (
              <>
                {expiresInMinutes != null && (
                  <Text style={s.hint}>Kod {expiresInMinutes} dakika geçerlidir.</Text>
                )}

                <View style={s.field}>
                  <Text style={s.label}>Doğrulama Kodu</Text>
                  <TextInput
                    style={[s.input, !!codeErr && s.inputError]}
                    placeholder="000000"
                    placeholderTextColor="#CCC"
                    value={code}
                    onChangeText={(t) => { setCode(t); if (codeErr) setCodeErr(null); if (formErr) setFormErr(null); }}
                    keyboardType="number-pad"
                  />
                  {!!codeErr && <Text style={s.err}>{codeErr}</Text>}
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Yeni Şifre</Text>
                  <View style={s.pwWrap}>
                    <TextInput
                      style={[s.input, !!newPasswordErr && s.inputError, { paddingRight: 44 }]}
                      placeholder="Güçlü bir şifre belirle"
                      placeholderTextColor="#CCC"
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); if (newPasswordErr) setNewPasswordErr(null); if (formErr) setFormErr(null); }}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                      onFocus={scrollToInput}
                    />
                    <Tappable style={s.eyeBtn} onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                      <Feather name={showPw ? "eye-off" : "eye"} size={18} color="#9CA3AF" />
                    </Tappable>
                  </View>
                  {!!newPasswordErr && <Text style={s.err}>{newPasswordErr}</Text>}
                  <PasswordChecklist value={newPassword} context={{ email }} />
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Yeni Şifre (Tekrar)</Text>
                  <TextInput
                    style={[s.input, !!confirmPasswordErr && s.inputError]}
                    placeholder="Yeni şifreni tekrar gir"
                    placeholderTextColor="#CCC"
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); if (confirmPasswordErr) setConfirmPasswordErr(null); if (formErr) setFormErr(null); }}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    onFocus={scrollToInput}
                  />
                  {!!confirmPasswordErr && <Text style={s.err}>{confirmPasswordErr}</Text>}
                </View>

                {!!formErr && <Text style={[s.err, s.formErr]}>{formErr}</Text>}

                <Tappable style={s.btn} onPress={handleReset} disabled={isResetting} activeOpacity={0.85}>
                  <Text style={s.btnText}>{isResetting ? "Güncelleniyor..." : "Şifreyi Sıfırla"}</Text>
                </Tappable>

                <Tappable style={s.retryWrap} onPress={handleSend} disabled={isSending} hitSlop={8}>
                  <Text style={s.retryText}>{isSending ? "Gönderiliyor..." : "Kodu Tekrar Gönder"}</Text>
                </Tappable>
              </>
            ) : (
              <>
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

                {!!formErr && <Text style={[s.err, s.formErr]}>{formErr}</Text>}

                <Tappable haptic="medium" style={s.btn} onPress={handleSend} disabled={isSending} activeOpacity={0.85}>
                  <Text style={s.btnText}>{isSending ? "Gönderiliyor..." : "Doğrulama Kodu Gönder"}</Text>
                </Tappable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = "#FF5B04";
const INPUT_BG = "#FFF4EE";

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PRIMARY },

  header: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  title: { color: "white", fontSize: 24, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: "white", fontSize: 14, lineHeight: 20, opacity: 0.9 },

  card: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingTop: 28,
  },

  hint: { color: "#6B7280", fontSize: 13, marginBottom: 18 },

  field: { marginBottom: 18 },
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
  inputError: { borderColor: "#DC2626" },
  err: { color: "#DC2626", fontSize: 12, fontWeight: "500", marginLeft: 4, marginTop: 6 },
  formErr: { marginTop: 0, marginBottom: 12, textAlign: "center" },

  pwWrap: { justifyContent: "center" },
  eyeBtn: { position: "absolute", right: 12, height: "100%", justifyContent: "center", paddingHorizontal: 4 },

  btn: {
    backgroundColor: PRIMARY,
    borderRadius: 39,
    height: 52,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 17 },

  successBox: { alignItems: "center", paddingTop: 12 },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: INPUT_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: { color: "#111827", fontSize: 20, fontWeight: "800", marginBottom: 10 },
  successText: { color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: 28, lineHeight: 21, paddingHorizontal: 8 },
  retryWrap: { marginTop: 18, alignItems: "center" },
  retryText: { color: PRIMARY, fontSize: 14, fontWeight: "600" },
});
