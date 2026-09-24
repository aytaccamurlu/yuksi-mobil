// Form doğrulama yardımcıları — hata mesajı döner, geçerliyse null.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (value: string): string | null => {
  const v = value.trim();
  if (!v) return "E-posta adresi gerekli";
  if (!EMAIL_RE.test(v)) return "Geçerli bir e-posta adresi girin";
  return null;
};

export const validateRequiredPassword = (value: string): string | null =>
  value ? null : "Şifre gerekli";

// ─── Şifre kuralları ────────────────────────────────────────

const COMMON_WEAK = new Set([
  "12345678", "123456789", "1234567890", "123123123", "111111111", "000000000",
  "password", "password1", "password123", "passw0rd", "qwerty123", "qwertyui",
  "iloveyou", "admin123", "abcd1234", "abcdefgh", "asdfghjkl", "1q2w3e4r",
  "sifre123", "sifre1234", "parola123", "deneme123", "1234qwer", "qwer1234",
  "yuksi123", "yuksi1234", "test1234", "welcome1", "monkey123", "dragon123",
]);

const UPPER_RE = /[A-ZÇĞİÖŞÜ]/;
const LOWER_RE = /[a-zçğıiöşü]/;
const DIGIT_RE = /\d/;

export type PasswordContext = {
  email?: string;
  firstName?: string;
  lastName?: string;
  current?: string;
};

export type PasswordRule = { key: string; label: string; ok: boolean };

const similarityTargets = (ctx: PasswordContext): string[] =>
  [ctx.email?.split("@")[0], ctx.firstName, ctx.lastName]
    .map((t) => (t || "").trim().toLowerCase())
    .filter((t) => t.length >= 3);

export const passwordRules = (value: string, ctx: PasswordContext = {}): PasswordRule[] => {
  const v = value ?? "";
  const lower = v.toLowerCase();
  const filled = v.length > 0;
  const targets = similarityTargets(ctx);
  const tooSimilar = filled && targets.some((t) => lower.includes(t) || t.includes(lower));

  const rules: PasswordRule[] = [
    { key: "len", label: "En az 8 karakter", ok: v.length >= 8 },
    { key: "upper", label: "En az bir büyük harf", ok: UPPER_RE.test(v) },
    { key: "lower", label: "En az bir küçük harf", ok: LOWER_RE.test(v) },
    { key: "digit", label: "En az bir rakam", ok: DIGIT_RE.test(v) },
    { key: "weak", label: "Yaygın / tahmin edilebilir değil", ok: filled && !COMMON_WEAK.has(lower) },
    { key: "similar", label: "Ad veya e-postana benzemiyor", ok: filled && !tooSimilar },
  ];
  if (ctx.current) {
    rules.push({
      key: "reuse",
      label: "Mevcut şifreden farklı",
      ok: filled && v !== ctx.current,
    });
  }
  return rules;
};

const RULE_MESSAGES: Record<string, string> = {
  len: "Şifre en az 8 karakter olmalı",
  upper: "Şifre en az bir büyük harf içermeli",
  lower: "Şifre en az bir küçük harf içermeli",
  digit: "Şifre en az bir rakam içermeli",
  weak: "Bu şifre çok yaygın, daha güçlü bir şifre seç",
  similar: "Şifre adına veya e-postana çok benziyor",
  reuse: "Yeni şifre mevcut şifrenden farklı olmalı",
};

export const validatePassword = (value: string, ctx: PasswordContext = {}): string | null => {
  if (!value) return "Şifre gerekli";
  const failed = passwordRules(value, ctx).find((r) => !r.ok);
  return failed ? RULE_MESSAGES[failed.key] : null;
};

// Sadece rakamları alır; 10 hane bekler (0'sız: 5XX XXX XX XX veya +90 önekli).
export const validatePhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "");
  if (!digits) return "Telefon numarası gerekli";
  if (digits.length !== 10) return "Telefon numarası 10 haneli olmalı";
  if (!digits.startsWith("5")) return "Telefon numarası 5 ile başlamalı";
  return null;
};

export const validateName = (value: string, label = "Bu alan"): string | null => {
  const v = value.trim();
  if (!v) return `${label} gerekli`;
  if (v.length < 2) return "En az 2 karakter girin";
  return null;
};
