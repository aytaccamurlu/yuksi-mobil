// Backend hata mesajlarını İngilizce döner — kullanıcıya hep Türkçe gösterilir.

const KNOWN_ERRORS: Record<string, string> = {
  "A user with this email already exists.": "Bu e-posta adresi zaten kayıtlı.",
  "Invalid email or password.": "E-posta veya şifre hatalı.",
  "Invalid or expired verification code.": "Kod geçersiz veya süresi dolmuş.",
};

const FIELD_NAMES: Record<string, string> = {
  "first name": "Ad",
  "last name": "Soyad",
  email: "E-posta",
  password: "Şifre",
  phone: "Telefon numarası",
};

export const translateAuthError = (raw?: string | null): string | null => {
  if (!raw) return null;

  const cleaned = raw.replace(/\s*\(Parameter '[^']*'\)\s*$/i, "").trim();
  if (KNOWN_ERRORS[cleaned]) return KNOWN_ERRORS[cleaned];

  const requiredMatch = cleaned.match(/^(.+?) is required\.?$/i);
  if (requiredMatch) {
    const field = FIELD_NAMES[requiredMatch[1].toLowerCase()] || requiredMatch[1];
    return `${field} gerekli.`;
  }

  return "Bir hata oluştu, lütfen tekrar deneyin.";
};
